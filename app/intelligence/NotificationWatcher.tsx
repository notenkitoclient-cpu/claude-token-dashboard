"use client"

import { useEffect, useRef } from "react"

interface Props {
  initialWaiting: string[]
  labelToDisplay: Record<string, string>
}

export default function NotificationWatcher({ initialWaiting, labelToDisplay }: Props) {
  const notifiedRef = useRef<Set<string>>(new Set(initialWaiting))

  useEffect(() => {
    if (typeof Notification === "undefined") return

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {})
    }

    const poll = async () => {
      if (Notification.permission !== "granted") return

      try {
        const res = await fetch("/api/intelligence/scheduler")
        const data = (await res.json()) as { projects: Record<string, { waitingForInput: boolean }> }

        for (const [label, proj] of Object.entries(data.projects)) {
          if (!proj.waitingForInput) continue
          if (notifiedRef.current.has(label)) continue

          const name = labelToDisplay[label] ?? label
          new Notification(`${name} is waiting for your input`)
          notifiedRef.current.add(label)
        }
      } catch { /* ignore network errors */ }
    }

    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  return null
}
