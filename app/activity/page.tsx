import ActivityFeed from "@/components/ActivityFeed"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"

export const dynamic = "force-dynamic"

const HOOK_SNIPPET = `{
  "hooks": {
    "PostToolUse": [{
      "matcher": ".*",
      "hooks": [{
        "type": "command",
        "command": "curl -sf -X POST http://localhost:3000/api/actions -H 'Content-Type: application/json' --data-binary @- 2>/dev/null || true"
      }]
    }]
  }
}`

export default function ActivityPage() {
  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time Claude Code tool invocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsModal />
          <RefreshButton />
        </div>
      </div>

      {/* Hook setup card */}
      <div className="rounded-xl border border-border bg-muted/10 p-5 space-y-3">
        <h2 className="text-sm font-semibold">Hook Setup</h2>
        <p className="text-xs text-muted-foreground">
          Add the following to <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">~/.claude/settings.json</code> (global)
          or <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">.claude/settings.json</code> (per project):
        </p>
        <pre className="rounded-lg bg-muted/40 border border-border p-4 text-xs font-mono text-muted-foreground overflow-x-auto">
          {HOOK_SNIPPET}
        </pre>
        <p className="text-xs text-muted-foreground">
          The hook pipes stdin to <code className="font-mono text-[11px]">POST /api/actions</code> silently.
          If the dashboard isn&apos;t running, <code className="font-mono text-[11px]">|| true</code> prevents blocking.
        </p>
      </div>

      {/* Activity feed */}
      <ActivityFeed />
    </main>
  )
}
