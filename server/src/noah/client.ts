/**
 * Thin client for the Noah Business API (sandbox by default).
 * Auth: X-Api-Key from NOAH_API_KEY. Request signing (mandatory in
 * production) is deliberately not implemented yet — sandbox doesn't
 * require it; it's tracked as a production-readiness step.
 */

const BASE_URL = process.env.NOAH_API_URL ?? 'https://api.sandbox.noah.com/v1'

export function noahConfigured(): boolean {
  return Boolean(process.env.NOAH_API_KEY)
}

class NoahError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function noahRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.NOAH_API_KEY
  if (!key) throw new NoahError('NOAH_API_KEY is not configured', 503)
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    // Noah errors: { Type, Detail, RequestExtension: { Body: [{Field, Description}] } }
    const e = body as {
      Detail?: string
      message?: string
      error?: string
      RequestExtension?: { Body?: Array<{ Field?: string; Description?: string }> }
    } | null
    const fieldErrors = (e?.RequestExtension?.Body ?? [])
      .map((f) => f.Description ?? f.Field)
      .filter(Boolean)
      .join('; ')
    const message =
      [e?.Detail ?? e?.message ?? e?.error, fieldErrors].filter(Boolean).join(' — ') ||
      `Noah API error (${res.status})`
    throw new NoahError(message, res.status)
  }
  return body as T
}

// --- response shapes (fields we use; Noah's OAS has more) ---

export interface NoahPriceItem {
  Rate: string
  TotalFee?: string
  SourceAmount?: string
  DestinationAmount?: string
  PaymentMethodCategory?: string
  UpdatedAt?: string
}

export interface NoahBalance {
  AssetID?: string
  Available?: string
  [key: string]: unknown
}

export interface PricesQuery {
  SourceCurrency: string
  DestinationCurrency: string
  SourceAmount?: string
  DestinationAmount?: string
  PaymentMethodCategory?: string
  Country?: string
}

export const noah = {
  prices(query: PricesQuery): Promise<{ Items: NoahPriceItem[] }> {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
    )
    return noahRequest(`/prices?${qs}`)
  },

  balances(): Promise<{ Items?: NoahBalance[]; Balances?: NoahBalance[] }> {
    return noahRequest('/balances')
  },

  sellChannels(): Promise<unknown> {
    return noahRequest('/channels/sell')
  },

  sellCountries(): Promise<unknown> {
    return noahRequest('/channels/sell/countries')
  },

  transaction(id: string): Promise<unknown> {
    return noahRequest(`/transactions/${encodeURIComponent(id)}`)
  },

  simulateFiatDeposit(body: {
    PaymentMethodID: string
    FiatAmount: string
    FiatCurrency: string
    Reference?: string
  }): Promise<unknown> {
    return noahRequest('/sandbox/fiat-deposit/simulate', { method: 'POST', body: JSON.stringify(body) })
  },
}
