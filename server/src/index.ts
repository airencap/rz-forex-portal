import cors from '@fastify/cors'
import {
  CURRENCIES,
  type Currency,
  type CurrencyPair,
  type QuoteRequest,
  type RailExecution,
  type RailStatus,
} from '@rz/domain'
import { createMockServices } from '@rz/mock-services'
import Fastify from 'fastify'
import { fileURLToPath } from 'node:url'
import { noah, noahConfigured, type PricesQuery } from './noah/client'
import { noahEvaluation } from './noah/evaluation'
import { executePayout, getTransaction, preparePayout, type PreparePayoutRequest } from './noah/payouts'
import {
  eventsForTransaction,
  recentEvents,
  recordEvent,
  verifyWebhookSignature,
  type NoahWebhookEvent,
} from './noah/webhooks'

// server/.env (gitignored) holds vendor sandbox secrets for local dev;
// on Render they come from the dashboard environment instead
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  /* no .env file — fine in CI/Render */
}

/**
 * RZ API — Fastify wrapper around the Services contract. Today the
 * implementation is the same deterministic mock engine the browser uses;
 * swapping in Banking Circle / ComplyAdvantage / CoP-backed services later
 * changes this one `createMockServices()` line, not the routes.
 */
const services = createMockServices()

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })

function parsePairs(raw: string): CurrencyPair[] {
  return raw
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [sell, buy] = s.split('/')
      if (!CURRENCIES.includes(sell as Currency) || !CURRENCIES.includes(buy as Currency))
        throw new Error(`Unsupported pair: ${s}`)
      return { sell: sell as Currency, buy: buy as Currency }
    })
}

// domain/validation errors surface as 400s with the message the UI shows
app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 400
  reply.status(status).send({ error: err.message })
})

app.get('/health', async () => ({ ok: true, service: 'rz-api' }))

// --- Noah (banking-rail sandbox under evaluation) ---
app.get('/api/noah/status', async () => {
  if (!noahConfigured()) return { configured: false, ok: false }
  try {
    const balances = await noah.balances()
    const count = (balances.Items ?? balances.Balances ?? []).length
    return { configured: true, ok: true, balanceCount: count }
  } catch (err) {
    return { configured: true, ok: false, error: (err as Error).message }
  }
})

app.get<{ Querystring: PricesQuery }>('/api/noah/prices', (req) => noah.prices(req.query))
app.get('/api/noah/channels', () => noah.sellChannels())
app.get('/api/noah/countries', () => noah.sellCountries())
app.get('/api/rails/noah/evaluation', () => noahEvaluation())

// --- Noah webhooks: signed deliveries drive the payment state machine ---
await app.register(async (scope) => {
  // signature verifies over the RAW body, so this scope parses to string
  scope.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) =>
    done(null, body),
  )
  scope.post('/api/webhooks/noah', async (req, reply) => {
    const rawBody = req.body as string
    const signature = req.headers['webhook-signature']
    const verified =
      typeof signature === 'string' && verifyWebhookSignature(rawBody, signature)
    if (!verified && process.env.NOAH_WEBHOOK_ALLOW_UNSIGNED !== 'true') {
      req.log.warn('noah webhook rejected: bad or missing signature')
      return reply.status(401).send({ error: 'invalid signature' })
    }
    let envelope: Parameters<typeof recordEvent>[0]
    try {
      envelope = JSON.parse(rawBody) as Parameters<typeof recordEvent>[0]
    } catch {
      return reply.status(400).send({ error: 'invalid JSON' })
    }
    const event = recordEvent(envelope, verified)
    await syncPaymentFromRailEvent(event)
    return reply.status(200).send({ received: true })
  })
})

/** Server-mode book: apply Transaction events to the matching railed payment. */
async function syncPaymentFromRailEvent(event: NoahWebhookEvent): Promise<void> {
  if (event.eventType !== 'Transaction' || !event.transactionId || !event.status) return
  const all = await services.admin.listAllPayments()
  const match = all.find((p) => p.rail?.transactionId === event.transactionId)
  if (match) await services.payments.applyRailStatus(match.id, event.status)
}

app.get<{ Querystring: { transactionId?: string } }>('/api/noah/events', (req) =>
  req.query.transactionId
    ? eventsForTransaction(req.query.transactionId)
    : recentEvents(),
)

// Noah payout rail: prepare (locked quote + recipient form) → execute (sell)
app.post<{ Body: PreparePayoutRequest }>('/api/noah/payouts/prepare', (req) =>
  preparePayout(req.body),
)
app.post<{
  Body: { formSessionId: string; cryptoAuthorizedAmount: string; fiatAmount: string; externalId: string }
}>('/api/noah/payouts/execute', (req) => executePayout(req.body))
app.get<{ Params: { id: string } }>('/api/noah/transactions/:id', (req) =>
  getTransaction(req.params.id),
)

