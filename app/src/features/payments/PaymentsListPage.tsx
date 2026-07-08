import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { StatusChip } from '../../components/ui/StatusChip'
import {
  PAYOUT_CURRENCIES,
  formatMoney,
  formatRate,
  pairKey,
  PAYMENT_STATES,
  STATE_LABELS,
  toMajor,
  type Currency,
  type Payment,
  type PaymentState,
} from '@rz/domain'
import { downloadCsv } from '../../lib/csv'
import { useServices } from '../../services'
import { useSession } from '../../store/session'

type SortKey = 'date' | 'amount'

function exportCsv(payments: Payment[]): void {
  downloadCsv(
    `payments-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Reference', 'Booked', 'Type', 'Beneficiary', 'Pair', 'Sell amount', 'Buy amount', 'Client rate', 'Mid rate', 'Spread (bps)', 'Fee', 'Value date', 'Status'],
    payments.map((p) => [
      p.reference,
      p.createdAt,
      p.kind,
      p.beneficiaryName,
      pairKey(p.pair),
      toMajor(p.sellAmount),
      toMajor(p.buyAmount),
      p.clientRate,
      p.midRate,
      p.spreadBps,
      toMajor(p.fee),
      p.valueDate,
      STATE_LABELS[p.state],
    ]),
  )
}

export function PaymentsListPage() {
  const services = useServices()
  const clientId = useSession((s) => s.clientId)!

  const [stateFilter, setStateFilter] = useState<PaymentState | 'all'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDesc, setSortDesc] = useState(true)

  const { data, isPending } = useQuery({
    queryKey: ['payments', clientId],
    queryFn: () => services.payments.list({ clientId }),
  })

  const filtered = useMemo(() => {
    let result = data ?? []
    if (stateFilter !== 'all') result = result.filter((p) => p.state === stateFilter)
    if (currencyFilter !== 'all') result = result.filter((p) => p.pair.buy === currencyFilter)
    const dir = sortDesc ? -1 : 1
    return [...result].sort((a, b) =>
      sortKey === 'date'
        ? dir * a.createdAt.localeCompare(b.createdAt)
        : dir * (a.sellAmount.minor - b.sellAmount.minor),
    )
  }, [data, stateFilter, currencyFilter, sortKey, sortDesc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDesc ? ' ▼' : ' ▲') : '')

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand">Payments</h1>
        <Link to="/quote">
          <Button>New payment</Button>
        </Link>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-3">
            <div>
              <label htmlFor="filter-state" className="mb-1 block text-xs font-bold text-gray-600">
                Status
              </label>
              <select
                id="filter-state"
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
            <div>
              <label htmlFor="filter-ccy" className="mb-1 block text-xs font-bold text-gray-600">
                Receive currency
              </label>
              <select
                id="filter-ccy"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value as Currency | 'all')}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="all">All currencies</option>
                {PAYOUT_CURRENCIES.map((buy) => (
                  <option key={buy} value={buy}>
                    {buy}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="secondary" onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
            Export CSV ({filtered.length})
          </Button>
        </div>

        {isPending ? (
          <SkeletonRows rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              (data ?? []).length === 0
                ? 'No payments yet. Book your first FX payment to get started.'
                : 'No payments match the current filters.'
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2 font-bold">Reference</th>
                <th className="pb-2 font-bold">
                  <button type="button" onClick={() => toggleSort('date')} className="font-bold uppercase hover:text-brand">
                    Booked{sortArrow('date')}
                  </button>
                </th>
                <th className="pb-2 font-bold">Beneficiary</th>
                <th className="pb-2 font-bold">Pair</th>
                <th className="pb-2 text-right font-bold">
                  <button type="button" onClick={() => toggleSort('amount')} className="font-bold uppercase hover:text-brand">
                    You send{sortArrow('amount')}
                  </button>
                </th>
                <th className="pb-2 text-right font-bold">They receive</th>
                <th className="pb-2 text-right font-bold">Rate</th>
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
                    {p.kind === 'forward' && (
                      <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                        fwd
                      </span>
                    )}
                    {p.approval?.status === 'pending' && (
                      <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        needs approval
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-500 tabular-nums">
                    {new Date(p.createdAt).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-2.5 text-gray-600">{p.beneficiaryName}</td>
                  <td className="py-2.5 text-gray-500">{pairKey(p.pair)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(p.sellAmount)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatMoney(p.buyAmount)}</td>
                  <td className="py-2.5 text-right tabular-nums text-gray-500">{formatRate(p.clientRate)}</td>
                  <td className="py-2.5 text-right">
                    <StatusChip state={p.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
