import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { StatusChip } from '../../components/ui/StatusChip'
import { formatMoney, pairKey, PAYMENT_STATES, STATE_LABELS, type PaymentState } from '@rz/domain'
import { useServices } from '../../services'

export function MonitorPanel() {
  const services = useServices()
  const [stateFilter, setStateFilter] = useState<PaymentState | 'all'>('all')

  const { data, isPending } = useQuery({
    queryKey: ['ops-payments'],
    queryFn: () => services.admin.listAllPayments(),
    refetchInterval: 5000,
  })

  const filtered = (data ?? []).filter((p) => stateFilter === 'all' || p.state === stateFilter)

  return (
    <Card title="Global payment monitor">
      <div className="mb-4">
        <label htmlFor="ops-state" className="mr-2 text-xs font-bold text-gray-600">
          Status
        </label>
        <select
          id="ops-state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as PaymentState | 'all')}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          {PAYMENT_STATES.filter((s) => s !== 'draft' && s !== 'quoted').map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <SkeletonRows rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No payments match this filter." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-bold">Reference</th>
              <th className="pb-2 font-bold">Client</th>
              <th className="pb-2 font-bold">Pair</th>
              <th className="pb-2 text-right font-bold">Amount</th>
              <th className="pb-2 text-right font-bold">Margin</th>
              <th className="pb-2 text-right font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-surface">
                <td className="py-2.5">
                  <Link to={`/payments/${p.id}`} className="font-bold text-accent hover:underline">
                    {p.reference}
                  </Link>
                  {p.approval?.status === 'pending' && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      needs approval
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-gray-600">{p.clientName}</td>
                <td className="py-2.5 text-gray-500">{pairKey(p.pair)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatMoney(p.sellAmount)}</td>
                <td className="py-2.5 text-right tabular-nums text-gray-500">{p.spreadBps} bps</td>
                <td className="py-2.5 text-right">
                  <StatusChip state={p.state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-xs text-gray-400">Auto-refreshes every 5 seconds.</p>
    </Card>
  )
}
