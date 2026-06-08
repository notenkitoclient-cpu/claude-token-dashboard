"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import HintButton from "./HintButton"
import ClaudeMdModal from "@/components/ClaudeMdModal"

export type Status = "waiting" | "processing" | "idle"
type FilterValue = "all" | "waiting" | "idle"
type SortValue = "score" | "updated" | "stagnation"

export interface ProjectCardData {
  label: string
  displayName: string
  status: Status
  isNext: boolean
  score: number
  stagnationHours: number
  stagnationDisplay: string
  incompleteTasks: number
  errorRate: number
  errorRateDisplay: string
  lastUpdatedAt: string | null
  lastUserMessage: string | null
  lastMessageDisplay: string | null
  cachedHint?: string
  hasClaudeMd: boolean
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
  const color = score >= 60 ? "bg-red-500" : score >= 30 ? "bg-amber-500" : "bg-emerald-500"
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

export default function ProjectGrid({ cards }: { cards: ProjectCardData[] }) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [sort, setSort] = useState<SortValue>("score")
  const [claudeMdProject, setClaudeMdProject] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = cards
    if (filter === "waiting") result = result.filter((c) => c.status === "waiting")
    if (filter === "idle") result = result.filter((c) => c.status === "idle")

    return [...result].sort((a, b) => {
      if (sort === "score") return b.score - a.score
      if (sort === "stagnation") return b.stagnationHours - a.stagnationHours
      // updated: newest first
      const ta = a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0
      const tb = b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0
      return tb - ta
    })
  }, [cards, filter, sort])

  return (
    <div className="space-y-4">
      {claudeMdProject && (
        <ClaudeMdModal project={claudeMdProject} onClose={() => setClaudeMdProject(null)} />
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-foreground">Projects · {cards.length}</p>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "waiting", "idle"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`px-3 py-1.5 transition-colors capitalize ${
                  filter === v ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
                }`}
              >
                {v === "all" ? "All" : v === "waiting" ? "Waiting" : "Idle"}
              </button>
            ))}
          </div>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="score">Score順</option>
          <option value="updated">更新日順</option>
          <option value="stagnation">Stagnation順</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No project data found.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 flex flex-col gap-3 transition-colors ${
              card.isNext
                ? "border-primary bg-primary/5"
                : card.status === "waiting"
                ? "border-amber-500/50 bg-amber-500/5"
                : "border-border hover:bg-muted/30"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                {card.isNext && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/30 self-start">
                    NEXT
                  </span>
                )}
                <span className="text-sm font-bold text-foreground truncate">
                  {card.displayName}
                </span>
              </div>
              <StatusBadge status={card.status} />
            </div>

            {/* 2×2 metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Score</span>
                <ScoreBar score={card.score} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Stagnation</span>
                <span className="text-xs tabular-nums text-foreground">{card.stagnationDisplay}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Tasks</span>
                <span className="text-xs tabular-nums text-foreground">{card.incompleteTasks}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Err rate</span>
                <span className="text-xs tabular-nums text-foreground">{card.errorRateDisplay}</span>
              </div>
            </div>

            {/* Last message */}
            {card.lastMessageDisplay && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {card.lastMessageDisplay}
              </p>
            )}

            {/* Hint button */}
            {card.lastUserMessage && (
              <HintButton
                projectLabel={card.label}
                lastMessage={card.lastUserMessage}
                stagnationHours={card.stagnationHours}
                incompleteTasks={card.incompleteTasks}
                errorRate={card.errorRate}
                initialHint={card.cachedHint}
              />
            )}

            {/* CLAUDE.md button */}
            {card.hasClaudeMd && (
              <button
                onClick={() => setClaudeMdProject(card.label)}
                className="mt-auto self-start text-xs rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                CLAUDE.md
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
