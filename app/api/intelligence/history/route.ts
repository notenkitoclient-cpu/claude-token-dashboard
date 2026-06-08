import fs from "fs"
import os from "os"
import path from "path"

export const dynamic = "force-dynamic"

const CACHE_FILE = path.join(os.homedir(), ".claude-dashboard", "assist-cache.json")

type CacheEntry = string | { hint: string; timestamp: string; projectLabel: string }

export async function GET(request: Request) {
  const project = new URL(request.url).searchParams.get("project")
  if (!project) return Response.json({ error: "missing project" }, { status: 400 })

  let cache: Record<string, CacheEntry> = {}
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as Record<string, CacheEntry>
  } catch {
    return Response.json({ entries: [] })
  }

  const entries: Array<{ hint: string; timestamp: string }> = []
  for (const value of Object.values(cache)) {
    if (typeof value === "string") continue
    if (value.projectLabel !== project) continue
    entries.push({ hint: value.hint, timestamp: value.timestamp })
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return Response.json({ entries: entries.slice(0, 10) })
}
