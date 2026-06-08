import fs from "fs"
import path from "path"
import os from "os"
import { collect } from "../collect"

export interface ProjectMemory {
  lastUserMessage: string | null
  lastToolUse: string | null
  lastUpdatedAt: string | null
  cwd: string | null
}

export interface MemoryData {
  projects: Record<string, ProjectMemory>
  generatedAt: string
}

const BASE = path.join(os.homedir(), ".claude", "projects")
const CACHE_DIR = path.join(os.homedir(), ".claude-dashboard")
const CACHE_FILE = path.join(CACHE_DIR, "memory.json")

// Mirror collect.ts private label helpers (not exported there)
function labelFromCwd(cwd: string): string {
  const home = os.homedir()
  if (cwd.startsWith(home)) cwd = cwd.slice(home.length).replace(/^\//, "")
  if (cwd.startsWith("works/")) cwd = cwd.slice(6)
  return cwd || "(home)"
}

function labelFromDir(dirName: string): string {
  const parts = dirName.replace(/^-/, "").split("-")
  const idx = parts.indexOf("watanabehiroya")
  const remainder = idx >= 0 ? parts.slice(idx + 1) : parts
  const trimmed =
    remainder.length > 0 && (remainder[0] === "works" || remainder[0] === "Library")
      ? remainder.slice(1)
      : remainder
  return trimmed.length > 0 ? trimmed.join("/") : dirName
}

function textFromContent(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null
  if (Array.isArray(content)) {
    for (const part of content) {
      if (typeof part === "object" && part !== null) {
        const p = part as Record<string, unknown>
        if (p.type === "text" && typeof p.text === "string") {
          const t = p.text.trim()
          if (t) return t
        }
      }
    }
  }
  return null
}

function lastToolName(content: unknown): string | null {
  if (!Array.isArray(content)) return null
  let last: string | null = null
  for (const part of content) {
    if (typeof part === "object" && part !== null) {
      const p = part as Record<string, unknown>
      if (p.type === "tool_use" && typeof p.name === "string") last = p.name
    }
  }
  return last
}

type Acc = {
  lastUserMessage: string | null
  lastUserMessageAt: string
  lastToolUse: string | null
  lastToolUseAt: string
  lastUpdatedAt: string
  cwd: string | null
}

export function buildMemory(): MemoryData {
  // Use collect() to get the known project set
  const { byProject } = collect()
  const acc: Record<string, Acc> = {}

  for (const label of Object.keys(byProject)) {
    acc[label] = { lastUserMessage: null, lastUserMessageAt: "", lastToolUse: null, lastToolUseAt: "", lastUpdatedAt: "", cwd: null }
  }

  if (!fs.existsSync(BASE)) {
    return { projects: {}, generatedAt: new Date().toISOString() }
  }

  for (const dirName of fs.readdirSync(BASE).sort()) {
    const projectDir = path.join(BASE, dirName)
    if (!fs.statSync(projectDir).isDirectory()) continue
    const fallbackLabel = labelFromDir(dirName)

    for (const file of fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"))) {
      const raw = fs.readFileSync(path.join(projectDir, file), "utf-8")
      for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed) continue

        let d: Record<string, unknown>
        try {
          d = JSON.parse(trimmed)
        } catch {
          continue
        }

        const cwd = (d.cwd as string) || ""
        const ts = (d.timestamp as string) || ""
        const label = cwd ? labelFromCwd(cwd) : fallbackLabel

        if (!acc[label]) {
          acc[label] = { lastUserMessage: null, lastUserMessageAt: "", lastToolUse: null, lastToolUseAt: "", lastUpdatedAt: "", cwd: null }
        }
        const entry = acc[label]
        if (!entry.cwd && cwd) entry.cwd = cwd

        if (ts && (!entry.lastUpdatedAt || ts > entry.lastUpdatedAt)) entry.lastUpdatedAt = ts

        const message = d.message as Record<string, unknown> | undefined
        if (!message) continue
        const role = message.role as string | undefined
        const content = message.content

        if (role === "user") {
          const text = textFromContent(content)
          if (text && ts > entry.lastUserMessageAt) {
            entry.lastUserMessage = text
            entry.lastUserMessageAt = ts
          }
        } else if (role === "assistant") {
          const toolName = lastToolName(content)
          if (toolName && ts > entry.lastToolUseAt) {
            entry.lastToolUse = toolName
            entry.lastToolUseAt = ts
          }
        }
      }
    }
  }

  const projects: Record<string, ProjectMemory> = {}
  for (const [label, data] of Object.entries(acc)) {
    projects[label] = {
      lastUserMessage: data.lastUserMessage,
      lastToolUse: data.lastToolUse,
      lastUpdatedAt: data.lastUpdatedAt || null,
      cwd: data.cwd,
    }
  }

  const result: MemoryData = { projects, generatedAt: new Date().toISOString() }

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2), "utf-8")

  return result
}

export function loadMemory(): MemoryData | null {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as MemoryData
  } catch {
    return null
  }
}
