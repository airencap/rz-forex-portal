import {
  toMinor,
  money,
  type Beneficiary,
  type ForwardContract,
  type Payment,
  type PaymentState,
  type Quote,
  type StateChange,
} from '../../domain'
import type { Balance, ClientEntity } from '../types'

/**
 * Seeded in-memory book. Deterministic so demos are repeatable; volumes are
 * lumpy and month-end heavy like a real importer's book.
 */

export const clients: ClientEntity[] = [
  {
    id: 'cl-meridian',
    name: 'Meridian Building Supplies',
    segment: 'Construction materials importer',
    tierSpreadBps: 50,
    frequentPairs: [
      { sell: 'AUD', buy: 'NPR' },
      { sell: 'AUD', buy: 'USD' },
      { sell: 'AUD', buy: 'JPY' },
    ],
  },
  {
    id: 'cl-himalaya',
    name: 'Himalaya Remit Partners',
    segment: 'Remittance partner',
    tierSpreadBps: 35,
    frequentPairs: [
      { sell: 'AUD', buy: 'NPR' },
      { sell: 'AUD', buy: 'LKR' },
    ],
  },
  {
    id: 'cl-southern',
    name: 'Southern Cross Manufacturing',
    segment: 'Manufacturing importer',
    tierSpreadBps: 50,
    frequentPairs: [
      { sell: 'AUD', buy: 'JPY' },
      { sell: 'AUD', buy: 'EUR' },
      { sell: 'AUD', buy: 'USD' },
    ],
  },
]

export const beneficiaries: Beneficiary[] = [
  {
    id: 'bn-gorkha',
    clientId: 'cl-meridian',
    name: 'Gorkha Cement Industries Pvt Ltd',
    currency: 'NPR',
    country: 'Nepal',
    bankName: 'Nabil Bank',
    accountNumber: '0170010012345678',
    routingCode: 'NABIL-KTM-017',
    verified: true,
    createdAt: '2026-02-11T02:10:00Z',
  },
  {
    id: 'bn-annapurna',
    clientId: 'cl-meridian',
    name: 'Annapurna Steel & Rebar',
    currency: 'NPR',
    country: 'Nepal',
    bankName: 'Global IME Bank',
    accountNumber: '2050087700114455',
    routingCode: 'GLBB-PKR-205',
    verified: true,
    createdAt: '2026-03-02T22:45:00Z',
  },
  {
    id: 'bn-pacifictimber',
    clientId: 'cl-meridian',
    name: 'Pacific Timber Trading LLC',
    currency: 'USD',
    country: 'United States',
    bankName: 'First Horizon Bank',
    accountNumber: '883412907',
    routingCode: '084000026',
    verified: true,
    createdAt: '2026-01-20T01:30:00Z',
  },
  {
    id: 'bn-osaka',
    clientId: 'cl-meridian',
    name: 'Osaka Fixings KK',
    currency: 'JPY',
    country: 'Japan',
    bankName: 'MUFG Bank',
    accountNumber: '7654321',
    routingCode: '0005-231',
    verified: false,
    createdAt: '2026-06-18T04:05:00Z',
  },
  {
    id: 'bn-everest',
    clientId: 'cl-himalaya',
    name: 'Everest Payout Network',
    currency: 'NPR',
    country: 'Nepal',
    bankName: 'NIC Asia Bank',
    accountNumber: '4411002233445566',
    routingCode: 'NICA-KTM-044',
    verified: true,
    createdAt: '2025-11-05T00:00:00Z',
  },
  {
    id: 'bn-colombo',
    clientId: 'cl-himalaya',
    name: 'Colombo Disbursements Ltd',
    currency: 'LKR',
    country: 'Sri Lanka',
    bankName: 'Commercial Bank of Ceylon',
    accountNumber: '8001234567',
    routingCode: 'CCEYLKLX',
    verified: true,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'bn-nagoya',
    clientId: 'cl-southern',
    name: 'Nagoya Precision Tooling KK',
    currency: 'JPY',
    country: 'Japan',
    bankName: 'Sumitomo Mitsui Banking',
    accountNumber: '1122334',
    routingCode: '0009-540',
    verified: true,
    createdAt: '2026-02-27T03:20:00Z',
  },
  {
    id: 'bn-stuttgart',
    clientId: 'cl-southern',
    name: 'Stuttgart Antriebstechnik GmbH',
    currency: 'EUR',
    country: 'Germany',
    bankName: 'Commerzbank',
    accountNumber: 'DE89370400440532013000',
    routingCode: 'COBADEFFXXX',
    verified: true,
    createdAt: '2026-03-14T09:00:00Z',
  },
]

let refCounter = 158
export function nextReference(): string {
  refCounter += 1
  return `RZ-2026-${String(refCounter).padStart(6, '0')}`
}

let idCounter = 1000
export function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

