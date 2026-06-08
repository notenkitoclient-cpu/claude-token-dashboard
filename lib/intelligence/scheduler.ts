import fs from "fs"
import path from "path"
import os from "os"
import { loadMemory, buildMemory } from "./memory"
import { computeScores } from "./scorer"

export interface ProjectStatus {
  waitingForInput: boolean
  lastSessionId: string | null
  score: number
  stagnationHours: number
  incompleteTasks: number
  errorRate: number
  lastUpdatedAt: string | null
}

export interface SchedulerData {
  nextProject: string | null
  projects: Record<string, ProjectStatus>
  generatedAt: string
}

const BASE = path.join(os.homedir(), ".claude", "projects")

// Mirror label helpers (private in collect.ts / memory.ts / scorer.ts)
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

interface SessionTail {
  sessionId: string
  lastTs: string
  lastRole: string // "user" | "assistant"
}

// Per project: find the latest session and its last message role.
// A project is "waiting for input" when the last message in its newest session
// is from the assistant — Claude has responded and is now idle.
function detectWaitingState(knownLabels: Set<string>): Record<string, SessionTail | null> {
  // label → { sessionId, lastTs, lastRole } of the most-recently-updated session
  const latestSession: Record<string, SessionTail> = {}

  if (!fs.existsSync(BASE)) return {}

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
        const sessionId = (d.sessionId as string) || ""
        const label = cwd ? labelFromCwd(cwd) : fallbackLabel

        const message = d.message as Record<string, unknown> | undefined
        const role = (message?.role as string) || ""
        if (!ts || !sessionId || !role) continue

        const cur = latestSession[label]
        // Update if this entry is newer than any previously seen entry for this label
        if (!cur || ts > cur.lastTs) {
          latestSession[label] = { sessionId, lastTs: ts, lastRole: role }
        }
      }
    }
  }

  const result: Record<string, SessionTail | null> = {}
  for (const label of knownLabels) {
    result[label] = latestSession[label] ?? null
  }
  return result
}

export function computeSchedule(): SchedulerData {
  // Refresh memory from disk (use cached if available, else build fresh)
  const memory = loadMemory() ?? buildMemory()
  const scoreData = computeScores()

  const knownLabels = new Set(Object.keys(scoreData.scores))
  const waitingState = detectWaitingState(knownLabels)

  const projects: Record<string, ProjectStatus> = {}

  for (const label of knownLabels) {
    const sc = scoreData.scores[label]
    const tail = waitingState[label]
    const memProj = memory.projects[label]

    projects[label] = {
      waitingForInput: tail?.lastRole === "assistant",
      lastSessionId: tail?.sessionId ?? null,
      score: sc.score,
      stagnationHours: sc.stagnationHours,
      incompleteTasks: sc.incompleteTasks,
      errorRate: sc.errorRate,
      lastUpdatedAt: memProj?.lastUpdatedAt ?? null,
    }
  }

  // Next project: waiting + highest score. Fallback to highest score overall.
  const waiting = Object.entries(projects)
    .filter(([, p]) => p.waitingForInput)
    .sort(([, a], [, b]) => b.score - a.score)

  const nextProject = waiting.length > 0
    ? waiting[0][0]
    : Object.entries(projects).sort(([, a], [, b]) => b.score - a.score)[0]?.[0] ?? null

  return { nextProject, projects, generatedAt: new Date().toISOString() }
}
