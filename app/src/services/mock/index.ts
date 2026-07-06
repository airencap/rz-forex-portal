import {
  canTransition,
  HAPPY_PATH,
  isQuoteExpired,
  money,
  toMinor,
  type Beneficiary,
  type Payment,
  type PaymentState,
  type Quote,
  type QuoteRequest,
} from '../../domain'
import type {
  AccountService,
  Balance,
  BeneficiaryService,
  ClientEntity,
  ClientService,
  ForwardService,
  IndicativeRate,
  NewBeneficiary,
  PaymentFilter,
  PaymentService,
  RateService,
  Services,
} from '../types'
import * as db from './db'
import { forwardPointsFor, midRate, rateDirection } from './marketData'

const LATENCY_MS = 250
const QUOTE_VALIDITY_S = 30
const FIXED_FEE_AUD_MINOR = toMinor('AUD', 10)

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), LATENCY_MS))
}

function spreadBpsFor(clientId: string): number {
  return db.clients.find((c) => c.id === clientId)?.tierSpreadBps ?? 50
}

function priceQuote(req: QuoteRequest): Quote {
  const now = Date.now()
  const mid = midRate(req.pair)
  const spreadBps = spreadBpsFor(req.clientId)
  // client sells AUD to buy foreign: client rate is mid less the spread
  const spotClientRate = mid * (1 - spreadBps / 10_000)
  const valueDate =
    req.kind === 'forward' && req.valueDate ? req.valueDate : new Date(now).toISOString().slice(0, 10)
  const forwardPoints = req.kind === 'forward' ? forwardPointsFor(req.pair, spotClientRate, valueDate) : 0
  const clientRate = spotClientRate + forwardPoints

  let sellMinor: number
  let buyMinor: number
  if (req.fixedSide === 'sell') {
    sellMinor = req.amountMinor
    const convertedMajor = Math.max(0, sellMinor - FIXED_FEE_AUD_MINOR) / 100
    buyMinor = toMinor(req.pair.buy, convertedMajor * clientRate)
  } else {
    buyMinor = req.amountMinor
    const buyMajor = buyMinor / 10 ** (req.pair.buy === 'JPY' ? 0 : 2)
    sellMinor = toMinor(req.pair.sell, buyMajor / clientRate) + FIXED_FEE_AUD_MINOR
  }

  // spread cost in sell ccy: what the mid would have bought vs what client gets
  const convertedMajor = Math.max(0, sellMinor - FIXED_FEE_AUD_MINOR) / 100
  const midEquivalentMinor = toMinor(req.pair.buy, convertedMajor * (mid + forwardPoints))
  const spreadCostMinor = toMinor(
    req.pair.sell,
    (midEquivalentMinor - buyMinor) / 10 ** (req.pair.buy === 'JPY' ? 0 : 2) / (mid + forwardPoints),
  )

  const quote: Quote = {
    id: db.nextId('qt'),
    clientId: req.clientId,
    pair: req.pair,
    kind: req.kind,
    fixedSide: req.fixedSide,
    sellAmount: money(req.pair.sell, sellMinor),
    buyAmount: money(req.pair.buy, buyMinor),
    clientRate,
    midRate: mid,
    spreadBps,
    forwardPoints,
    fee: money(req.pair.sell, FIXED_FEE_AUD_MINOR),
    spreadCost: money(req.pair.sell, spreadCostMinor),
    valueDate,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_VALIDITY_S * 1000).toISOString(),
  }
  db.quotes.set(quote.id, quote)
  return quote
}

