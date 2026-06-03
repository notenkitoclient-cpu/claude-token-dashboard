import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TokenStats } from "@/lib/collect"
import { generateInsights, type InsightLevel } from "@/lib/insights"

interface Props {
  byProject: Record<string, TokenStats>
  byProjectClaudeMd: Record<string, number | null>
}

const LEVEL_STYLES: Record<InsightLevel, { bar: string; icon: string; badge: string }> = {
  alert:   { bar: "bg-red-500",    icon: "🔴", badge: "text-red-400" },
  warning: { bar: "bg-amber-500",  icon: "⚠️",  badge: "text-amber-400" },
  tip:     { bar: "bg-emerald-500",icon: "💡",  badge: "text-emerald-400" },
}

const LEVEL_LABEL: Record<InsightLevel, string> = {
  alert:   "重要",
  warning: "注意",
  tip:     "提案",
}

export default function InsightPanel({ byProject, byProjectClaudeMd }: Props) {
  const insights = generateInsights(byProject, byProjectClaudeMd)

  if (insights.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">
          削減提案
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => {
          const s = LEVEL_STYLES[insight.level]
          return (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-border bg-muted/20 overflow-hidden"
            >
              {/* 左カラーバー */}
              <div className={`w-1 shrink-0 ${s.bar}`} />
              <div className="flex items-start gap-2 py-3 pr-4">
                <span className="text-base leading-none mt-0.5">{s.icon}</span>
                <div>
                  <span className={`text-xs font-semibold ${s.badge} mr-2`}>
                    {LEVEL_LABEL[insight.level]}
                  </span>
                  <span className="text-xs font-medium text-foreground mr-2">
                    {insight.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {insight.message}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
