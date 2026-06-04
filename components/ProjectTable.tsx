"use client"

import { useState } from "react"
import type { TokenStats, SessionData } from "@/lib/collect"
import { calcCost, fmtCost } from "@/lib/pricing"

interface Props {
  byProject: Record<string, TokenStats>
  byProjectClaudeMd: Record<string, number | null>
  byProjectSessions: Record<string, SessionData[]>
}

const CLAUDE_MD_WARN_BYTES = 5 * 1024
const WARNING_THRESHOLD = 0.20

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtDatetime(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return iso.slice(0, 16).replace("T", " ")
  }
}

function SessionRows({ sessions }: { sessions: SessionData[] }) {
  return (
    <tr>
      <td colSpan={9} className="p-0 bg-muted/5">
        <div className="border-t border-border/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="pl-10 pr-3 py-2 text-left font-medium text-muted-foreground w-8" />
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Session ID</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Started</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Input</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Output</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cost</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Msgs</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.sessionId} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                  <td className="pl-10 pr-3 py-2 text-muted-foreground/30">└</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground" title={s.sessionId}>
                    {s.sessionId.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDatetime(s.startedAt)}</td>
                  <td className="px-3 py-2 text-right font-mono text-blue-400/80">{fmt(s.stats.input)}</td>
                  <td className="px-3 py-2 text-right font-mono text-violet-400/80">{fmt(s.stats.output)}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400/80">{fmtCost(calcCost(s.stats))}</td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{s.messageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  )
}

export default function ProjectTable({ byProject, byProjectClaudeMd, byProjectSessions }: Props) {
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  const rows = Object.entries(byProject)
    .map(([project, stats]) => ({
      project,
      ...stats,
      total: stats.input + stats.output,
      cost: calcCost(stats),
      claudeMdBytes: byProjectClaudeMd[project] ?? null,
      sessions: byProjectSessions[project] ?? [],
    }))
    .sort((a, b) => b.cost - a.cost)

  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Output</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Input</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Cache Read</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Cache Create</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden xl:table-cell">CLAUDE.md</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tokens</th>
            <th className="px-4 py-3 w-28 hidden sm:table-cell" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pct = (row.total / maxTotal) * 100
            const costShare = totalCost > 0 ? row.cost / totalCost : 0
            const isHighCost = costShare >= WARNING_THRESHOLD
            const isHeavyClaudeMd = row.claudeMdBytes !== null && row.claudeMdBytes >= CLAUDE_MD_WARN_BYTES
            const claudeMdLabel = row.claudeMdBytes === null
              ? "-"
              : `${(row.claudeMdBytes / 1024).toFixed(1)} KB`
            const isExpanded = expandedProject === row.project
            const hasSessions = row.sessions.length > 0

            return (
              <>
                <tr
                  key={row.project}
                  onClick={() => hasSessions && setExpandedProject(isExpanded ? null : row.project)}
                  className={[
                    "border-b border-border last:border-0 transition-colors",
                    hasSessions ? "cursor-pointer" : "",
                    isExpanded ? "bg-muted/30" : isHighCost ? "bg-amber-950/10 hover:bg-amber-950/20" : i === 0 ? "bg-muted/10 hover:bg-muted/20" : "hover:bg-muted/20",
                  ].join(" ")}
                >
                  <td className="px-4 py-3 font-mono text-xs max-w-[180px]">
                    <div className="flex items-center gap-1.5">
                      {hasSessions && (
                        <span className="shrink-0 text-muted-foreground/50 text-[10px] w-3">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      )}
                      {isHighCost && (
                        <span className="shrink-0 text-amber-400" title={`${(costShare * 100).toFixed(1)}% of total cost`}>⚠</span>
                      )}
                      <span className="truncate" title={row.project}>{row.project}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className={isHighCost ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                      {fmtCost(row.cost)}
                    </span>
                    {totalCost > 0 && (
                      <span className="ml-1 text-muted-foreground text-[10px]">
                        {(costShare * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{fmt(row.output)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-blue-400">{fmt(row.input)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">{fmt(row.cacheRead)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">{fmt(row.cacheCreate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs hidden xl:table-cell">
                    {isHeavyClaudeMd ? (
                      <span className="text-orange-400 font-semibold" title="CLAUDE.md may be too large (≥5 KB)">
                        ⚠ {claudeMdLabel}
                      </span>
                    ) : (
                      <span className={row.claudeMdBytes !== null ? "text-muted-foreground" : "text-muted-foreground/40"}>
                        {claudeMdLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{fmt(row.total)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isHighCost ? "bg-amber-500/70" : "bg-violet-500/70"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
                {isExpanded && <SessionRows key={`${row.project}-sessions`} sessions={row.sessions} />}
              </>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/20">
            <td className="px-4 py-2 text-xs font-medium text-muted-foreground">TOTAL</td>
            <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-emerald-400">
              {fmtCost(totalCost)}
            </td>
            <td colSpan={7} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
