import fs from "fs"
import path from "path"
import os from "os"

const SETTINGS_PATH = path.join(os.homedir(), ".claude", "settings.json")

interface Settings {
  permissions?: { allow?: string[]; deny?: string[] }
  hooks?: Record<string, unknown>
  strictMode?: boolean
}

export type Severity = "critical" | "warning" | "info"

export interface ScoreFinding {
  id: string
  label: string
  detail: string
  penalty: number
  severity: Severity
  passed: boolean
}

export interface SecurityScoreResult {
  score: number
  grade: string
  label: string
  findings: ScoreFinding[]
  settingsFound: boolean
}

function readSettings(settingsPath = SETTINGS_PATH): Settings | null {
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Settings
  } catch {
    return null
  }
}

function grade(score: number): { grade: string; label: string } {
  if (score >= 90) return { grade: "A+", label: "Excellent" }
  if (score >= 80) return { grade: "A",  label: "Good" }
  if (score >= 70) return { grade: "B",  label: "Fair" }
  if (score >= 60) return { grade: "C",  label: "Needs Work" }
  if (score >= 40) return { grade: "D",  label: "Poor" }
  return              { grade: "F",  label: "Critical" }
}

export function computeSecurityScore(settingsPath = SETTINGS_PATH): SecurityScoreResult {
  const settings = readSettings(settingsPath)

  if (!settings) {
    return {
      score: 50,
      ...grade(50),
      settingsFound: false,
      findings: [{
        id: "no-settings",
        label: "Settings file not found",
        detail: "~/.claude/settings.json could not be read — risk level unknown",
        penalty: 0,
        severity: "info",
        passed: false,
      }],
    }
  }

  const allow = settings.permissions?.allow ?? []
  const deny  = settings.permissions?.deny  ?? []

  const inAllow = (p: string) => allow.includes(p)
  const inDeny  = (p: string) => deny.includes(p)
  const anyDeny = (...pats: string[]) => pats.some(inDeny)

  const findings: ScoreFinding[] = [
    {
      id: "sudo-allow",
      label: 'Bash(sudo *) not in allow',
      detail: "sudo gives Claude root-level control over the entire system",
      penalty: 20,
      severity: "critical",
      passed: !inAllow("Bash(sudo *)"),
    },
    {
      id: "ssh-deny",
      label: "Read(~/.ssh/**) in deny",
      detail: "SSH private keys are highly sensitive credentials",
      penalty: 20,
      severity: "critical",
      passed: anyDeny("Read(~/.ssh/**)", "Read(~/.ssh/*)"),
    },
    {
      id: "curl-allow",
      label: 'Bash(curl *) not in allow',
      detail: "Unrestricted curl enables arbitrary outbound HTTP requests",
      penalty: 15,
      severity: "warning",
      passed: !inAllow("Bash(curl *)"),
    },
    {
      id: "env-deny",
      label: "Read(*.env) in deny",
      detail: ".env files commonly contain API keys and secrets",
      penalty: 15,
      severity: "warning",
      passed: anyDeny("Read(*.env)", "Read(.env.*)", "Read(*.env.*)"),
    },
    {
      id: "strict-mode",
      label: "strictMode enabled",
      detail: "strictMode prevents Claude from auto-approving risky actions",
      penalty: 10,
      severity: "warning",
      passed: settings.strictMode === true,
    },
    {
      id: "rm-allow",
      label: 'Bash(rm *) not in allow',
      detail: "Unrestricted rm can permanently delete files without confirmation",
      penalty: 10,
      severity: "warning",
      passed: !inAllow("Bash(rm *)"),
    },
    {
      id: "hooks-set",
      label: "Hooks configured",
      detail: "Hooks enable audit logging and activity monitoring",
      penalty: 5,
      severity: "info",
      passed: !!settings.hooks && Object.keys(settings.hooks).length > 0,
    },
  ]

  const score = Math.max(0, findings.reduce((s, f) => s - (f.passed ? 0 : f.penalty), 100))
  return { score, ...grade(score), findings, settingsFound: true }
}
