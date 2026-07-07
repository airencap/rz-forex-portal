import type { CurrencyPair } from './currency'
import type { Money } from './money'

export type ForwardStatus = 'open' | 'settled' | 'cancelled'

export interface ForwardContract {
  id: string
  reference: string
  clientId: string
  pair: CurrencyPair
  beneficiaryId: string
  beneficiaryName: string
  /** Rate locked at booking (incl. forward points). */
  lockedRate: number
  midRateAtBooking: number
  spreadBps: number
  notional: Money // sell-side notional
  buyAmount: Money
  /** Sell-side amount already drawn down, in minor units. */
  drawnDownMinor: number
  bookingDate: string
  valueDate: string
  status: ForwardStatus
  /** Indicative mark-to-market in sell currency (prototype: cosmetic). */
  mtmMinor: number
}

export function forwardRemainingMinor(f: ForwardContract): number {
  return Math.max(0, f.notional.minor - f.drawnDownMinor)
}

export function forwardUtilization(f: ForwardContract): number {
  return f.notional.minor === 0 ? 0 : f.drawnDownMinor / f.notional.minor
}
