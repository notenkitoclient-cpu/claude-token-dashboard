import { collect } from "@/lib/collect"
import SummaryCards from "@/components/SummaryCards"
import InsightPanel from "@/components/InsightPanel"
import ProjectTable from "@/components/ProjectTable"
import DailyChart from "@/components/DailyChart"
import RefreshButton from "@/components/RefreshButton"
import SettingsModal from "@/components/SettingsModal"
import TodaySummary from "@/components/TodaySummary"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default function Page() {
  const { byProject, byDay, byProjectClaudeMd, byProjectSessions, totalFiles, totalEntries, skippedDup } = collect()

  const dayData = Object.entries(byDay)
    .filter(([date]) => date !== "unknown")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({ date, ...stats }))

  const generatedAt = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claude Token Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ~/.claude/projects/ &nbsp;·&nbsp; {generatedAt} (JST)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SettingsModal />
          <RefreshButton />
        </div>
      </div>

      {/* Today's Summary */}
      <TodaySummary />

      {/* Summary cards */}
      <SummaryCards
        byProject={byProject}
        byDay={byDay}
        totalFiles={totalFiles}
        totalEntries={totalEntries}
        skippedDup={skippedDup}
      />

      {/* Insights */}
      <InsightPanel byProject={byProject} byProjectClaudeMd={byProjectClaudeMd} />

      {/* Daily chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Daily Token Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyChart data={dayData} />
        </CardContent>
      </Card>

      {/* Project table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Token Usage by Project
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ProjectTable
            byProject={byProject}
            byProjectClaudeMd={byProjectClaudeMd}
            byProjectSessions={byProjectSessions}
          />
        </CardContent>
      </Card>
    </main>
  )
}
