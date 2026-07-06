import type { CurrencyPair } from './currency'
import type { Money } from './money'

export type ForwardStatus = 'open' | 'settled' | 'cancelled'

export interface ForwardContract {
  id: string
  reference: string
  clientId: string
  pair: CurrencyPair
  /** Rate locked at booking. */
  lockedRate: number
  midRateAtBooking: number
  spreadBps: number
  notional: Money // sell-side notional
  buyAmount: Money
  bookingDate: string
  valueDate: string
  status: ForwardStatus
  /** Indicative mark-to-market in sell currency (prototype: cosmetic). */
  mtmMinor: number
}
