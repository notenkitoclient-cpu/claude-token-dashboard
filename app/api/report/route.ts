import { collect } from "@/lib/collect"
import { calcCost } from "@/lib/pricing"
import { generateInsights } from "@/lib/insights"
import { computeSecurityScore } from "@/lib/securityScore"

export const dynamic = "force-dynamic"

export async function GET() {
  const now   = new Date()
  const today = now.toISOString().slice(0, 10)

  const { byProject, byDay, byProjectClaudeMd } = collect()

  const dayStats    = byDay[today] ?? { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 }
  const monthPrefix = today.slice(0, 7)
  const monthCost   = Object.entries(byDay)
    .filter(([date]) => date.startsWith(monthPrefix))
    .reduce((sum, [, stats]) => sum + calcCost(stats), 0)

  const report = {
    generatedAt: now.toISOString(),
    today: {
      date: today,
      cost: calcCost(dayStats),
      tokens: dayStats.input + dayStats.output,
    },
    monthToDate: {
      month: monthPrefix,
      cost: monthCost,
    },
    projects: Object.entries(byProject)
      .map(([name, stats]) => ({
        name,
        cost: calcCost(stats),
        tokens: stats.input + stats.output,
        input: stats.input,
        output: stats.output,
        cacheCreate: stats.cacheCreate,
        cacheRead: stats.cacheRead,
      }))
      .sort((a, b) => b.cost - a.cost),
    insights: generateInsights(byProject, byProjectClaudeMd),
    security: computeSecurityScore(),
  }

  const filename = `claude-report-${today}.json`
  return new Response(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
