import { getDb, getRiskLevel, projectFromCwd, type ActionRow } from "@/lib/actionsDb"
import { calcCost } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const tool_name   = String(body.tool_name   ?? body.toolName   ?? "")
    const session_id  = String(body.session_id  ?? body.sessionId  ?? "")
    const cwd         = String(body.cwd         ?? "")
    const tool_input  = (body.tool_input ?? body.toolInput ?? {}) as Record<string, unknown>
    const timestamp   = String(body.timestamp   ?? new Date().toISOString())

    if (!tool_name) return Response.json({ ok: false, error: "missing tool_name" }, { status: 400 })

    const risk_level = getRiskLevel(tool_name, tool_input)
    const project    = projectFromCwd(cwd)

    // Extract token usage from hook payload (various field names Claude Code may send)
    const usage = (body.usage ?? body.tokenUsage ?? body.token_usage ?? null) as Record<string, number> | null
    let token_cost: number | null = null
    if (usage && typeof usage === "object") {
      token_cost = calcCost({
        input:       Number(usage.input_tokens               ?? 0),
        output:      Number(usage.output_tokens              ?? 0),
        cacheCreate: Number(usage.cache_creation_input_tokens ?? 0),
        cacheRead:   Number(usage.cache_read_input_tokens    ?? 0),
      })
      if (token_cost === 0) token_cost = null  // don't store zero (no usage data)
    }

    getDb().prepare(`
      INSERT INTO actions (session_id, timestamp, tool_name, tool_input, risk_level, project, token_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session_id, timestamp, tool_name, JSON.stringify(tool_input), risk_level, project, token_cost)

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit   = Math.min(Number(searchParams.get("limit") ?? 200), 1000)
    const project = searchParams.get("project")
    const risk    = searchParams.get("risk")

    let rows: Record<string, unknown>[]
    if (project && risk) {
      rows = getDb().prepare(
        "SELECT * FROM actions WHERE project=? AND risk_level=? ORDER BY timestamp DESC LIMIT ?"
      ).all(project, risk, limit)
    } else if (project) {
      rows = getDb().prepare(
        "SELECT * FROM actions WHERE project=? ORDER BY timestamp DESC LIMIT ?"
      ).all(project, limit)
    } else if (risk) {
      rows = getDb().prepare(
        "SELECT * FROM actions WHERE risk_level=? ORDER BY timestamp DESC LIMIT ?"
      ).all(risk, limit)
    } else {
      rows = getDb().prepare(
        "SELECT * FROM actions ORDER BY timestamp DESC LIMIT ?"
      ).all(limit)
    }

    return Response.json(rows as unknown as ActionRow[])
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
