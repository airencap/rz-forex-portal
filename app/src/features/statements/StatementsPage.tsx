import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { CURRENCY_FLAGS, formatMoney, toMajor, type Currency } from '@rz/domain'
import { downloadCsv } from '../../lib/csv'
import { useServices } from '../../services'
import type { Statement } from '@rz/domain'
import { useSession } from '../../store/session'
import { useTheme } from '../../store/theme'

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)
}

function exportCsv(statement: Statement): void {
  downloadCsv(
    `statement-${statement.currency}-${statement.range.from}-to-${statement.range.to}.csv`,
    ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'],
    [
      ['', 'Opening balance', '', '', '', toMajor(statement.opening)],
      ...statement.entries.map((e) => [
        e.date.slice(0, 10),
        e.description,
        e.reference,
        e.debit ? toMajor(e.debit) : '',
        e.credit ? toMajor(e.credit) : '',
        toMajor(e.balance),
      ]),
      ['', 'Closing balance', '', '', '', toMajor(statement.closing)],
    ],
  )
}

export function StatementsPage() {
  const services = useServices()
  const clientId = useSession((s) => s.clientId)!
  const theme = useTheme((s) => s.theme)

  const [currency, setCurrency] = useState<Currency>('AUD')
  const [from, setFrom] = useState(isoDaysAgo(90))
  const [to, setTo] = useState(isoDaysAgo(0))

  const { data: balances } = useQuery({
    queryKey: ['balances', clientId],
    queryFn: () => services.accounts.getBalances(clientId),
  })

  const validRange = from <= to
  const { data: statement, isPending } = useQuery({
    queryKey: ['statement', clientId, currency, from, to],
    queryFn: () => services.accounts.getStatement(clientId, currency, { from, to }),
    enabled: validRange,
  })

  const currencies = (balances ?? []).map((b) => b.currency)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-brand">Statements</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => statement && exportCsv(statement)}
            disabled={!statement}
          >
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={!statement}>
            Print / PDF
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-xs font-bold text-gray-600">Account</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Currency account">
              {currencies.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={currency === c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    currency === c ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span aria-hidden>{CURRENCY_FLAGS[c]}</span> {c}
                </button>
              ))}
            </div>
          </div>
          <div className="w-40">
            <TextField label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-40">
            <TextField label="To" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {!validRange && <p className="mt-2 text-sm text-red-600">"From" must be on or before "To".</p>}
      </Card>

      {/* printable statement document */}
      <Card>
        <div className="mb-4 hidden border-b border-gray-200 pb-4 print:block">
          <p className="text-lg font-bold text-brand">{theme.productName} — Account statement</p>
          <p className="text-xs text-gray-500">{theme.companyLine}</p>
        </div>

        {isPending || !statement ? (
          <SkeletonRows rows={6} />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-sm">
              <p className="font-bold text-brand">
                {statement.currency} account · {statement.range.from} to {statement.range.to}
              </p>
              <p className="text-gray-500">
                Opening <strong className="tabular-nums">{formatMoney(statement.opening)}</strong>
                <span className="mx-2">→</span>
                Closing <strong className="tabular-nums">{formatMoney(statement.closing)}</strong>
              </p>
            </div>

            {statement.entries.length === 0 ? (
              <EmptyState message="No movements on this account in the selected period." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-bold">Date</th>
                    <th className="pb-2 font-bold">Description</th>
                    <th className="pb-2 font-bold">Reference</th>
                    <th className="pb-2 text-right font-bold">Debit</th>
                    <th className="pb-2 text-right font-bold">Credit</th>
                    <th className="pb-2 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100 text-gray-400">
                    <td className="py-2" colSpan={5}>
                      Opening balance
                    </td>
                    <td className="py-2 text-right font-bold tabular-nums">
                      {formatMoney(statement.opening, { withCode: false })}
                    </td>
                  </tr>
                  {statement.entries.map((e, i) => (
                    <tr key={`${e.reference}-${i}`} className="border-t border-gray-100">
                      <td className="py-2 tabular-nums text-gray-500">{e.date.slice(0, 10)}</td>
                      <td className="py-2 text-gray-700">{e.description}</td>
                      <td className="py-2 text-gray-500">{e.reference}</td>
                      <td className="py-2 text-right tabular-nums text-red-600">
                        {e.debit ? formatMoney(e.debit, { withCode: false }) : ''}
                      </td>
                      <td className="py-2 text-right tabular-nums text-emerald-600">
                        {e.credit ? formatMoney(e.credit, { withCode: false }) : ''}
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">
                        {formatMoney(e.balance, { withCode: false })}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-bold text-brand">
                    <td className="py-2" colSpan={5}>
                      Closing balance
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(statement.closing, { withCode: false })}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
