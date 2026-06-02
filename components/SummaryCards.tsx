import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TokenStats } from "@/lib/collect"

interface Props {
  byProject: Record<string, TokenStats>
  byDay: Record<string, TokenStats>
  totalFiles: number
  totalEntries: number
  skippedDup: number
}

function fmtBig(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function SummaryCards({ byProject, totalFiles, totalEntries, skippedDup }: Props) {
  const allStats = Object.values(byProject)
  const totalInput = allStats.reduce((s, v) => s + v.input, 0)
  const totalOutput = allStats.reduce((s, v) => s + v.output, 0)
  const totalCacheRead = allStats.reduce((s, v) => s + v.cacheRead, 0)
  const totalCacheCreate = allStats.reduce((s, v) => s + v.cacheCreate, 0)
  const effectiveInput = totalInput + totalCacheRead + totalCacheCreate
  const cacheRatio = effectiveInput > 0 ? (totalCacheRead / effectiveInput) * 100 : 0

  const cards = [
    { title: "Output Tokens", value: fmtBig(totalOutput), sub: "generated" },
    { title: "Input Tokens", value: fmtBig(totalInput), sub: "sent" },
    { title: "Effective Input", value: fmtBig(effectiveInput), sub: "input + cache" },
    { title: "Cache Read Ratio", value: `${cacheRatio.toFixed(1)}%`, sub: "of effective input" },
    { title: "Projects", value: String(Object.keys(byProject).length), sub: "unique" },
    { title: "Sessions", value: fmtBig(totalFiles), sub: `${fmtBig(totalEntries)} entries · ${fmtBig(skippedDup)} deduped` },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="pb-2">
            <CardTitle>{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono tracking-tight">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
