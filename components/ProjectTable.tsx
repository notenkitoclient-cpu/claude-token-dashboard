import type { TokenStats } from "@/lib/collect"
import { calcCost, fmtCost } from "@/lib/pricing"

interface Props {
  byProject: Record<string, TokenStats>
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function ProjectTable({ byProject }: Props) {
  const rows = Object.entries(byProject)
    .map(([project, stats]) => ({
      project,
      ...stats,
      total: stats.input + stats.output,
      cost: calcCost(stats),
    }))
    .sort((a, b) => b.cost - a.cost)

  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  const totalCost = rows.reduce((s, r) => s + r.cost, 0)
  const WARNING_THRESHOLD = 0.20

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Cost</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Output</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Input</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Cache Read</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Cache Create</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tokens</th>
            <th className="px-4 py-3 w-28 hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pct = (row.total / maxTotal) * 100
            const costShare = totalCost > 0 ? row.cost / totalCost : 0
            const isHighCost = costShare >= WARNING_THRESHOLD

            return (
              <tr
                key={row.project}
                className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                  isHighCost ? "bg-amber-950/10" : i === 0 ? "bg-muted/10" : ""
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs max-w-[180px]">
                  <div className="flex items-center gap-1.5 truncate" title={row.project}>
                    {isHighCost && (
                      <span className="shrink-0 text-amber-400" title={`${(costShare * 100).toFixed(1)}% of total cost`}>
                        ⚠
                      </span>
                    )}
                    <span className="truncate">{row.project}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  <span className={isHighCost ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                    {fmtCost(row.cost)}
                  </span>
                  {totalCost > 0 && (
                    <span className="ml-1 text-muted-foreground text-[10px]">
                      {(costShare * 100).toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{fmt(row.output)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-blue-400">{fmt(row.input)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                  {fmt(row.cacheRead)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                  {fmt(row.cacheCreate)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{fmt(row.total)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isHighCost ? "bg-amber-500/70" : "bg-violet-500/70"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted/20">
            <td className="px-4 py-2 text-xs font-medium text-muted-foreground">TOTAL</td>
            <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-emerald-400">
              {fmtCost(totalCost)}
            </td>
            <td colSpan={6} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
