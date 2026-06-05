"use client"

import { useEffect, useState, useCallback } from "react"
import type { ActionRow, RiskLevel } from "@/lib/actionsDb"

const TOOL_ICON: Record<string, string> = {
  Bash:      "⚡",
  Read:      "📄",
  Write:     "📝",
  Edit:      "✏️",
  WebFetch:  "🌐",
  WebSearch: "🔍",
  Agent:     "🤖",
  Task:      "📋",
}

const RISK_STYLE: Record<RiskLevel, { badge: string; row: string }> = {
  high:   { badge: "bg-red-500/20 text-red-400 border-red-500/30",    row: "border-l-red-500" },
  medium: { badge: "bg-amber-500/20 text-amber-400 border-amber-500/30", row: "border-l-amber-500" },
  low:    { badge: "bg-zinc-700/60 text-zinc-400 border-zinc-600",    row: "border-l-zinc-700" },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function inputPreview(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    const first = Object.values(obj)[0]
    const str = typeof first === "string" ? first : JSON.stringify(first ?? "")
    return str.length > 80 ? str.slice(0, 80) + "…" : str
  } catch {
    return ""
  }
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level]
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}>
      {level}
    </span>
  )
}

function CostBadge({ cost }: { cost: number }) {
  const label = cost >= 0.01 ? `$${cost.toFixed(3)}` : "<$0.001"
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
      {label}
    </span>
  )
}

function Stats({ rows }: { rows: ActionRow[] }) {
  const counts = rows.reduce(
    (acc, r) => { acc[r.risk_level] = (acc[r.risk_level] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {counts.high   && <span className="text-red-400 font-medium">{counts.high} high</span>}
      {counts.medium && <span className="text-amber-400 font-medium">{counts.medium} medium</span>}
      {counts.low    && <span className="text-zinc-400">{counts.low} low</span>}
      <span>· {rows.length} total</span>
    </div>
  )
}

export default function ActivityFeed() {
  const [rows, setRows]           = useState<ActionRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<RiskLevel | "all">("all")
  const [autoRefresh, setAuto]    = useState(true)
  const [expanded, setExpanded]   = useState<number | null>(null)

  const fetch_ = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/actions" : `/api/actions?risk=${filter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status}`)
      setRows(await res.json())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetch_() }, [fetch_])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetch_, 5000)
    return () => clearInterval(id)
  }, [fetch_, autoRefresh])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {(["all", "high", "medium", "low"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`px-3 py-1.5 transition-colors capitalize ${
                filter === v ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAuto((a) => !a)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
            autoRefresh ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground"
          }`}
        >
          {autoRefresh ? "⏵ Live" : "⏸ Paused"}
        </button>
        <button onClick={fetch_} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ↻ Refresh
        </button>
        {rows.length > 0 && <Stats rows={rows} />}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-400">
          Failed to load: {error}
          <p className="mt-1 text-xs text-muted-foreground">
            Make sure the dashboard is running and the Claude Code hook is configured.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <p className="text-2xl mb-2">⚡</p>
          <p className="font-medium">No actions recorded yet</p>
          <p className="mt-1 text-xs">Add the Claude Code hook to start collecting activity.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {rows.map((row, i) => {
            const s = RISK_STYLE[row.risk_level]
            const isOpen = expanded === row.id
            const preview = inputPreview(row.tool_input)
            return (
              <div
                key={row.id}
                className={`border-l-2 ${s.row} ${i > 0 ? "border-t border-border" : ""} hover:bg-muted/10 transition-colors`}
              >
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setExpanded(isOpen ? null : row.id)}
                >
                  <span className="text-lg leading-none mt-0.5 shrink-0" aria-hidden>
                    {TOOL_ICON[row.tool_name] ?? "🔷"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium font-mono">{row.tool_name}</span>
                      <RiskBadge level={row.risk_level} />
                      {row.token_cost != null && <CostBadge cost={row.token_cost} />}
                      {row.project && (
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]" title={row.project}>
                          {row.project}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {timeAgo(row.timestamp)}
                      </span>
                    </div>
                    {preview && (
                      <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{preview}</p>
                    )}
                  </div>
                  <span className="text-muted-foreground/50 text-xs shrink-0 mt-0.5">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 pl-11">
                    <pre className="rounded-lg bg-muted/30 p-3 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(JSON.parse(row.tool_input), null, 2)}
                    </pre>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/50 font-mono">
                      {row.timestamp} · session {row.session_id.slice(0, 8)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