interface SeedPayment {
  clientId: string
  beneficiaryId: string
  sellMajor: number
  clientRate: number
  midRate: number
  spreadBps: number
  state: PaymentState
  createdAt: string
  kind?: 'spot' | 'forward'
  valueDate?: string
}

function historyFor(state: PaymentState, createdAt: string): StateChange[] {
  const t0 = new Date(createdAt).getTime()
  const step = (n: number) => new Date(t0 + n * 3600_000).toISOString()
  const chain: StateChange[] = [{ state: 'booked', at: step(0) }]
  const push = (s: PaymentState, hours: number) => chain.push({ state: s, at: step(hours) })
  switch (state) {
    case 'booked':
      break
    case 'funds_pending':
      push('funds_pending', 1)
      break
    case 'in_flight':
      push('funds_pending', 1)
      push('in_flight', 5)
      break
    case 'settled':
      push('funds_pending', 1)
      push('in_flight', 5)
      push('settled', 26)
      break
    case 'failed':
      push('funds_pending', 1)
      push('failed', 4)
      break
    case 'returned':
      push('funds_pending', 1)
      push('in_flight', 5)
      push('returned', 49)
      break
    case 'cancelled':
      push('cancelled', 2)
      break
    case 'draft':
    case 'quoted':
      break
  }
  return chain
}

function buildPayment(seed: SeedPayment, n: number): Payment {
  const bene = beneficiaries.find((b) => b.id === seed.beneficiaryId)
  if (!bene) throw new Error(`unknown beneficiary ${seed.beneficiaryId}`)
  const sellMinor = toMinor('AUD', seed.sellMajor)
  const feeMinor = toMinor('AUD', 10)
  const convertedMajor = (sellMinor - feeMinor) / 100
  const buyMinor = toMinor(bene.currency, convertedMajor * seed.clientRate)
  return {
    id: `pm-seed-${n}`,
    reference: `RZ-2026-${String(100 + n).padStart(6, '0')}`,
    clientId: seed.clientId,
    beneficiaryId: bene.id,
    beneficiaryName: bene.name,
    pair: { sell: 'AUD', buy: bene.currency },
    kind: seed.kind ?? 'spot',
    sellAmount: money('AUD', sellMinor),
    buyAmount: money(bene.currency, buyMinor),
    clientRate: seed.clientRate,
    midRate: seed.midRate,
    spreadBps: seed.spreadBps,
    fee: money('AUD', feeMinor),
    state: seed.state,
    history: historyFor(seed.state, seed.createdAt),
    valueDate: seed.valueDate ?? seed.createdAt.slice(0, 10),
    createdAt: seed.createdAt,
    funding: fundingFor(seed.clientId),
  }
}

export function fundingFor(clientId: string): {
  accountName: string
  bsb: string
  accountNumber: string
  reference: string
} {
  const suffix = clientId === 'cl-meridian' ? '7301' : clientId === 'cl-himalaya' ? '7302' : '7303'
  return {
    accountName: 'AW Fintech Client Segregated A/C',
    bsb: '062-000',
    accountNumber: `1140 ${suffix}`,
    reference: clientId.replace('cl-', 'RZ-').toUpperCase(),
  }
}

