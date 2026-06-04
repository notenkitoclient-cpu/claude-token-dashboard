"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type Plan = "Pro" | "Max" | "API"
const PLANS: Plan[] = ["Pro", "Max", "API"]
const STORAGE_KEY = "ctd-plan"

interface PlanCtx {
  plan: Plan
  setPlan: (p: Plan) => void
  mounted: boolean
}

const DEFAULT_PLAN: Plan = "Pro"

const PlanContext = createContext<PlanCtx>({ plan: DEFAULT_PLAN, setPlan: () => {}, mounted: false })

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<Plan>(DEFAULT_PLAN)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Plan | null
    if (stored && (PLANS as string[]).includes(stored)) setPlanState(stored)
    setMounted(true)
  }, [])

  const setPlan = (p: Plan) => {
    setPlanState(p)
    localStorage.setItem(STORAGE_KEY, p)
  }

  return (
    <PlanContext.Provider value={{ plan, setPlan, mounted }}>
      {children}
    </PlanContext.Provider>
  )
}

export function usePlan() {
  return useContext(PlanContext)
}
