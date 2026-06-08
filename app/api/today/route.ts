import { collect } from "@/lib/collect"
import { getDb } from "@/lib/actionsDb"
import { calcCost } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function GET() {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)  // UTC YYYY-MM-DD (matches byDay keys)

  const { byDay, byProjectSessions } = collect()
  const dayStats = byDay[today] ?? { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }

  const activeProjects = Object.values(byProjectSessions)
    .filter(sessions => sessions.some(s => s.startedAt.slice(0, 10) === today))
    .length

  let actions = 0
  try {
    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM actions WHERE substr(timestamp, 1, 10) = ?")
      .get(today) as { count: number } | undefined
    actions = row?.count ?? 0
  } catch {
    // actionsDb not yet initialized
  }

  // Month-end projection: sum month-to-date cost ÷ elapsed days × total days in month
  const monthPrefix  = today.slice(0, 7)  // "YYYY-MM"
  const dayOfMonth   = now.getUTCDate()
  const daysInMonth  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const monthCost    = Object.entries(byDay)
    .filter(([date]) => date.startsWith(monthPrefix))
    .reduce((sum, [, stats]) => sum + calcCost(stats), 0)
  const projectedMonthCost = dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : 0

  return Response.json({
    date: today,
    cost: calcCost(dayStats),
    tokens: dayStats.input + dayStats.output,
    actions,
    activeProjects,
    projectedMonthCost,
  })
}
