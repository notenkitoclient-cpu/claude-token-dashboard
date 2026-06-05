import { DatabaseSync } from "node:sqlite"
import path from "path"
import os from "os"

export type RiskLevel = "high" | "medium" | "low"

export interface ActionRow {
  id: number
  session_id: string
  timestamp: string
  tool_name: string
  tool_input: string   // JSON string
  risk_level: RiskLevel
  project: string
}

const DB_PATH = path.join(os.homedir(), ".claude", "token-dashboard-actions.db")

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH)
    _db.exec(`
      CREATE TABLE IF NOT EXISTS actions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT NOT NULL DEFAULT '',
        timestamp   TEXT NOT NULL,
        tool_name   TEXT NOT NULL,
        tool_input  TEXT NOT NULL DEFAULT '{}',
        risk_level  TEXT NOT NULL DEFAULT 'low',
        project     TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS idx_ts ON actions(timestamp DESC);
    `)
  }
  return _db
}

const HIGH_RISK = /\b(rm\s|rm$|rmdir|unlink|del\s|format\s|drop\s|truncate\s|shred|mkfs|fdisk)\b/i
const MED_RISK  = /\b(npm|yarn|pnpm|bun|git|sudo|brew|pip|apt|yum|chmod|chown|curl|wget)\b/i

export function getRiskLevel(toolName: string, toolInput: Record<string, unknown>): RiskLevel {
  if (toolName === "Bash") {
    const cmd = String(toolInput?.command ?? "")
    if (HIGH_RISK.test(cmd)) return "high"
    if (MED_RISK.test(cmd))  return "medium"
    return "medium"  // any Bash is at least medium
  }
  if (toolName === "Write") return "medium"
  return "low"
}

export function projectFromCwd(cwd: string): string {
  const home = os.homedir()
  let p = cwd.startsWith(home) ? cwd.slice(home.length).replace(/^\//, "") : cwd
  if (p.startsWith("works/")) p = p.slice(6)
  return p || "(home)"
}
