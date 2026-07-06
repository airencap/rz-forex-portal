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
}

export interface ForwardService {
  list(clientId: string): Promise<ForwardContract[]>
}

export interface Balance {
  currency: Currency
  available: Money
  /** Amount reserved against booked-but-unfunded payments. */
  pending: Money
}

export interface AccountService {
  getBalances(clientId: string): Promise<Balance[]>
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

export interface Services {
  rates: RateService
  payments: PaymentService
  beneficiaries: BeneficiaryService
  forwards: ForwardService
  accounts: AccountService
  clients: ClientService
}
