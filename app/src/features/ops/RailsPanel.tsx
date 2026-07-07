import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { CURRENCY_FLAGS, type Currency } from '@rz/domain'

/**
 * Ops-only rail evaluation tooling. Talks to the RZ API directly (not the
 * client Services contract — this is vendor assessment, not client surface).
 */
const RAILS_API =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://rz-forex-api.onrender.com')

interface CoverageRow {
  currency: Currency
  supported: boolean
  countries: string[]
}
interface PriceRow {
  destination: string
  sourceAmount: string
  destinationAmount?: string
  rate?: string
  totalFee?: string
  method?: string
  updatedAt?: string
  error?: string
}
interface Evaluation {
  configured: boolean
  ok: boolean
  error?: string
  asOf: string
  coverage: CoverageRow[]
  prices: PriceRow[]
}

async function fetchEvaluation(): Promise<Evaluation> {
  const res = await fetch(`${RAILS_API}/api/rails/noah/evaluation`)
  if (!res.ok) throw new Error(`RZ API responded ${res.status}`)
  return res.json() as Promise<Evaluation>
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {label}
    </span>
  )
}

export function RailsPanel() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['rails-noah'],
    queryFn: fetchEvaluation,
    refetchInterval: 30_000,
    retry: 1,
  })

  if (isPending) {
    return (
      <Card title="Noah (sandbox) — banking rail under evaluation">
        <SkeletonRows rows={4} />
      </Card>
    )
  }

  if (isError) {
    return (
      <Card title="Noah (sandbox) — banking rail under evaluation">
        <p className="text-sm text-red-600">
          Cannot reach the RZ API ({(error as Error).message}). Rail evaluation needs the API
          server — run <code className="rounded bg-gray-100 px-1">npm run dev:api</code> locally, or
          deploy with the vendor key configured.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card
        title="Noah (sandbox) — banking rail under evaluation"
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-bold text-accent hover:underline"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusPill
            ok={data.configured && data.ok}
            label={!data.configured ? 'Not configured' : data.ok ? 'Connected' : 'Error'}
          />
          {data.error && <span className="text-red-600">{data.error}</span>}
          <span className="text-gray-400">
            Sandbox · stablecoin-settled (USDC leg via offramp partners) · snapshot{' '}
            {new Date(data.asOf).toLocaleTimeString('en-AU')}
          </span>
        </div>
        {!data.configured && (
          <p className="mt-3 text-sm text-gray-500">
            Set <code className="rounded bg-gray-100 px-1">NOAH_API_KEY</code> in the API server's
            environment to enable live evaluation data.
          </p>
        )}
      </Card>

      {data.ok && (
        <>
          <Card title="Coverage vs our corridors">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-bold">Payout currency</th>
                  <th className="pb-2 font-bold">Noah sell coverage</th>
                  <th className="pb-2 font-bold">Countries</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.map((row) => (
                  <tr key={row.currency} className="border-t border-gray-100">
                    <td className="py-2 font-bold text-brand">
                      <span aria-hidden>{CURRENCY_FLAGS[row.currency]}</span> {row.currency}
                    </td>
                    <td className="py-2">
                      <StatusPill ok={row.supported} label={row.supported ? 'Supported' : 'Not available'} />
                    </td>
                    <td className="py-2 text-gray-500">{row.countries.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-gray-400">
              Sandbox coverage as reported by /channels/sell/countries — confirm production coverage
              with Noah before concluding. AUD→NPR (flagship) is not covered; evaluation focus is
              USD local clearing.
            </p>
          </Card>

          <Card title={`Live sandbox pricing — sell ${'USDC'} 1,000`}>
            {data.prices.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                No overlapping corridors to price.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-bold">Destination</th>
                    <th className="pb-2 text-right font-bold">Rate</th>
                    <th className="pb-2 text-right font-bold">Total fee</th>
                    <th className="pb-2 text-right font-bold">Beneficiary receives</th>
                    <th className="pb-2 font-bold">Method</th>
                    <th className="pb-2 font-bold">As of</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prices.map((p) => (
                    <tr key={p.destination} className="border-t border-gray-100">
                      <td className="py-2 font-bold text-brand">{p.destination}</td>
                      {p.error ? (
                        <td colSpan={5} className="py-2 text-red-600">
                          {p.error}
                        </td>
                      ) : (
                        <>
                          <td className="py-2 text-right tabular-nums">{p.rate ? Number(p.rate).toFixed(5) : '—'}</td>
                          <td className="py-2 text-right tabular-nums text-gray-500">
                            {p.totalFee ?? '—'}
                          </td>
                          <td className="py-2 text-right font-bold tabular-nums">
                            {p.destinationAmount ? `${Number(p.destinationAmount).toLocaleString()} ${p.destination}` : '—'}
                          </td>
                          <td className="py-2 text-gray-500">{p.method ?? '—'}</td>
                          <td className="py-2 text-gray-400 tabular-nums">
                            {p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('en-AU') : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-gray-400">
              Live from Noah's sandbox /prices (testnet liquidity). Fees in destination currency.
            </p>
          </Card>
        </>
      )}
    </div>
  )
}
