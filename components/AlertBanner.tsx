"use client"

import { useCallback, useEffect, useState } from "react"

interface AlertRow {
  id: number
  session_id: string
  timestamp: string
  tool_name: string
  tool_input: string
  project: string
}

function inputPreview(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    const first = Object.values(obj)[0]
    const str = typeof first === "string" ? first : JSON.stringify(first ?? "")
    return str.length > 120 ? str.slice(0, 120) + "…" : str
  } catch {
    return ""
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function AlertBanner() {
  const [alerts, setAlerts]   = useState<AlertRow[]>([])
  const [expanded, setExpanded] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts")
      if (res.ok) setAlerts(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])
  useEffect(() => {
    const id = setInterval(fetchAlerts, 5000)
    return () => clearInterval(id)
  }, [fetchAlerts])

  async function dismiss(id: number) {
    await fetch(`/api/alerts?id=${id}`, { method: "PATCH" })
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  async function dismissAll() {
    await fetch("/api/alerts?all=1", { method: "PATCH" })
    setAlerts([])
    setExpanded(false)
  }

  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-950/20 overflow-hidden">
      {/* Collapsed banner */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-950/30 transition-colors"
      >
        <span className="text-red-400 text-base leading-none">⚠</span>
        <span className="flex-1 text-sm font-semibold text-red-400">
          {alerts.length} high-risk alert{alerts.length > 1 ? "s" : ""} detected before execution
        </span>
        <span className="text-xs text-red-400/60 shrink-0">
          {expanded ? "▲ collapse" : "▼ review"}
        </span>
      </button>

      {/* Expanded alert list */}
      {expanded && (
        <div className="border-t border-red-500/20">
          <div className="flex items-center justify-between px-4 py-2 border-b border-red-500/10">
            <span className="text-xs text-red-400/50">PreToolUse detections — execution was not blocked</span>
            <button
              onClick={dismissAll}
              className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
            >
              Dismiss all
            </button>
          </div>
          {alerts.map(alert => (
            <div key={alert.id} className="flex items-start gap-3 px-4 py-3 border-b border-red-500/10 last:border-0 hover:bg-red-950/10 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono font-medium text-red-300">{alert.tool_name}</span>
                  <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">
                    high
                  </span>
                  {alert.project && (
                    <span className="text-xs text-red-400/40 font-mono truncate max-w-[180px]">{alert.project}</span>
                  )}
                  <span className="ml-auto text-xs text-red-400/30 shrink-0">{timeAgo(alert.timestamp)}</span>
                </div>
                {inputPreview(alert.tool_input) && (
                  <p className="mt-1 text-xs font-mono text-red-400/50 truncate">{inputPreview(alert.tool_input)}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="shrink-0 text-xs text-red-400/40 hover:text-red-400 transition-colors px-2 py-0.5 rounded border border-red-500/20 hover:border-red-500/50"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