// Month-end heavy, lumpy — a real importer's book.
const seedPayments: SeedPayment[] = [
  // April 2026 month-end run
  { clientId: 'cl-meridian', beneficiaryId: 'bn-gorkha', sellMajor: 184_500, clientRate: 88.71, midRate: 89.16, spreadBps: 50, state: 'settled', createdAt: '2026-04-28T00:40:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-annapurna', sellMajor: 96_200, clientRate: 88.74, midRate: 89.19, spreadBps: 50, state: 'settled', createdAt: '2026-04-29T03:15:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-pacifictimber', sellMajor: 42_000, clientRate: 0.6571, midRate: 0.6604, spreadBps: 50, state: 'settled', createdAt: '2026-04-30T01:05:00Z' },
  // mid-May trickle
  { clientId: 'cl-meridian', beneficiaryId: 'bn-gorkha', sellMajor: 23_750, clientRate: 88.9, midRate: 89.35, spreadBps: 50, state: 'settled', createdAt: '2026-05-14T02:20:00Z' },
  // May month-end run
  { clientId: 'cl-meridian', beneficiaryId: 'bn-gorkha', sellMajor: 210_000, clientRate: 89.02, midRate: 89.47, spreadBps: 50, state: 'settled', createdAt: '2026-05-28T00:55:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-annapurna', sellMajor: 71_400, clientRate: 89.0, midRate: 89.45, spreadBps: 50, state: 'returned', createdAt: '2026-05-29T04:30:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-pacifictimber', sellMajor: 55_800, clientRate: 0.6588, midRate: 0.6621, spreadBps: 50, state: 'settled', createdAt: '2026-05-29T06:10:00Z' },
  // June month-end run
  { clientId: 'cl-meridian', beneficiaryId: 'bn-gorkha', sellMajor: 168_300, clientRate: 88.95, midRate: 89.4, spreadBps: 50, state: 'settled', createdAt: '2026-06-26T01:45:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-annapurna', sellMajor: 88_000, clientRate: 88.97, midRate: 89.42, spreadBps: 50, state: 'settled', createdAt: '2026-06-29T00:30:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-osaka', sellMajor: 31_600, clientRate: 97.02, midRate: 97.51, spreadBps: 50, state: 'failed', createdAt: '2026-06-29T05:50:00Z' },
  // early July — live activity for the demo
  { clientId: 'cl-meridian', beneficiaryId: 'bn-pacifictimber', sellMajor: 27_900, clientRate: 0.6579, midRate: 0.6612, spreadBps: 50, state: 'in_flight', createdAt: '2026-07-03T02:05:00Z' },
  { clientId: 'cl-meridian', beneficiaryId: 'bn-gorkha', sellMajor: 64_250, clientRate: 88.98, midRate: 89.43, spreadBps: 50, state: 'funds_pending', createdAt: '2026-07-05T23:10:00Z' },
  // other clients, for the entity switcher
  { clientId: 'cl-himalaya', beneficiaryId: 'bn-everest', sellMajor: 402_000, clientRate: 89.11, midRate: 89.42, spreadBps: 35, state: 'settled', createdAt: '2026-06-30T00:20:00Z' },
  { clientId: 'cl-himalaya', beneficiaryId: 'bn-colombo', sellMajor: 150_500, clientRate: 199.15, midRate: 199.85, spreadBps: 35, state: 'in_flight', createdAt: '2026-07-02T01:35:00Z' },
  { clientId: 'cl-southern', beneficiaryId: 'bn-nagoya', sellMajor: 92_700, clientRate: 97.12, midRate: 97.61, spreadBps: 50, state: 'settled', createdAt: '2026-06-27T03:00:00Z' },
  { clientId: 'cl-southern', beneficiaryId: 'bn-stuttgart', sellMajor: 118_000, clientRate: 0.6104, midRate: 0.6135, spreadBps: 50, state: 'funds_pending', createdAt: '2026-07-04T22:40:00Z' },
]

export const payments: Payment[] = seedPayments.map(buildPayment)

export const forwards: ForwardContract[] = [
  {
    id: 'fw-1001',
    reference: 'RZF-2026-000031',
    clientId: 'cl-meridian',
    pair: { sell: 'AUD', buy: 'NPR' },
    lockedRate: 89.61,
    midRateAtBooking: 89.3,
    spreadBps: 50,
    notional: money('AUD', toMinor('AUD', 250_000)),
    buyAmount: money('NPR', toMinor('NPR', 250_000 * 89.61)),
    bookingDate: '2026-05-12',
    valueDate: '2026-07-15',
    status: 'open',
    mtmMinor: toMinor('AUD', 1_840),
  },
  {
    id: 'fw-1002',
    reference: 'RZF-2026-000038',
    clientId: 'cl-meridian',
    pair: { sell: 'AUD', buy: 'USD' },
    lockedRate: 0.6549,
    midRateAtBooking: 0.6598,
    spreadBps: 50,
    notional: money('AUD', toMinor('AUD', 80_000)),
    buyAmount: money('USD', toMinor('USD', 80_000 * 0.6549)),
    bookingDate: '2026-06-03',
    valueDate: '2026-09-30',
    status: 'open',
    mtmMinor: toMinor('AUD', -620),
  },
]

export const balances: Record<string, Balance[]> = {
  'cl-meridian': [
    { currency: 'AUD', available: money('AUD', toMinor('AUD', 482_350.4)), pending: money('AUD', toMinor('AUD', 64_260)) },
    { currency: 'NPR', available: money('NPR', toMinor('NPR', 1_254_000)), pending: money('NPR', 0) },
    { currency: 'USD', available: money('USD', toMinor('USD', 12_580.25)), pending: money('USD', 0) },
    { currency: 'JPY', available: money('JPY', 0), pending: money('JPY', 0) },
  ],
  'cl-himalaya': [
    { currency: 'AUD', available: money('AUD', toMinor('AUD', 1_206_900)), pending: money('AUD', 0) },
    { currency: 'NPR', available: money('NPR', toMinor('NPR', 8_420_000)), pending: money('NPR', 0) },
    { currency: 'LKR', available: money('LKR', toMinor('LKR', 2_150_000)), pending: money('LKR', 0) },
  ],
  'cl-southern': [
    { currency: 'AUD', available: money('AUD', toMinor('AUD', 318_240.8)), pending: money('AUD', toMinor('AUD', 118_010)) },
    { currency: 'JPY', available: money('JPY', toMinor('JPY', 1_480_000)), pending: money('JPY', 0) },
    { currency: 'EUR', available: money('EUR', toMinor('EUR', 22_310.5)), pending: money('EUR', 0) },
  ],
}

/** Live quotes issued this session, by id. */
export const quotes = new Map<string, Quote>()
