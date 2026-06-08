import { getDb } from "@/lib/actionsDb"

export const dynamic = "force-dynamic"

function escapeCell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`
}

function extractCommand(toolInput: string): string {
  try {
    const obj = JSON.parse(toolInput) as Record<string, unknown>
    const first = obj.command ?? Object.values(obj)[0] ?? ""
    return String(first)
  } catch {
    return ""
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format  = searchParams.get("format") === "csv" ? "csv" : "json"
  const limit   = Math.min(Number(searchParams.get("limit") ?? 5000), 10000)
  const project = searchParams.get("project")
  const risk    = searchParams.get("risk")
  const tool    = searchParams.get("tool")

  const conditions: string[] = []
  const params: unknown[] = []
  if (project) { conditions.push("project=?");    params.push(project) }
  if (risk)    { conditions.push("risk_level=?"); params.push(risk) }
  if (tool)    { conditions.push("tool_name=?");  params.push(tool) }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  const rows = getDb()
    .prepare(`SELECT * FROM actions ${where} ORDER BY timestamp DESC LIMIT ?`)
    .all(...params, limit) as Record<string, unknown>[]

  const date = new Date().toISOString().slice(0, 10)

  if (format === "csv") {
    const header = "timestamp,tool_name,risk_level,project,command"
    const lines  = rows.map(r =>
      [r.timestamp, r.tool_name, r.risk_level, r.project, extractCommand(r.tool_input as string)]
        .map(escapeCell)
        .join(",")
    )
    return new Response([header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activity-${date}.csv"`,
      },
    })
  }

  return new Response(JSON.stringify(rows, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="activity-${date}.json"`,
    },
  })
}
