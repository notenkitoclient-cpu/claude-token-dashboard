import type { TokenStats } from "@/lib/collect"

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
    .map(([project, stats]) => ({ project, ...stats, total: stats.input + stats.output }))
    .sort((a, b) => b.total - a.total)

  const maxTotal = rows[0]?.total ?? 1

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Output</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Input</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Cache Read</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Cache Create</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
            <th className="px-4 py-3 w-32 hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const pct = (row.total / maxTotal) * 100
            return (
              <tr
                key={row.project}
                className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${i === 0 ? "bg-muted/10" : ""}`}
              >
                <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate" title={row.project}>
                  {row.project}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-violet-400">{fmt(row.output)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-blue-400">{fmt(row.input)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">
                  {fmt(row.cacheRead)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">
                  {fmt(row.cacheCreate)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{fmt(row.total)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
