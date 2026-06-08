import { buildMemory, loadMemory } from "@/lib/intelligence/memory"
import { computeSchedule, loadSchedule } from "@/lib/intelligence/scheduler"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import HintButton from "../HintButton"
import ClaudeMdButton from "../ClaudeMdButton"
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"

export const dynamic = "force-dynamic"

const ASSIST_CACHE_FILE = path.join(os.homedir(), ".claude-dashboard", "assist-cache.json")

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi

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

function displayLabel(label: string): string {
  const masked = label.replace(EMAIL_RE, "[email]")
  const parts = masked.split("/")
  return parts.slice(-2).join("/")
}

function displayMessage(text: string): string {
  const masked = text.replace(EMAIL_RE, "[email]")
  return masked.length > 120 ? masked.slice(0, 120) + "…" : masked
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 60 ? "bg-red-500" : score >= 30 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-sm tabular-nums text-foreground font-medium">{score}</span>
    </div>
  )
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ project: string[] }>
}) {
  const { project: segments } = await params
  const label = segments.map(decodeURIComponent).join("/")

  const schedule = loadSchedule() ?? computeSchedule()
  const memory = loadMemory() ?? buildMemory()
  const assistCache = loadAssistCache()

  const proj = schedule.projects[label]
  const memProj = memory.projects[label]

  if (!proj) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-8 space-y-4">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          ← Intelligence
        </Link>
        <p className="text-sm text-muted-foreground">Project not found: {label}</p>
      </main>
    )
  }

  const waitingForInput = proj.waitingForInput
  const status = waitingForInput ? "waiting" : proj.stagnationHours < 1 ? "processing" : "idle"
  const lastUserMessage = memProj?.lastUserMessage ?? null
  const cachedHint = lastUserMessage ? assistCache[assistKey(label, lastUserMessage)] : undefined
  const hasClaudeMd = findClaudeMd(memProj?.cwd)

  const stagnationDisplay =
    proj.stagnationHours < 24
      ? `${proj.stagnationHours}h`
      : `${Math.round(proj.stagnationHours / 24)}d`

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Intelligence
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{displayLabel(label)}</h1>
          {status === "waiting" && (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 border">Waiting</Badge>
          )}
          {status === "processing" && (
            <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">Processing</Badge>
          )}
          {status === "idle" && (
            <Badge variant="outline" className="text-muted-foreground">Idle</Badge>
          )}
        </div>
        {memProj?.cwd && (
          <p className="text-xs text-muted-foreground font-mono">{memProj.cwd}</p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Score</p>
          <ScoreBar score={proj.score} />
        </div>
        <div className="rounded-lg border border-border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Stagnation</p>
          <p className="text-sm font-medium tabular-nums">{stagnationDisplay}</p>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Tasks</p>
          <p className="text-sm font-medium tabular-nums">{proj.incompleteTasks}</p>
        </div>
        <div className="rounded-lg border border-border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Err rate</p>
          <p className="text-sm font-medium tabular-nums">
            {proj.errorRate > 0 ? `${Math.round(proj.errorRate * 100)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Last message + hint */}
      {lastUserMessage && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Last message</p>
          <p className="text-sm text-foreground">{displayMessage(lastUserMessage)}</p>
          <HintButton
            projectLabel={label}
            lastMessage={lastUserMessage}
            stagnationHours={proj.stagnationHours}
            incompleteTasks={proj.incompleteTasks}
            errorRate={proj.errorRate}
            initialHint={cachedHint}
          />
        </div>
      )}

      {/* CLAUDE.md */}
      {hasClaudeMd && <ClaudeMdButton project={label} />}
    </main>
  )
}
