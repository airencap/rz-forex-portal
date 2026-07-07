import type { CurrencyPair } from './currency'
import type { Money } from './money'

export type QuoteKind = 'spot' | 'forward'

/** Which leg the client fixed: 'sell' = "I want to send X", 'buy' = "beneficiary must receive Y". */
export type FixedSide = 'sell' | 'buy'

export interface QuoteRequest {
  clientId: string
  pair: CurrencyPair
  fixedSide: FixedSide
  /** Amount of the fixed side, in minor units of that side's currency. */
  amountMinor: number
  kind: QuoteKind
  /** Required for forwards: ISO date, up to 12 months out. */
  valueDate?: string
}

export interface Quote {
  id: string
  clientId: string
  pair: CurrencyPair
  kind: QuoteKind
  fixedSide: FixedSide
  sellAmount: Money
  buyAmount: Money
  /** Rate the client deals at (after spread, incl. forward points for forwards). */
  clientRate: number
  /** Mid-market reference rate at quote time. */
  midRate: number
  spreadBps: number
  /** Forward points adjustment applied on top of spot client rate (0 for spot). */
  forwardPoints: number
  /** Fixed fee, charged in sell currency. */
  fee: Money
  /** Spread cost in sell currency, for total-cost transparency. */
  spreadCost: Money
  valueDate: string
  createdAt: string
  expiresAt: string
}

export function quoteSecondsLeft(q: Quote, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(q.expiresAt).getTime() - now) / 1000))
}

export function isQuoteExpired(q: Quote, now: number = Date.now()): boolean {
  return quoteSecondsLeft(q, now) <= 0
}
