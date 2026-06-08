import { buildMemory } from "@/lib/intelligence/memory"
import { computeSchedule } from "@/lib/intelligence/scheduler"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"

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
  const memory = buildMemory()
  const schedule = computeSchedule()

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
            {schedule.nextProject}
          </p>
          {memory.projects[schedule.nextProject]?.lastUserMessage && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {memory.projects[schedule.nextProject].lastUserMessage}
            </p>
          )}
        </div>
      )}

      {/* Project list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Projects · {sorted.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {sorted.map(([label, proj]) => {
              const status = getStatus(proj.waitingForInput, proj.stagnationHours)
              const isNext = label === schedule.nextProject
              const memProj = memory.projects[label]

              return (
                <div
                  key={label}
                  className={`flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                    isNext ? "bg-amber-500/5" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Left: label + status + last message */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isNext && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                          NEXT
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        {label}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    {memProj?.lastUserMessage && (
                      <p className="text-xs text-muted-foreground line-clamp-1 pl-0.5">
                        {memProj.lastUserMessage}
                      </p>
                    )}
                  </div>

                  {/* Right: metrics */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Score</span>
                      <ScoreBar score={proj.score} />
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Stagnation</span>
                      <span className="text-xs tabular-nums text-foreground">
                        {proj.stagnationHours < 24
                          ? `${proj.stagnationHours}h`
                          : `${Math.round(proj.stagnationHours / 24)}d`}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Tasks</span>
                      <span className="text-xs tabular-nums text-foreground">
                        {proj.incompleteTasks}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Err rate</span>
                      <span className="text-xs tabular-nums text-foreground">
                        {proj.errorRate > 0
                          ? `${Math.round(proj.errorRate * 100)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {sorted.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No project data found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
