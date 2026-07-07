import type {
  Beneficiary,
  Currency,
  CurrencyPair,
  ForwardContract,
  Money,
  Payment,
  PaymentState,
  Quote,
  QuoteRequest,
} from '../domain'

/**
 * The service layer contract. UI code depends ONLY on these interfaces;
 * the mock implementations in ./mock are swapped for Banking Circle-backed
 * ones later without touching components.
 */

export interface IndicativeRate {
  pair: CurrencyPair
  midRate: number
  clientRate: number
  /** Change vs previous tick, for up/down flashes. */
  direction: 'up' | 'down' | 'flat'
  asOf: string
}

export interface RateService {
  getIndicativeRates(pairs: CurrencyPair[], clientId: string): Promise<IndicativeRate[]>
  getQuote(request: QuoteRequest): Promise<Quote>
  /** Books a live quote. Rejects if the quote has expired — expired quotes must be re-requested. */
  bookQuote(quoteId: string, beneficiaryId: string): Promise<Payment>
}

export interface PaymentFilter {
  clientId: string
  states?: PaymentState[]
}

export interface PaymentService {
  list(filter: PaymentFilter): Promise<Payment[]>
  get(id: string): Promise<Payment>
  /** Mock-only demo advancer: moves a payment to the next happy-path state. */
  advance(id: string): Promise<Payment>
  cancel(id: string): Promise<Payment>
}

export interface NewBeneficiary {
  clientId: string
  name: string
  currency: Currency
  country: string
  bankName: string
  accountNumber: string
  routingCode: string
}

export interface BeneficiaryService {
  list(clientId: string, currency?: Currency): Promise<Beneficiary[]>
  create(input: NewBeneficiary): Promise<Beneficiary>
  /** Updating bank details resets verification. */
  update(id: string, input: NewBeneficiary): Promise<Beneficiary>
  /** Mock verification flow — marks the beneficiary verified. */
  verify(id: string): Promise<Beneficiary>
}

export interface ForwardService {
  list(clientId: string): Promise<ForwardContract[]>
  /** Books a live forward quote into an open contract. Rejects expired quotes. */
  book(quoteId: string, beneficiaryId: string): Promise<ForwardContract>
  /**
   * Draws down part (or all) of an open contract at the locked rate,
   * creating a payment that enters the state machine.
   */
  drawdown(id: string, sellAmountMinor: number): Promise<{ contract: ForwardContract; payment: Payment }>
}

export interface Balance {
  currency: Currency
  available: Money
  /** Amount reserved against booked-but-unfunded payments. */
  pending: Money
}

export interface StatementEntry {
  date: string
  description: string
  reference: string
  /** Exactly one of debit/credit is set, except the opening-balance row. */
  debit: Money | null
  credit: Money | null
  /** Running balance after this entry. */
  balance: Money
}

export interface StatementRange {
  from: string // ISO date, inclusive
  to: string // ISO date, inclusive
}

export interface Statement {
  currency: Currency
  range: StatementRange
  opening: Money
  closing: Money
  entries: StatementEntry[]
}

export interface AccountService {
  getBalances(clientId: string): Promise<Balance[]>
  getStatement(clientId: string, currency: Currency, range: StatementRange): Promise<Statement>
}

export interface ClientEntity {
  id: string
  name: string
  segment: string
  tierSpreadBps: number
  frequentPairs: CurrencyPair[]
}

export interface ClientService {
  getClients(): Promise<ClientEntity[]>
}

export interface RevenueLine {
  key: string
  label: string
  /** Spread income in AUD minor units, reproduced from per-trade pricing snapshots. */
  spreadMinor: number
  feeMinor: number
  /** Sell-side volume in AUD minor units. */
  volumeMinor: number
  trades: number
}

export interface RevenueReport {
  range: StatementRange
  totals: Omit<RevenueLine, 'key' | 'label'>
  byCorridor: RevenueLine[]
  byClient: RevenueLine[]
}

/** Ops-only surface: cross-client monitoring, tiers and revenue. */
export interface AdminService {
  setTier(clientId: string, spreadBps: number): Promise<ClientEntity>
  listAllPayments(): Promise<Array<Payment & { clientName: string }>>
  getRevenue(range: StatementRange): Promise<RevenueReport>
}

export interface ApprovalRule {
  enabled: boolean
  /** Payments with sell amount above this (AUD minor units) need a second approval. */
  thresholdMinor: number
}

export interface ApprovalService {
  getRule(clientId: string): Promise<ApprovalRule>
  setRule(clientId: string, rule: ApprovalRule): Promise<ApprovalRule>
  listPending(clientId: string): Promise<Payment[]>
  approve(paymentId: string, approver: string): Promise<Payment>
  /** Rejection cancels the payment. */
  reject(paymentId: string, approver: string): Promise<Payment>
}

export interface Services {
  rates: RateService
  payments: PaymentService
  beneficiaries: BeneficiaryService
  forwards: ForwardService
  accounts: AccountService
  clients: ClientService
  admin: AdminService
  approvals: ApprovalService
}
