import { collect } from "@/lib/collect"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"

function findClaudeMdPath(cwd: string): string | null {
  const home = os.homedir()
  const homePrefix = home + path.sep
  let dir = cwd
  while (dir.startsWith(home) && dir !== home) {
    // Validated: resolved against homePrefix (home + path.sep) before use
    const resolved = path.resolve(dir) // nosemgrep
    if (!resolved.startsWith(homePrefix)) break
    const candidate = path.join(resolved, "CLAUDE.md") // nosemgrep
    try {
      if (fs.statSync(candidate).isFile()) return candidate
    } catch { /* not at this level */ }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function resolveFilePath(project: string): { filePath: string } | { error: string; status: number } {
  const { byProjectCwd } = collect()
  const cwd = byProjectCwd[project]
  if (!cwd) return { error: "project not found", status: 404 }

  const filePath = findClaudeMdPath(cwd)
  if (!filePath) return { error: "CLAUDE.md not found for this project", status: 404 }

  // Security: must be strictly within home directory (path.sep prevents prefix collisions)
  if (!filePath.startsWith(os.homedir() + path.sep)) return { error: "invalid path", status: 403 }

  return { filePath }
}

export async function GET(request: Request) {
  const project = new URL(request.url).searchParams.get("project")
  if (!project) return Response.json({ error: "missing project" }, { status: 400 })

  const resolved = resolveFilePath(project)
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: resolved.status })

  const content = fs.readFileSync(resolved.filePath, "utf-8")
  const bytes = Buffer.byteLength(content, "utf-8")
  const tokens = Math.ceil(bytes / 4)  // rough estimate

  return Response.json({ content, filePath: resolved.filePath, bytes, tokens })
}

export async function PUT(request: Request) {
  const project = new URL(request.url).searchParams.get("project")
  if (!project) return Response.json({ error: "missing project" }, { status: 400 })

  const body = await request.json() as { content?: string }
  if (typeof body.content !== "string") return Response.json({ error: "invalid content" }, { status: 400 })

  const resolved = resolveFilePath(project)
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: resolved.status })

  fs.writeFileSync(resolved.filePath, body.content, "utf-8")
  const bytes = Buffer.byteLength(body.content, "utf-8")

  return Response.json({ ok: true, bytes })
}
