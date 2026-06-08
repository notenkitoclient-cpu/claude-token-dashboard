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
  token_cost: number | null
}

export interface AlertRow {
  id: number
  session_id: string
  timestamp: string
  tool_name: string
  tool_input: string   // JSON string
  risk_level: RiskLevel
  project: string
  acknowledged: number  // 0 = pending, 1 = dismissed
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
        project     TEXT NOT NULL DEFAULT '',
        token_cost  REAL
      );
      CREATE INDEX IF NOT EXISTS idx_ts ON actions(timestamp DESC);
      CREATE TABLE IF NOT EXISTS alerts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   TEXT NOT NULL DEFAULT '',
        timestamp    TEXT NOT NULL,
        tool_name    TEXT NOT NULL,
        tool_input   TEXT NOT NULL DEFAULT '{}',
        risk_level   TEXT NOT NULL DEFAULT 'high',
        project      TEXT NOT NULL DEFAULT '',
        acknowledged INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged, timestamp DESC);
    `)
    // Migrate existing DBs that don't yet have token_cost
    try { _db.exec("ALTER TABLE actions ADD COLUMN token_cost REAL") } catch { /* already exists */ }
  }
  return _db
}

const HIGH_RISK = /\b(rm|rmdir|unlink|del|format|drop|truncate|shred|mkfs|fdisk)\b/i
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
