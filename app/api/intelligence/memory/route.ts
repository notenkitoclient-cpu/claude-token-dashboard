import { buildMemory } from "@/lib/intelligence/memory"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = buildMemory()
  return Response.json(data)
}
