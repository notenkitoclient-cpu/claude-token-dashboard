"use client"

import { useCallback, useEffect, useState } from "react"
import { fmtCost } from "@/lib/pricing"

interface TodayData {
  cost: number
  tokens: number
  actions: number
  activeProjects: number
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function TodaySummary() {
  const [data, setData] = useState<TodayData | null>(null)

  const refresh = useCallback(() => {
    fetch("/api/today")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  const cards = data ? [
    { label: "Today's Cost",     value: fmtCost(data.cost),                    sub: "since 00:00 UTC" },
    { label: "Today's Tokens",   value: fmtNum(data.tokens),                   sub: "input + output"  },
    { label: "Today's Actions",  value: data.actions.toLocaleString(),          sub: "via hooks"       },
    { label: "Active Projects",  value: data.activeProjects.toLocaleString(),   sub: "with sessions"   },
  ] : Array(4).fill(null)

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Today&apos;s Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl border border-border bg-muted/10 px-4 py-3">
            {c ? (
              <>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold font-mono tracking-tight">{c.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">{c.sub}</p>
              </>
            ) : (
              <>
                <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                <div className="mt-2 h-7 w-16 rounded bg-muted/40 animate-pulse" />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
