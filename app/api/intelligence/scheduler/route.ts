import { computeSchedule } from "@/lib/intelligence/scheduler"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = computeSchedule()
  return Response.json(data)
}
