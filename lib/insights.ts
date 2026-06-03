import type { TokenStats } from "./collect"
import { calcCost, PRICING } from "./pricing"

export type InsightLevel = "warning" | "alert" | "tip"

export interface Insight {
  level: InsightLevel
  title: string
  message: string
}

const CLAUDE_MD_WARN_BYTES = 5 * 1024
const HIGH_COST_SHARE_THRESHOLD = 0.20   // 20% → alert
const HIGH_CACHE_CREATE_RATIO = 0.50     // cache_create > 50% of own cost → warning

function cacheCreateCost(stats: TokenStats): number {
  return stats.cacheCreate * PRICING.cacheCreate
}

export function generateInsights(
  byProject: Record<string, TokenStats>,
  byProjectClaudeMd: Record<string, number | null>,
): Insight[] {
  const insights: Insight[] = []

  const entries = Object.entries(byProject)
  if (entries.length === 0) return insights

  const totalCost = entries.reduce((s, [, v]) => s + calcCost(v), 0)
  if (totalCost === 0) return insights

  // ── Insight 1: 最もコストが高いプロジェクト ────────────────────────────
  const [topProject, topStats] = entries.reduce(
    (best, cur) => (calcCost(cur[1]) > calcCost(best[1]) ? cur : best),
  )
  const topShare = calcCost(topStats) / totalCost
  insights.push({
    level: topShare >= HIGH_COST_SHARE_THRESHOLD ? "alert" : "tip",
    title: "最大コストプロジェクト",
    message: `${topProject} が全体の ${(topShare * 100).toFixed(1)}% を占めています。CLAUDE.mdのサイズを確認してください。`,
  })

  // ── Insight 2: cache_creation が高いプロジェクト ──────────────────────
  const highCacheProjects = entries
    .filter(([, stats]) => {
      const own = calcCost(stats)
      return own > 0 && cacheCreateCost(stats) / own >= HIGH_CACHE_CREATE_RATIO
    })
    .sort(([, a], [, b]) => cacheCreateCost(b) - cacheCreateCost(a))
    .slice(0, 3)

  for (const [project] of highCacheProjects) {
    insights.push({
      level: "warning",
      title: "cache_creation 過多",
      message: `${project} の cache_creation が高いです。CLAUDE.mdが肥大化している可能性があります。`,
    })
  }

  // ── Insight 3: 全体最適化ポテンシャル ─────────────────────────────────
  // 大きな CLAUDE.md（≥5KB）を持つプロジェクトの cache_create コストを
  // 50% 削減できると仮定した場合の節約額
  const heavyProjects = entries.filter(
    ([label]) => (byProjectClaudeMd[label] ?? 0) >= CLAUDE_MD_WARN_BYTES,
  )

  const targetProjects = heavyProjects.length > 0
    ? heavyProjects
    : entries.sort(([, a], [, b]) => cacheCreateCost(b) - cacheCreateCost(a)).slice(0, 3)

  const optimizableCost = targetProjects.reduce(
    (s, [, stats]) => s + cacheCreateCost(stats),
    0,
  )
  const savingPct = (optimizableCost * 0.5) / totalCost * 100

  if (savingPct >= 1) {
    insights.push({
      level: "tip",
      title: "最適化ポテンシャル",
      message: `最適化すれば推定 ${savingPct.toFixed(1)}% のコスト削減が可能です。`,
    })
  }

  return insights
}
