import Anthropic from "@anthropic-ai/sdk"
import crypto from "crypto"
import fs from "fs"
import os from "os"
import path from "path"

export const dynamic = "force-dynamic"

const CACHE_DIR = path.join(os.homedir(), ".claude-dashboard")
const CACHE_FILE = path.join(CACHE_DIR, "assist-cache.json")

type CacheStore = Record<string, string>

function loadCache(): CacheStore {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as CacheStore
  } catch {
    return {}
  }
}

function saveCache(cache: CacheStore): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8")
}

function cacheKey(projectLabel: string, lastMessage: string): string {
  const raw = projectLabel + lastMessage.slice(0, 50)
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export async function POST(req: Request) {
  let body: {
    projectLabel: string
    lastMessage: string
    stagnationHours: number
    incompleteTasks: number
    errorRate: number
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { projectLabel, lastMessage, stagnationHours, incompleteTasks, errorRate } = body

  if (!projectLabel || !lastMessage) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  const key = cacheKey(projectLabel, lastMessage)
  const cache = loadCache()

  function extractText(raw: string): string {
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === "string") return parsed
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p) => typeof p === "object" && p !== null && (p as Record<string, unknown>).type === "text")
          .map((p) => ((p as Record<string, unknown>).text as string) ?? "")
          .join(" ")
          .trim() || raw
      }
      return raw
    } catch {
      return raw
    }
  }

  const cleanedMessage = extractText(lastMessage).slice(0, 200)

  if (cache[key]) {
    return Response.json({ hint: cache[key] })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })

  const userMessage = `Project: ${projectLabel}
Last message: ${cleanedMessage}
Stagnation: ${stagnationHours}h, Incomplete tasks: ${incompleteTasks}, Error rate: ${Math.round(errorRate * 100)}%

What should the developer do next? Answer in 2-3 sentences max.`

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system: "You are a project assistant. Reply in the same language as the user's last message. Be concise.",
      messages: [{ role: "user", content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === "text")
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from API" }, { status: 500 })
    }

    const hint = textBlock.text.trim()
    cache[key] = hint
    saveCache(cache)

    return Response.json({ hint })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: err.message }, { status: err.status ?? 500 })
    }
    return Response.json({ error: "API call failed" }, { status: 500 })
  }
}
