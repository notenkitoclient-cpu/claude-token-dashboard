import fs from "fs"
import path from "path"
import os from "os"
import { loadMemory } from "./memory"
import { collect } from "../collect"

export interface ProjectScore {
  stagnationHours: number
  errorRate: number      // 0–1, ratio of failed tool results
  incompleteTasks: number
  score: number          // 0–100, higher = needs more attention
}

export interface ScoreData {
  scores: Record<string, ProjectScore>
  generatedAt: string
}

const BASE = path.join(os.homedir(), ".claude", "projects")

// Mirror collect.ts / memory.ts private label helpers
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

interface RawMetrics {
  totalToolResults: number
  errorToolResults: number
  // last TodoWrite input per project (newest-wins by timestamp)
  lastTodoAt: string
  lastTodoPending: number
}

function emptyRaw(): RawMetrics {
  return { totalToolResults: 0, errorToolResults: 0, lastTodoAt: "", lastTodoPending: 0 }
}

function countPendingTodos(input: unknown): number {
  if (typeof input !== "object" || input === null) return 0
  const inp = input as Record<string, unknown>
  const todos = inp.todos
  if (!Array.isArray(todos)) return 0
  return todos.filter((t) => {
    if (typeof t !== "object" || t === null) return false
    const status = (t as Record<string, unknown>).status as string | undefined
    return status === "pending" || status === "in_progress"
  }).length
}

function scanMetrics(knownLabels: Set<string>): Record<string, RawMetrics> {
  const acc: Record<string, RawMetrics> = {}
  for (const label of knownLabels) acc[label] = emptyRaw()

  if (!fs.existsSync(BASE)) return acc

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

        if (!acc[label]) acc[label] = emptyRaw()
        const entry = acc[label]

        const message = d.message as Record<string, unknown> | undefined
        if (!message) continue
        const role = message.role as string | undefined
        const content = message.content

        if (role === "user" && Array.isArray(content)) {
          // Count tool_result entries for error rate
          for (const part of content) {
            if (typeof part !== "object" || part === null) continue
            const p = part as Record<string, unknown>
            if (p.type !== "tool_result") continue
            entry.totalToolResults++
            if (p.is_error === true) entry.errorToolResults++
          }
        } else if (role === "assistant" && Array.isArray(content)) {
          // Track last TodoWrite call
          for (const part of content) {
            if (typeof part !== "object" || part === null) continue
            const p = part as Record<string, unknown>
            if (p.type !== "tool_use" || p.name !== "TodoWrite") continue
            if (ts > entry.lastTodoAt) {
              entry.lastTodoAt = ts
              entry.lastTodoPending = countPendingTodos(p.input)
            }
          }
        }
      }
    }
  }

  return acc
}

function stagnationScore(hours: number): number {
  // 0h→0, 24h→10, 168h(1w)→25, 720h(1mo)→40
  return Math.min(40, (hours / 720) * 40)
}

function errorScore(rate: number): number {
  return Math.round(rate * 30)
}

function taskScore(count: number): number {
  return Math.min(30, count * 3)
}

export function computeScores(): ScoreData {
  const memory = loadMemory()
  const { byProject } = collect()
  const knownLabels = new Set(Object.keys(byProject))

  const rawMetrics = scanMetrics(knownLabels)

  const now = Date.now()
  const scores: Record<string, ProjectScore> = {}

  for (const label of knownLabels) {
    const proj = memory?.projects[label]
    const raw = rawMetrics[label] ?? emptyRaw()

    // Stagnation
    let stagnationHours = 0
    if (proj?.lastUpdatedAt) {
      const ms = now - new Date(proj.lastUpdatedAt).getTime()
      stagnationHours = Math.max(0, ms / 3_600_000)
    }

    // Error rate
    const errorRate =
      raw.totalToolResults > 0 ? raw.errorToolResults / raw.totalToolResults : 0

    // Incomplete tasks
    const incompleteTasks = raw.lastTodoPending

    const score = Math.round(
      stagnationScore(stagnationHours) +
        errorScore(errorRate) +
        taskScore(incompleteTasks)
    )

    scores[label] = { stagnationHours: Math.round(stagnationHours), errorRate, incompleteTasks, score }
  }

  return { scores, generatedAt: new Date().toISOString() }
}
