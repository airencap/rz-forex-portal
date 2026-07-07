import cors from '@fastify/cors'
import { CURRENCIES, type Currency, type CurrencyPair, type QuoteRequest } from '@rz/domain'
import { createMockServices } from '@rz/mock-services'
import Fastify from 'fastify'

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

// --- rates & quotes ---
app.get<{ Querystring: { clientId: string; pairs: string } }>('/api/rates/indicative', (req) =>
  services.rates.getIndicativeRates(parsePairs(req.query.pairs), req.query.clientId),
)
app.post<{ Body: QuoteRequest }>('/api/quotes', (req) => services.rates.getQuote(req.body))
app.post<{ Params: { id: string }; Body: { beneficiaryId: string } }>(
  '/api/quotes/:id/book',
  (req) => services.rates.bookQuote(req.params.id, req.body.beneficiaryId),
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
