import { computeSecurityScore } from "@/lib/securityScore"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return Response.json(computeSecurityScore())
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
