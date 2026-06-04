"use client"

import { useState } from "react"
import { usePlan, type Plan } from "./PlanProvider"

const PLAN_OPTIONS: { value: Plan; label: string; description: string }[] = [
  {
    value: "Pro",
    label: "Claude Pro",
    description: "月額固定サブスク。トークン消費量（%）で判断したい。",
  },
  {
    value: "Max",
    label: "Claude Max",
    description: "高容量サブスク。トークン消費量（%）で判断したい。",
  },
  {
    value: "API",
    label: "API / Developer",
    description: "従量課金。ドルコストで判断したい。",
  },
]

export default function SettingsModal() {
  const [open, setOpen] = useState(false)
  const { plan, setPlan } = usePlan()

  return (
    <>
      {/* Gear button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        aria-label="設定"
      >
        ⚙ 設定
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold">設定</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                プランを選択するとコスト表示の軸が変わります。
              </p>
              {PLAN_OPTIONS.map((opt) => {
                const active = plan === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setPlan(opt.value); setOpen(false) }}
                    className={[
                      "w-full text-left rounded-lg border px-4 py-3 transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground",
                        ].join(" ")}
                      >
                        {active && "✓"}
                      </span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="mt-1 ml-6 text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
