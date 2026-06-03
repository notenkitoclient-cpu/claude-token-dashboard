import type { TokenStats } from "./collect"

// claude-sonnet-4-6 pricing (USD per token)
export const PRICING = {
  input:       3.00  / 1_000_000,
  output:      15.00 / 1_000_000,
  cacheRead:   0.30  / 1_000_000,
  cacheCreate: 3.75  / 1_000_000,
} as const

export function calcCost(stats: TokenStats): number {
  return (
    stats.input       * PRICING.input +
    stats.output      * PRICING.output +
    stats.cacheRead   * PRICING.cacheRead +
    stats.cacheCreate * PRICING.cacheCreate
  )
}

export function fmtCost(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`
  if (usd >= 100)  return `$${usd.toFixed(0)}`
  if (usd >= 1)    return `$${usd.toFixed(2)}`
  if (usd >= 0.01) return `$${usd.toFixed(3)}`
  return "<$0.01"
}
