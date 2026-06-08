import { getDb, getRiskLevel, projectFromCwd, type AlertRow } from "@/lib/actionsDb"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const tool_name  = String(body.tool_name  ?? body.toolName  ?? "")
    const session_id = String(body.session_id ?? body.sessionId ?? "")
    const cwd        = String(body.cwd        ?? "")
    const tool_input = (body.tool_input ?? body.toolInput ?? {}) as Record<string, unknown>
    const timestamp  = String(body.timestamp  ?? new Date().toISOString())

    if (!tool_name) return Response.json({ ok: false, error: "missing tool_name" }, { status: 400 })

    const risk_level = getRiskLevel(tool_name, tool_input)
    console.log("[alerts] tool_name:", tool_name, "| command:", (tool_input as Record<string, unknown>)?.command, "| risk_level:", risk_level)

    // Only persist high-risk pre-execution alerts
    if (risk_level !== "high") return Response.json({ ok: true, stored: false, risk_level })

    const project = projectFromCwd(cwd)

    getDb().prepare(`
      INSERT INTO alerts (session_id, timestamp, tool_name, tool_input, risk_level, project, acknowledged)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(session_id, timestamp, tool_name, JSON.stringify(tool_input), risk_level, project)

    return Response.json({ ok: true, stored: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const rows = getDb().prepare(
      "SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY timestamp DESC LIMIT 50"
    ).all()
    return Response.json(rows as unknown as AlertRow[])
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id  = searchParams.get("id")
    const all = searchParams.get("all")

    if (all === "1") {
      getDb().prepare("UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0").run()
    } else if (id) {
      getDb().prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?").run(Number(id))
    } else {
      return Response.json({ error: "missing id or all" }, { status: 400 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
