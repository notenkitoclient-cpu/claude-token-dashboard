"use client"

import { useState } from "react"

interface Props {
  projectLabel: string
  lastMessage: string
  stagnationHours: number
  incompleteTasks: number
  errorRate: number
  initialHint?: string
}

export default function HintButton({
  projectLabel,
  lastMessage,
  stagnationHours,
  incompleteTasks,
  errorRate,
  initialHint,
}: Props) {
  const [hint, setHint] = useState<string | undefined>(initialHint)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function fetchHint() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/intelligence/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectLabel, lastMessage, stagnationHours, incompleteTasks, errorRate }),
      })
      const data = (await res.json()) as { hint?: string }
      if (data.hint) {
        setHint(data.hint)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (hint) {
    return (
      <p className="text-xs text-muted-foreground italic pl-0.5 mt-0.5 whitespace-pre-wrap">
        💡 {hint}
      </p>
    )
  }

  return (
    <button
      onClick={fetchHint}
      disabled={loading}
      className="text-xs text-primary/60 hover:text-primary disabled:opacity-40 pl-0.5 mt-0.5 text-left"
    >
      {loading ? "Thinking…" : error ? "Retry hint" : "💡 Get hint"}
    </button>
  )
}
