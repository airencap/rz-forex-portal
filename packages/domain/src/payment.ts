import type { CurrencyPair } from './currency'
import type { Money } from './money'
import type { QuoteKind } from './quote'

export const PAYMENT_STATES = [
  'draft',
  'quoted',
  'booked',
  'funds_pending',
  'in_flight',
  'settled',
  'failed',
  'cancelled',
  'returned',
] as const
export type PaymentState = (typeof PAYMENT_STATES)[number]

/** Explicit state machine — the only legal transitions. */
export const PAYMENT_TRANSITIONS: Record<PaymentState, readonly PaymentState[]> = {
  draft: ['quoted', 'cancelled'],
  quoted: ['booked', 'cancelled'],
  booked: ['funds_pending', 'cancelled'],
  funds_pending: ['in_flight', 'cancelled', 'failed'],
  in_flight: ['settled', 'failed', 'returned'],
  settled: [],
  failed: [],
  cancelled: [],
  returned: [],
}

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to)
}

/** The happy path shown on the tracker timeline. */
export const HAPPY_PATH: readonly PaymentState[] = [
  'booked',
  'funds_pending',
  'in_flight',
  'settled',
]

export const STATE_LABELS: Record<PaymentState, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  booked: 'Booked',
  funds_pending: 'Awaiting funds',
  in_flight: 'In flight',
  settled: 'Settled',
  failed: 'Failed',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

export interface StateChange {
  state: PaymentState
  at: string
}

/**
 * Virtual-account details the client transfers into to fund a payment.
 * Field shapes differ per funding currency (BSB for AUD, ACH routing for
 * USD, IBAN for EUR, …), so details are label/value pairs.
 */
export interface FundingInstructions {
  accountName: string
  reference: string
  currency: string
  fields: Array<{ label: string; value: string }>
}

/**
 * Second-approval metadata. Approval is a gate on top of the state machine,
 * not a state: a payment sits in `booked` and cannot advance until approved.
 */
export interface PaymentApproval {
  status: 'pending' | 'approved' | 'rejected'
  thresholdMinor: number
  decidedBy?: string
  decidedAt?: string
}

export interface Payment {
  id: string
  /** Human booking reference, e.g. RZ-2026-000141 */
  reference: string
  clientId: string
  beneficiaryId: string
  beneficiaryName: string
  pair: CurrencyPair
  kind: QuoteKind
  sellAmount: Money
  buyAmount: Money
  /** Pricing snapshot — ledger must reproduce revenue per trade. */
  clientRate: number
  midRate: number
  spreadBps: number
  fee: Money
  state: PaymentState
  /** Present when the client's approval rule caught this payment. */
  approval?: PaymentApproval
  history: StateChange[]
  valueDate: string
  createdAt: string
  funding: FundingInstructions
}
