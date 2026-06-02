"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

export default function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
    >
      <span className={isPending ? "animate-spin" : ""}>↻</span>
      {isPending ? "Refreshing…" : "Refresh"}
    </button>
  )
}
