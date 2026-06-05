import { collect } from "@/lib/collect"
import { getDb } from "@/lib/actionsDb"
import { calcCost } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function GET() {
  const today = new Date().toISOString().slice(0, 10)  // UTC YYYY-MM-DD (matches byDay keys)

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

  return Response.json({
    date: today,
    cost: calcCost(dayStats),
    tokens: dayStats.input + dayStats.output,
    actions,
    activeProjects,
  })
}
