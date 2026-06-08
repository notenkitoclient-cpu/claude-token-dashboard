import { computeSchedule, loadSchedule } from "@/lib/intelligence/scheduler"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = loadSchedule() ?? computeSchedule()
  return Response.json(data)
}
