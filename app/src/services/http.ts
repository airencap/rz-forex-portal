import {
  pairKey,
  type Currency,
  type Services,
  type StatementRange,
} from '@rz/domain'

/**
 * HTTP implementation of the Services contract, talking to the RZ API
 * (server/). Selected over the in-browser mocks by setting VITE_API_URL.
 */

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new Error('Cannot reach the RZ API — is the server running?')
  }
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`)
  return body as T
}

const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
const put = (body: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(body) })

export function createHttpServices(baseUrl: string): Services {
  const base = baseUrl.replace(/\/$/, '')
  const get = <T>(path: string) => request<T>(base, path)

  return {
    rates: {
      getIndicativeRates: (pairs, clientId) =>
        get(`/api/rates/indicative?clientId=${clientId}&pairs=${pairs.map(pairKey).join(',')}`),
      getQuote: (req) => request(base, '/api/quotes', post(req)),
      bookQuote: (quoteId, beneficiaryId) =>
        request(base, `/api/quotes/${quoteId}/book`, post({ beneficiaryId })),
    },

    payments: {
      list: (filter) =>
        get(
          `/api/payments?clientId=${filter.clientId}${filter.states ? `&states=${filter.states.join(',')}` : ''}`,
        ),
      get: (id) => get(`/api/payments/${id}`),
      advance: (id) => request(base, `/api/payments/${id}/advance`, post({})),
      cancel: (id) => request(base, `/api/payments/${id}/cancel`, post({})),
    },

    beneficiaries: {
      list: (clientId: string, currency?: Currency) =>
        get(`/api/beneficiaries?clientId=${clientId}${currency ? `&currency=${currency}` : ''}`),
      create: (input) => request(base, '/api/beneficiaries', post(input)),
      update: (id, input) => request(base, `/api/beneficiaries/${id}`, put(input)),
      verify: (id) => request(base, `/api/beneficiaries/${id}/verify`, post({})),
    },

    forwards: {
      list: (clientId) => get(`/api/forwards?clientId=${clientId}`),
      book: (quoteId, beneficiaryId) =>
        request(base, `/api/quotes/${quoteId}/book-forward`, post({ beneficiaryId })),
      drawdown: (id, sellAmountMinor) =>
        request(base, `/api/forwards/${id}/drawdown`, post({ sellAmountMinor })),
    },

    accounts: {
      getBalances: (clientId) => get(`/api/accounts/balances?clientId=${clientId}`),
      getStatement: (clientId: string, currency: Currency, range: StatementRange) =>
        get(
          `/api/accounts/statement?clientId=${clientId}&currency=${currency}&from=${range.from}&to=${range.to}`,
        ),
    },

    clients: {
      getClients: () => get('/api/clients'),
    },

    admin: {
      setTier: (clientId, spreadBps) =>
        request(base, `/api/admin/clients/${clientId}/tier`, post({ spreadBps })),
      listAllPayments: () => get('/api/admin/payments'),
      getRevenue: (range) => get(`/api/admin/revenue?from=${range.from}&to=${range.to}`),
    },

    approvals: {
      getRule: (clientId) => get(`/api/approvals/rule?clientId=${clientId}`),
      setRule: (clientId, rule) => request(base, `/api/approvals/rule?clientId=${clientId}`, put(rule)),
      listPending: (clientId) => get(`/api/approvals/pending?clientId=${clientId}`),
      approve: (paymentId, approver) =>
        request(base, `/api/approvals/${paymentId}/approve`, post({ approver })),
      reject: (paymentId, approver) =>
        request(base, `/api/approvals/${paymentId}/reject`, post({ approver })),
    },
  }
}