const rates: RateService = {
  async getIndicativeRates(pairs, clientId) {
    const spreadBps = spreadBpsFor(clientId)
    const result: IndicativeRate[] = pairs.map((pair) => {
      const mid = midRate(pair)
      return {
        pair,
        midRate: mid,
        clientRate: mid * (1 - spreadBps / 10_000),
        direction: rateDirection(pair),
        asOf: new Date().toISOString(),
      }
    })
    return delay(result)
  },

  async getQuote(request) {
    if (request.amountMinor <= 0) throw new Error('Amount must be positive')
    if (request.kind === 'forward' && !request.valueDate)
      throw new Error('Forward quotes require a value date')
    return delay(priceQuote(request))
  },

  async bookQuote(quoteId, beneficiaryId) {
    const quote = db.quotes.get(quoteId)
    if (!quote) throw new Error('Quote not found')
    if (isQuoteExpired(quote))
      throw new Error('Quote has expired — request a new quote to continue')
    const bene = db.beneficiaries.find((b) => b.id === beneficiaryId)
    if (!bene) throw new Error('Beneficiary not found')
    if (bene.currency !== quote.pair.buy)
      throw new Error('Beneficiary currency does not match quote')

    const now = new Date().toISOString()
    const payment: Payment = {
      id: db.nextId('pm'),
      reference: db.nextReference(),
      clientId: quote.clientId,
      beneficiaryId: bene.id,
      beneficiaryName: bene.name,
      pair: quote.pair,
      kind: quote.kind,
      sellAmount: quote.sellAmount,
      buyAmount: quote.buyAmount,
      clientRate: quote.clientRate,
      midRate: quote.midRate,
      spreadBps: quote.spreadBps,
      fee: quote.fee,
      state: 'booked',
      history: [{ state: 'booked', at: now }],
      valueDate: quote.valueDate,
      createdAt: now,
      funding: db.fundingFor(quote.clientId),
    }
    db.payments.unshift(payment)
    db.quotes.delete(quoteId)
    return delay(payment)
  },
}

function transition(payment: Payment, to: PaymentState): Payment {
  if (!canTransition(payment.state, to))
    throw new Error(`Illegal transition ${payment.state} → ${to}`)
  payment.state = to
  payment.history.push({ state: to, at: new Date().toISOString() })
  return payment
}

const payments: PaymentService = {
  async list(filter: PaymentFilter) {
    let result = db.payments.filter((p) => p.clientId === filter.clientId)
    if (filter.states) result = result.filter((p) => filter.states!.includes(p.state))
    result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return delay(result)
  },

  async get(id) {
    const p = db.payments.find((x) => x.id === id)
    if (!p) throw new Error('Payment not found')
    return delay(p)
  },

  async advance(id) {
    const p = db.payments.find((x) => x.id === id)
    if (!p) throw new Error('Payment not found')
    const idx = HAPPY_PATH.indexOf(p.state)
    if (idx < 0 || idx === HAPPY_PATH.length - 1)
      throw new Error(`Payment in state "${p.state}" cannot be advanced`)
    return delay(transition(p, HAPPY_PATH[idx + 1]))
  },

  async cancel(id) {
    const p = db.payments.find((x) => x.id === id)
    if (!p) throw new Error('Payment not found')
    return delay(transition(p, 'cancelled'))
  },
}

const beneficiaryService: BeneficiaryService = {
  async list(clientId, currency) {
    let result = db.beneficiaries.filter((b) => b.clientId === clientId)
    if (currency) result = result.filter((b) => b.currency === currency)
    return delay(result)
  },

  async create(input: NewBeneficiary) {
    if (!input.name.trim() || !input.bankName.trim() || !input.accountNumber.trim())
      throw new Error('Name, bank and account number are required')
    const bene: Beneficiary = {
      id: db.nextId('bn'),
      clientId: input.clientId,
      name: input.name.trim(),
      currency: input.currency,
      country: input.country.trim(),
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      routingCode: input.routingCode.trim(),
      verified: false,
      createdAt: new Date().toISOString(),
    }
    db.beneficiaries.push(bene)
    return delay(bene)
  },
}

const forwards: ForwardService = {
  async list(clientId) {
    return delay(db.forwards.filter((f) => f.clientId === clientId))
  },
}

const accounts: AccountService = {
  async getBalances(clientId) {
    const result: Balance[] = db.balances[clientId] ?? []
    return delay(result)
  },
}

const clientService: ClientService = {
  async getClients() {
    const result: ClientEntity[] = db.clients
    return delay(result)
  },
}

export function createMockServices(): Services {
  return {
    rates,
    payments,
    beneficiaries: beneficiaryService,
    forwards,
    accounts,
    clients: clientService,
  }
}
