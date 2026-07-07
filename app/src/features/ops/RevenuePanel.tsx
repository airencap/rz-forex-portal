import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { formatMoney, money } from '@rz/domain'
import { useServices } from '../../services'
import type { RevenueLine } from '@rz/domain'

function isoToday(): string {
  return new Date().toISOString().slice(0, 10)
}
function isoMonthStart(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`
}

const RANGES = {
  mtd: { label: 'Month to date', from: isoMonthStart },
  quarter: { label: 'Last 90 days', from: () => new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10) },
  all: { label: 'All time', from: () => '2026-01-01' },
} as const
type RangeKey = keyof typeof RANGES

const aud = (minor: number) => formatMoney(money('AUD', minor))

function RevenueTable({ title, lines }: { title: string; lines: RevenueLine[] }) {
  return (
    <Card title={title}>
      {lines.length === 0 ? (
        <EmptyState message="No revenue in this period." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-bold"></th>
              <th className="pb-2 text-right font-bold">Trades</th>
              <th className="pb-2 text-right font-bold">Volume</th>
              <th className="pb-2 text-right font-bold">Spread</th>
              <th className="pb-2 text-right font-bold">Fees</th>
              <th className="pb-2 text-right font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key} className="border-t border-gray-100">
                <td className="py-2 font-bold text-brand">{l.label}</td>
                <td className="py-2 text-right tabular-nums text-gray-500">{l.trades}</td>
                <td className="py-2 text-right tabular-nums text-gray-500">{aud(l.volumeMinor)}</td>
                <td className="py-2 text-right tabular-nums">{aud(l.spreadMinor)}</td>
                <td className="py-2 text-right tabular-nums">{aud(l.feeMinor)}</td>
                <td className="py-2 text-right font-bold tabular-nums text-brand">
                  {aud(l.spreadMinor + l.feeMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

export function RevenuePanel() {
  const services = useServices()
  const [rangeKey, setRangeKey] = useState<RangeKey>('mtd')

  const from = RANGES[rangeKey].from()
  const { data, isPending } = useQuery({
    queryKey: ['revenue', from],
    queryFn: () => services.admin.getRevenue({ from, to: isoToday() }),
  })

  const chartData = (data?.byCorridor ?? []).map((l) => ({
    name: l.label,
    Spread: l.spreadMinor / 100,
    Fees: l.feeMinor / 100,
  }))

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5" role="radiogroup" aria-label="Revenue period">
        {(Object.keys(RANGES) as RangeKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={rangeKey === k}
            onClick={() => setRangeKey(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              rangeKey === k ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {RANGES[k].label}
          </button>
        ))}
      </div>

      {isPending || !data ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Total revenue', aud(data.totals.spreadMinor + data.totals.feeMinor)],
              ['Spread income', aud(data.totals.spreadMinor)],
              ['Fee income', aud(data.totals.feeMinor)],
              ['Volume / trades', `${aud(data.totals.volumeMinor)} · ${data.totals.trades}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
                <p className="mt-1 text-lg font-bold text-brand tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <Card title="Revenue by corridor">
            {chartData.length === 0 ? (
              <EmptyState message="No revenue in this period." />
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Tooltip
                      formatter={(v) =>
                        `A$${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend />
                    <Bar dataKey="Spread" stackId="rev" fill="var(--rz-brand)" />
                    <Bar dataKey="Fees" stackId="rev" fill="var(--rz-accent)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <RevenueTable title="By corridor" lines={data.byCorridor} />
            <RevenueTable title="By client" lines={data.byClient} />
          </div>
        </>
      )}
    </div>
  )
}
