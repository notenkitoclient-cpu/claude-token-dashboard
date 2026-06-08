"use client"

import { useEffect, useState } from "react"
import type { SecurityScoreResult, ScoreFinding, Severity } from "@/lib/securityScore"

interface ProjectScore {
  project: string
  settingsFound: boolean
  score: number | null
  grade: string | null
  label: string | null
}

interface SecurityResponse {
  global: SecurityScoreResult
  projects: ProjectScore[]
}

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 200
  const sw   = 14
  const r    = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="oklch(1 0 0 / 8%)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 80) return "oklch(0.72 0.19 149)"   // emerald
  if (score >= 60) return "oklch(0.76 0.18 74)"    // amber
  return              "oklch(0.65 0.22 25)"         // red
}

const SEV_ICON: Record<Severity, string> = { critical: "🔴", warning: "⚠️", info: "ℹ️" }
const SEV_STYLE: Record<Severity, string> = {
  critical: "border-red-500/30 bg-red-950/20",
  warning:  "border-amber-500/30 bg-amber-950/10",
  info:     "border-border bg-muted/10",
}

function FindingRow({ f }: { f: ScoreFinding }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${f.passed ? "border-border bg-muted/5" : SEV_STYLE[f.severity]}`}>
      <span className="text-base shrink-0 mt-0.5">{f.passed ? "✅" : SEV_ICON[f.severity]}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${f.passed ? "text-foreground" : ""}`}>{f.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
      </div>
      {!f.passed && (
        <span className="shrink-0 text-xs font-mono font-semibold text-red-400">−{f.penalty}pts</span>
      )}
    </div>
  )
}

// ── Share button ─────────────────────────────────────────────────────────────
function shareText(result: SecurityScoreResult): string {
  const topRisks = result.findings
    .filter(f => !f.passed && f.penalty >= 10)
    .slice(0, 3)
    .map(f => `• ${f.label}: −${f.penalty}pts`)
    .join("\n")

  return [
    `🛡️ My Claude Code Security Score: ${result.score}/100 (${result.grade} — ${result.label})`,
    "",
    topRisks || "✅ No major risks found!",
    "",
    "Check yours → https://github.com/notenkitoclient-cpu/claude-token-dashboard",
    "#ClaudeCode #AI #Security",
  ].join("\n")
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SecurityScore() {
  const [data,   setData]   = useState<SecurityResponse | null>(null)
  const [error,  setError]  = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/security")
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
  }, [])

  const result = data?.global ?? null

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-400">
        Failed to load: {error}
      </div>
    )
  }

  if (!result) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Analyzing settings…</div>
  }

  const color = scoreColor(result.score)
  const passed = result.findings.filter(f => f.passed).length
  const total  = result.findings.length

  function handleShare() {
    const text = shareText(result!)
    const url  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareText(result!)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-8">
      {/* Score hero */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative inline-flex items-center justify-center">
          <ScoreRing score={result.score} color={color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <span className="text-5xl font-bold font-mono tracking-tight" style={{ color }}>
              {result.score}
            </span>
            <span className="text-sm text-muted-foreground">/&nbsp;100</span>
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color }}>
            {result.grade} &mdash; {result.label}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {passed} / {total} checks passed
            {!result.settingsFound && (
              <span className="ml-2 text-amber-400">· settings.json not found</span>
            )}
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-lg bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            𝕏 &nbsp;Share your score
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-4 py-2 text-sm font-medium transition-colors"
          >
            {copied ? "✓ Copied!" : "Copy text"}
          </button>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
          Security Checks
        </h2>
        {/* Failed first, then passed */}
        {[...result.findings.filter(f => !f.passed), ...result.findings.filter(f => f.passed)]
          .map(f => <FindingRow key={f.id} f={f} />)}
      </div>

      {/* Project Scores */}
      {data!.projects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Project Scores
            <span className="ml-2 text-[10px] font-normal normal-case">
              (local .claude/settings.json — top 5)
            </span>
          </h2>
          <div className="space-y-1.5">
            {data!.projects.map(p => (
              <div key={p.project} className="flex items-center gap-3 rounded-lg border border-border bg-muted/5 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate" title={p.project}>{p.project}</p>
                  {!p.settingsFound && (
                    <p className="text-xs text-muted-foreground/50">No local config</p>
                  )}
                </div>
                {p.settingsFound && p.score !== null ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold" style={{ color: scoreColor(p.score) }}>
                      {p.grade}
                    </span>
                    <span className="text-sm font-mono font-bold tabular-nums" style={{ color: scoreColor(p.score) }}>
                      {p.score}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/30 shrink-0">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Reads <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">~/.claude/settings.json</code> locally — no data leaves your machine.
      </p>
    </div>
  )
}
