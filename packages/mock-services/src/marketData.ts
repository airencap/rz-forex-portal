import { MINOR_EXPONENT, type Currency, type CurrencyPair } from '@rz/domain'
import { mulberry32 } from './prng'

/**
 * Mock market data, currency-agnostic: mids are held per currency as
 * "units per 1 AUD" and any cross rate is derived, so a client can fund a
 * payment from any virtual-account currency.
 */
const BASE_PER_AUD: Record<Currency, number> = {
  AUD: 1,
  NPR: 89.42,
  JPY: 97.61,
  USD: 0.6612,
  LKR: 199.85,
  EUR: 0.6135,
  GBP: 0.5218,
}

const rand = mulberry32(20260706)
const current: Record<Currency, number> = { ...BASE_PER_AUD }
const previous: Record<Currency, number> = { ...BASE_PER_AUD }

const TICK_MS = 2000
let lastTick = Date.now()

function tickIfDue(): void {
  const now = Date.now()
  if (now - lastTick < TICK_MS) return
  lastTick = now
  for (const key of Object.keys(current) as Currency[]) {
    if (key === 'AUD') continue // AUD is the numéraire
    previous[key] = current[key]
    // walk within ±4bps per tick, mean-revert gently toward base
    const drift = (rand() - 0.5) * 8e-4
    const reversion = (BASE_PER_AUD[key] - current[key]) * 0.02
    current[key] = current[key] * (1 + drift) + reversion
  }
}

/** Mid-market rate: units of `buy` per 1 unit of `sell`, for any pair. */
export function midRate(pair: CurrencyPair): number {
  tickIfDue()
  return current[pair.buy] / current[pair.sell]
}

export function rateDirection(pair: CurrencyPair): 'up' | 'down' | 'flat' {
  const now = current[pair.buy] / current[pair.sell]
  const before = previous[pair.buy] / previous[pair.sell]
  const diff = now - before
  if (Math.abs(diff) < 1e-9) return 'flat'
  return diff > 0 ? 'up' : 'down'
}

/**
 * Indicative monthly carry per currency in bps (AUD = 0 baseline). A pair's
 * forward points derive from the carry differential of its two legs.
 */
const MONTHLY_CARRY_BPS: Record<Currency, number> = {
  AUD: 0,
  NPR: 32,
  JPY: -28,
  USD: -9,
  LKR: 41,
  EUR: -14,
  GBP: -6,
}

export function forwardPointsFor(pair: CurrencyPair, spotClientRate: number, valueDate: string): number {
  const months = Math.max(0, (new Date(valueDate).getTime() - Date.now()) / (30.44 * 24 * 3600 * 1000))
  const carryBps = MONTHLY_CARRY_BPS[pair.buy] - MONTHLY_CARRY_BPS[pair.sell]
  return spotClientRate * (carryBps / 10_000) * months
}

/** Convert an amount in minor units between currencies at the current mid. */
export function convertMinor(from: Currency, to: Currency, minor: number): number {
  if (from === to) return minor
  const major = minor / 10 ** MINOR_EXPONENT[from]
  return Math.round(major * midRate({ sell: from, buy: to }) * 10 ** MINOR_EXPONENT[to])
}
