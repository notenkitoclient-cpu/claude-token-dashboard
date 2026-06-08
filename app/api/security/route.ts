import { computeSecurityScore } from "@/lib/securityScore"
import { collect } from "@/lib/collect"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const global = computeSecurityScore()

    const { byProjectCwd } = collect()

    const projects = Object.entries(byProjectCwd)
      .map(([project, cwd]) => {
        const settingsPath = path.join(cwd, ".claude", "settings.json")
        const settingsFound = fs.existsSync(settingsPath)
        if (!settingsFound) {
          return { project, settingsFound: false, score: null, grade: null, label: null }
        }
        const { score, grade, label } = computeSecurityScore(settingsPath)
        return { project, settingsFound: true, score, grade, label }
      })
      // Worst scores first (most actionable), then projects without config
      .sort((a, b) => {
        if (a.settingsFound && !b.settingsFound) return -1
        if (!a.settingsFound && b.settingsFound) return 1
        if (a.settingsFound && b.settingsFound) return (a.score ?? 100) - (b.score ?? 100)
        return a.project.localeCompare(b.project)
      })
      .slice(0, 5)

    return Response.json({ global, projects })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
