import { buildMemory, loadMemory } from "@/lib/intelligence/memory"
import { computeSchedule, loadSchedule } from "@/lib/intelligence/scheduler"
import { Badge } from "@/components/ui/badge"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"
import HintButton from "./HintButton"
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

type Status = "waiting" | "processing" | "idle"

function getStatus(waitingForInput: boolean, stagnationHours: number): Status {
  if (waitingForInput) return "waiting"
  if (stagnationHours < 1) return "processing"
  return "idle"
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "waiting") {
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border">
        Waiting
      </Badge>
    )
  }
  if (status === "processing") {
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">
        Processing
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Idle
    </Badge>
  )
}

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

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 60 ? "bg-red-500" : score >= 30 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-6">{score}</span>
    </div>
  )
}

export default function IntelligencePage() {
  const schedule = loadSchedule() ?? computeSchedule()
  const memory = loadMemory() ?? buildMemory()
  const assistCache = loadAssistCache()

  const sorted = Object.entries(schedule.projects).sort(
    ([, a], [, b]) => b.score - a.score
  )

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

      {/* Project grid */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-foreground">Projects · {sorted.length}</p>

        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No project data found.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(([label, proj]) => {
            const status = getStatus(proj.waitingForInput, proj.stagnationHours)
            const isNext = label === schedule.nextProject
            const memProj = memory.projects[label]

            const cachedHint = memProj?.lastUserMessage
              ? assistCache[assistKey(label, memProj.lastUserMessage)]
              : undefined

            return (
              <div
                key={label}
                className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
                  isNext
                    ? "border-primary bg-primary/5"
                    : status === "waiting"
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                {/* Header: name + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    {isNext && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/30 self-start">
                        NEXT
                      </span>
                    )}
                    <span className="text-sm font-bold text-foreground truncate">
                      {displayLabel(label)}
                    </span>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* 2×2 metrics grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Score</span>
                    <ScoreBar score={proj.score} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Stagnation</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {proj.stagnationHours < 24
                        ? `${proj.stagnationHours}h`
                        : `${Math.round(proj.stagnationHours / 24)}d`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Tasks</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {proj.incompleteTasks}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-muted-foreground">Err rate</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {proj.errorRate > 0
                        ? `${Math.round(proj.errorRate * 100)}%`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Last message */}
                {memProj?.lastUserMessage && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {displayMessage(memProj.lastUserMessage)}
                  </p>
                )}

                {/* Hint button */}
                {memProj?.lastUserMessage && (
                  <HintButton
                    projectLabel={label}
                    lastMessage={memProj.lastUserMessage}
                    stagnationHours={proj.stagnationHours}
                    incompleteTasks={proj.incompleteTasks}
                    errorRate={proj.errorRate}
                    initialHint={cachedHint}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

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