// --- rates & quotes ---
app.get<{ Querystring: { clientId: string; pairs: string } }>('/api/rates/indicative', (req) =>
  services.rates.getIndicativeRates(parsePairs(req.query.pairs), req.query.clientId),
)
app.post<{ Body: QuoteRequest }>('/api/quotes', (req) => services.rates.getQuote(req.body))
app.post<{ Params: { id: string }; Body: { beneficiaryId: string; rail?: RailExecution } }>(
  '/api/quotes/:id/book',
  (req) => services.rates.bookQuote(req.params.id, req.body.beneficiaryId, req.body.rail),
)
app.post<{ Params: { id: string }; Body: { beneficiaryId: string } }>(
  '/api/quotes/:id/book-forward',
  (req) => services.forwards.book(req.params.id, req.body.beneficiaryId),
)

// --- payments ---
app.get<{ Querystring: { clientId: string; states?: string } }>('/api/payments', (req) =>
  services.payments.list({
    clientId: req.query.clientId,
    states: req.query.states?.split(',') as never,
  }),
)
app.get<{ Params: { id: string } }>('/api/payments/:id', (req) => services.payments.get(req.params.id))
app.post<{ Params: { id: string } }>('/api/payments/:id/advance', (req) =>
  services.payments.advance(req.params.id),
)
app.post<{ Params: { id: string } }>('/api/payments/:id/cancel', (req) =>
  services.payments.cancel(req.params.id),
)
app.post<{ Params: { id: string }; Body: { status: RailStatus } }>(
  '/api/payments/:id/rail-status',
  (req) => services.payments.applyRailStatus(req.params.id, req.body.status),
)

// --- beneficiaries ---
app.get<{ Querystring: { clientId: string; currency?: Currency } }>('/api/beneficiaries', (req) =>
  services.beneficiaries.list(req.query.clientId, req.query.currency),
)
app.post('/api/beneficiaries', (req) => services.beneficiaries.create(req.body as never))
app.put<{ Params: { id: string } }>('/api/beneficiaries/:id', (req) =>
  services.beneficiaries.update(req.params.id, req.body as never),
)
app.post<{ Params: { id: string } }>('/api/beneficiaries/:id/verify', (req) =>
  services.beneficiaries.verify(req.params.id),
)

// --- forwards ---
app.get<{ Querystring: { clientId: string } }>('/api/forwards', (req) =>
  services.forwards.list(req.query.clientId),
)
app.post<{ Params: { id: string }; Body: { sellAmountMinor: number } }>(
  '/api/forwards/:id/drawdown',
  (req) => services.forwards.drawdown(req.params.id, req.body.sellAmountMinor),
)

// --- accounts ---
app.get<{ Querystring: { clientId: string } }>('/api/accounts/balances', (req) =>
  services.accounts.getBalances(req.query.clientId),
)
app.get<{ Querystring: { clientId: string; currency: Currency; from: string; to: string } }>(
  '/api/accounts/statement',
  (req) =>
    services.accounts.getStatement(req.query.clientId, req.query.currency, {
      from: req.query.from,
      to: req.query.to,
    }),
)

// --- clients / admin ---
app.get('/api/clients', () => services.clients.getClients())
app.post<{ Params: { id: string }; Body: { spreadBps: number } }>(
  '/api/admin/clients/:id/tier',
  (req) => services.admin.setTier(req.params.id, req.body.spreadBps),
)
app.get('/api/admin/payments', () => services.admin.listAllPayments())
app.get<{ Querystring: { from: string; to: string } }>('/api/admin/revenue', (req) =>
  services.admin.getRevenue({ from: req.query.from, to: req.query.to }),
)

// --- approvals ---
app.get<{ Querystring: { clientId: string } }>('/api/approvals/rule', (req) =>
  services.approvals.getRule(req.query.clientId),
)
app.put<{ Querystring: { clientId: string }; Body: { enabled: boolean; thresholdMinor: number } }>(
  '/api/approvals/rule',
  (req) => services.approvals.setRule(req.query.clientId, req.body),
)
app.get<{ Querystring: { clientId: string } }>('/api/approvals/pending', (req) =>
  services.approvals.listPending(req.query.clientId),
)
app.post<{ Params: { id: string }; Body: { approver: string } }>('/api/approvals/:id/approve', (req) =>
  services.approvals.approve(req.params.id, req.body.approver),
)
app.post<{ Params: { id: string }; Body: { approver: string } }>('/api/approvals/:id/reject', (req) =>
  services.approvals.reject(req.params.id, req.body.approver),
)

const port = Number(process.env.PORT ?? 4000)
await app.listen({ port, host: '0.0.0.0' })
