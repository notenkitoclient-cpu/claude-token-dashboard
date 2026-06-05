import SecurityScore from "@/components/SecurityScore"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"

export const dynamic = "force-dynamic"

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Score</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Claude Code environment risk assessment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsModal />
          <RefreshButton />
        </div>
      </div>

      <SecurityScore />
    </main>
  )
}
