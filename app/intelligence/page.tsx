import { buildMemory, loadMemory } from "@/lib/intelligence/memory"
import { computeSchedule, loadSchedule } from "@/lib/intelligence/scheduler"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"
import ProjectGrid, { type ProjectCardData } from "./ProjectGrid"
import NotificationWatcher from "./NotificationWatcher"
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"

const ASSIST_CACHE_FILE = path.join(os.homedir(), ".claude-dashboard", "assist-cache.json")

function loadAssistCache(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(ASSIST_CACHE_FILE, "utf-8")) as Record<string, string>
  } catch {
    return {}
  }
}

function assistKey(projectLabel: string, lastMessage: string): string {
  return crypto.createHash("sha256").update(projectLabel + lastMessage.slice(0, 50)).digest("hex")
}

export const dynamic = "force-dynamic"

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi

function displayLabel(label: string): string {
  const masked = label.replace(EMAIL_RE, "[email]")
  const parts = masked.split("/")
  return parts.slice(-2).join("/")
}

function displayMessage(text: string): string {
  const masked = text.replace(EMAIL_RE, "[email]")
  return masked.length > 60 ? masked.slice(0, 60) + "…" : masked
}

function findClaudeMd(cwd: string | null | undefined): boolean {
  if (!cwd) return false
  const home = os.homedir()
  const homePrefix = home + path.sep
  let dir = cwd
  while (dir.startsWith(home) && dir !== home) {
    const resolved = path.resolve(dir)
    if (!resolved.startsWith(homePrefix)) break
    try {
      if (fs.statSync(path.join(resolved, "CLAUDE.md")).isFile()) return true
    } catch { /* not at this level */ }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return false
}

function getStatus(waitingForInput: boolean, stagnationHours: number): ProjectCardData["status"] {
  if (waitingForInput) return "waiting"
  if (stagnationHours < 1) return "processing"
  return "idle"
}

export default function IntelligencePage() {
  const schedule = loadSchedule() ?? computeSchedule()
  const memory = loadMemory() ?? buildMemory()
  const assistCache = loadAssistCache()

  const cards: ProjectCardData[] = Object.entries(schedule.projects)
    .map(([label, proj]) => {
      const memProj = memory.projects[label]
      const lastUserMessage = memProj?.lastUserMessage ?? null
      return {
        label,
        displayName: displayLabel(label),
        status: getStatus(proj.waitingForInput, proj.stagnationHours),
        isNext: label === schedule.nextProject,
        score: proj.score,
        stagnationHours: proj.stagnationHours,
        stagnationDisplay:
          proj.stagnationHours < 24
            ? `${proj.stagnationHours}h`
            : `${Math.round(proj.stagnationHours / 24)}d`,
        incompleteTasks: proj.incompleteTasks,
        errorRate: proj.errorRate,
        errorRateDisplay: proj.errorRate > 0 ? `${Math.round(proj.errorRate * 100)}%` : "—",
        lastUpdatedAt: proj.lastUpdatedAt,
        lastUserMessage,
        lastMessageDisplay: lastUserMessage ? displayMessage(lastUserMessage) : null,
        cachedHint: lastUserMessage ? assistCache[assistKey(label, lastUserMessage)] : undefined,
        hasClaudeMd: findClaudeMd(memProj?.cwd),
      }
    })
    .sort((a, b) => b.score - a.score)

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Project activity · scored by cognitive load
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsModal />
          <RefreshButton />
        </div>
      </div>

      {/* Next project highlight */}
      {schedule.nextProject && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 space-y-1">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
            Next up
          </p>
          <p className="text-base font-semibold text-foreground">
            {displayLabel(schedule.nextProject)}
          </p>
          {memory.projects[schedule.nextProject]?.lastUserMessage && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {displayMessage(memory.projects[schedule.nextProject].lastUserMessage!)}
            </p>
          )}
        </div>
      )}

      {/* Notification watcher (client — polls for waiting projects) */}
      <NotificationWatcher
        initialWaiting={cards.filter((c) => c.status === "waiting").map((c) => c.label)}
        labelToDisplay={Object.fromEntries(cards.map((c) => [c.label, c.displayName]))}
      />

      {/* Project grid (client — handles filter + sort) */}
      <ProjectGrid cards={cards} />

      <p className="text-xs text-muted-foreground text-right">
        Generated {new Date(schedule.generatedAt).toLocaleString("en-US", {
          timeZone: "Asia/Tokyo",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })} JST
      </p>
    </main>
  )
}
