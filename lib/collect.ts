import fs from "fs"
import path from "path"
import os from "os"

export interface TokenStats {
  input: number
  output: number
  cacheCreate: number
  cacheRead: number
}

export interface DashboardData {
  byProject: Record<string, TokenStats>
  byDay: Record<string, TokenStats>
  byProjectClaudeMd: Record<string, number | null> // bytes, null = not found
  totalFiles: number
  totalEntries: number
  skippedDup: number
}

const BASE = path.join(os.homedir(), ".claude", "projects")

function projectLabelFromCwd(cwd: string): string {
  const home = os.homedir()
  if (cwd.startsWith(home)) {
    cwd = cwd.slice(home.length).replace(/^\//, "")
  }
  if (cwd.startsWith("works/")) cwd = cwd.slice(6)
  return cwd || "(home)"
}

function projectLabelFromDir(dirName: string): string {
  const parts = dirName.replace(/^-/, "").split("-")
  const idx = parts.indexOf("watanabehiroya")
  const remainder = idx >= 0 ? parts.slice(idx + 1) : parts
  const trimmed =
    remainder.length > 0 && (remainder[0] === "works" || remainder[0] === "Library")
      ? remainder.slice(1)
      : remainder
  return trimmed.length > 0 ? trimmed.join("/") : dirName
}

function emptyStats(): TokenStats {
  return { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }
}

function addStats(target: TokenStats, input: number, output: number, cacheCreate: number, cacheRead: number) {
  target.input += input
  target.output += output
  target.cacheCreate += cacheCreate
  target.cacheRead += cacheRead
}

function claudeMdBytes(cwd: string): number | null {
  // Walk up from cwd to find CLAUDE.md, stopping at home directory
  const home = os.homedir()
  let dir = cwd
  while (dir.startsWith(home) && dir !== home) {
    try {
      const stat = fs.statSync(path.join(dir, "CLAUDE.md"))
      if (stat.isFile()) return stat.size
    } catch { /* not found at this level */ }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export function collect(): DashboardData {
  const byProject: Record<string, TokenStats> = {}
  const byDay: Record<string, TokenStats> = {}
  const cwdByLabel: Record<string, string> = {}  // label → first seen cwd
  const seenMessageIds = new Set<string>()
  let totalFiles = 0
  let totalEntries = 0
  let skippedDup = 0

  if (!fs.existsSync(BASE)) {
    return { byProject, byDay, byProjectClaudeMd: {}, totalFiles, totalEntries, skippedDup }
  }

  const projectDirs = fs.readdirSync(BASE).sort()

  for (const dirName of projectDirs) {
    const projectDir = path.join(BASE, dirName)
    if (!fs.statSync(projectDir).isDirectory()) continue

    const fallbackLabel = projectLabelFromDir(dirName)

    const jsonlFiles = fs
      .readdirSync(projectDir)
      .filter((f) => f.endsWith(".jsonl"))

    for (const file of jsonlFiles) {
      totalFiles++
      const content = fs.readFileSync(path.join(projectDir, file), "utf-8")
      const lines = content.split("\n")

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let d: Record<string, unknown>
        try {
          d = JSON.parse(trimmed)
        } catch {
          continue
        }

        const message = d.message as Record<string, unknown> | undefined
        const usage = message?.usage as Record<string, number> | undefined
        if (!usage) continue

        const msgId = (message?.id as string) || ""
        if (msgId && seenMessageIds.has(msgId)) {
          skippedDup++
          continue
        }
        if (msgId) seenMessageIds.add(msgId)

        const cwd = (d.cwd as string) || ""
        const label = cwd ? projectLabelFromCwd(cwd) : fallbackLabel
        if (cwd && !cwdByLabel[label]) cwdByLabel[label] = cwd

        const ts = (d.timestamp as string) || ""
        let date = "unknown"
        const datePart = ts.slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) date = datePart

        const input = (usage.input_tokens || 0)
        const output = (usage.output_tokens || 0)
        const cacheCreate = (usage.cache_creation_input_tokens || 0)
        const cacheRead = (usage.cache_read_input_tokens || 0)

        if (!byProject[label]) byProject[label] = emptyStats()
        if (!byDay[date]) byDay[date] = emptyStats()
        addStats(byProject[label], input, output, cacheCreate, cacheRead)
        addStats(byDay[date], input, output, cacheCreate, cacheRead)
        totalEntries++
      }
    }
  }

  // Resolve CLAUDE.md sizes after all entries are processed
  const byProjectClaudeMd: Record<string, number | null> = {}
  for (const label of Object.keys(byProject)) {
    const cwd = cwdByLabel[label]
    byProjectClaudeMd[label] = cwd ? claudeMdBytes(cwd) : null
  }

  return { byProject, byDay, byProjectClaudeMd, totalFiles, totalEntries, skippedDup }
}
