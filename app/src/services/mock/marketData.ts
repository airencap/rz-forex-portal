import { pairKey, type CurrencyPair } from '../../domain'
import { mulberry32 } from './prng'

/** Base mid-market rates for AUD corridors (prototype reference levels). */
const BASE_MIDS: Record<string, number> = {
  'AUD/NPR': 89.42,
  'AUD/JPY': 97.61,
  'AUD/USD': 0.6612,
  'AUD/LKR': 199.85,
  'AUD/EUR': 0.6135,
  'AUD/GBP': 0.5218,
}

/**
 * Small random-walk drift simulator so rates tick realistically during demos.
 * Deterministic per session start; ticks every 2s.
 */
const rand = mulberry32(20260706)
const current: Record<string, number> = { ...BASE_MIDS }
const previous: Record<string, number> = { ...BASE_MIDS }

const TICK_MS = 2000
let lastTick = Date.now()

function tickIfDue(): void {
  const now = Date.now()
  if (now - lastTick < TICK_MS) return
  lastTick = now
  for (const key of Object.keys(current)) {
    previous[key] = current[key]
    // walk within ±4bps per tick, mean-revert gently toward base
    const drift = (rand() - 0.5) * 8e-4
    const reversion = (BASE_MIDS[key] - current[key]) * 0.02
    current[key] = current[key] * (1 + drift) + reversion
  }
}

export function midRate(pair: CurrencyPair): number {
  tickIfDue()
  const key = pairKey(pair)
  const rate = current[key]
  if (rate === undefined) throw new Error(`Unsupported corridor: ${key}`)
  return rate
}

export function rateDirection(pair: CurrencyPair): 'up' | 'down' | 'flat' {
  const key = pairKey(pair)
  const diff = current[key] - previous[key]
  if (Math.abs(diff) < 1e-9) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

/**
 * Forward points: indicative monthly carry per corridor, in bps of the spot
 * rate per month to value date. Prototype-grade approximation.
 */
const MONTHLY_CARRY_BPS: Record<string, number> = {
  'AUD/NPR': 32,
  'AUD/JPY': -28,
  'AUD/USD': -9,
  'AUD/LKR': 41,
  'AUD/EUR': -14,
  'AUD/GBP': -6,
}

export function forwardPointsFor(pair: CurrencyPair, spotClientRate: number, valueDate: string): number {
  const months = Math.max(0, (new Date(valueDate).getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000))
  const carryBps = MONTHLY_CARRY_BPS[pairKey(pair)] ?? 0
  return spotClientRate * (carryBps / 10_000) * months
}
