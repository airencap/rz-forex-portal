import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { formatRate, pairKey, type CurrencyPair } from '../../domain'
import { useServices } from '../../services'

export function IndicativeRatesPanel({
  clientId,
  pairs,
}: {
  clientId: string
  pairs: CurrencyPair[]
}) {
  const services = useServices()
  const { data, isPending } = useQuery({
    queryKey: ['indicative-rates', clientId, pairs.map(pairKey).join(',')],
    queryFn: () => services.rates.getIndicativeRates(pairs, clientId),
    refetchInterval: 2500,
    enabled: pairs.length > 0,
  })

  return (
    <Card title="Indicative rates">
      {pairs.length === 0 ? (
        <EmptyState message="No frequent currency pairs yet — book a payment to see rates here." />
      ) : isPending ? (
        <SkeletonRows rows={pairs.length} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-bold">Pair</th>
              <th className="pb-2 text-right font-bold">Mid-market</th>
              <th className="pb-2 text-right font-bold">Your rate</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={pairKey(r.pair)} className="border-t border-gray-100">
                <td className="py-2 font-bold text-brand">{pairKey(r.pair)}</td>
                <td className="py-2 text-right tabular-nums text-gray-500">{formatRate(r.midRate)}</td>
                <td
                  className={`py-2 text-right font-bold tabular-nums ${
                    r.direction === 'up' ? 'text-emerald-600' : r.direction === 'down' ? 'text-red-600' : 'text-brand'
                  }`}
                >
                  {formatRate(r.clientRate)}
                  <span className="ml-1 text-xs" aria-hidden>
                    {r.direction === 'up' ? '▲' : r.direction === 'down' ? '▼' : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-gray-400">Indicative only — request a quote to deal.</p>
    </Card>
  )
}
