import { PAYOUT_CURRENCIES } from '@rz/domain'
import { noah, noahConfigured } from './client'

/**
 * Rail-evaluation snapshot for the ops console: is Noah reachable, which of
 * our portal corridors' payout currencies it covers, and live sandbox prices
 * (USDC_TEST source — Noah is stablecoin-settled; fiat offramp partners
 * such as Kraken/B2C2 cover the crypto leg) for the covered ones.
 */

export interface RailCoverageRow {
  currency: string
  supported: boolean
  countries: string[]
}

export interface RailPriceRow {
  destination: string
  sourceAmount: string
  destinationAmount?: string
  rate?: string
  totalFee?: string
  method?: string
  updatedAt?: string
  error?: string
}

export interface NoahEvaluation {
  configured: boolean
  ok: boolean
  error?: string
  asOf: string
  coverage: RailCoverageRow[]
  prices: RailPriceRow[]
}

const PROBE_SOURCE = 'USDC_TEST'
const PROBE_AMOUNT = '1000'
const CACHE_MS = 30_000

let cache: { at: number; value: NoahEvaluation } | null = null

export async function noahEvaluation(): Promise<NoahEvaluation> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value
  const value = await buildEvaluation()
  cache = { at: Date.now(), value }
  return value
}

async function buildEvaluation(): Promise<NoahEvaluation> {
  const asOf = new Date().toISOString()
  if (!noahConfigured()) {
    return { configured: false, ok: false, asOf, coverage: [], prices: [] }
  }

  let countriesByCurrency: Map<string, string[]>
  try {
    const sellCountries = (await noah.sellCountries()) as Record<string, string[]>
    countriesByCurrency = new Map()
    for (const [country, currencies] of Object.entries(sellCountries)) {
      for (const c of currencies) {
        countriesByCurrency.set(c, [...(countriesByCurrency.get(c) ?? []), country])
      }
    }
  } catch (err) {
    return { configured: true, ok: false, error: (err as Error).message, asOf, coverage: [], prices: [] }
  }

  // our portal's payout currencies vs Noah's sell coverage
  const coverage: RailCoverageRow[] = PAYOUT_CURRENCIES.map((currency) => ({
    currency,
    supported: countriesByCurrency.has(currency),
    countries: countriesByCurrency.get(currency) ?? [],
  }))

  const supported = coverage.filter((c) => c.supported).map((c) => c.currency)
  const prices: RailPriceRow[] = await Promise.all(
    supported.map(async (destination): Promise<RailPriceRow> => {
      try {
        const res = await noah.prices({
          SourceCurrency: PROBE_SOURCE,
          DestinationCurrency: destination,
          SourceAmount: PROBE_AMOUNT,
        })
        const item = res.Items[0]
        if (!item) return { destination, sourceAmount: PROBE_AMOUNT, error: 'No price returned' }
        return {
          destination,
          sourceAmount: PROBE_AMOUNT,
          destinationAmount: item.DestinationAmount,
          rate: item.Rate,
          totalFee: item.TotalFee,
          method: item.PaymentMethodCategory,
          updatedAt: item.UpdatedAt,
        }
      } catch (err) {
        return { destination, sourceAmount: PROBE_AMOUNT, error: (err as Error).message }
      }
    }),
  )

  return { configured: true, ok: true, asOf, coverage, prices }
}
