import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { TextField } from '../../components/ui/Field'
import { SkeletonRows } from '../../components/ui/Skeleton'
import {
  formatMoney,
  formatRate,
  forwardRemainingMinor,
  forwardUtilization,
  money,
  pairKey,
  toMinor,
  type ForwardContract,
} from '@rz/domain'
import { useServices } from '../../services'
import { useSession } from '../../store/session'

function UtilizationBar({ contract }: { contract: ForwardContract }) {
  const pct = Math.round(forwardUtilization(contract) * 100)
  return (
    <div>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-gray-400">{pct}% drawn</p>
    </div>
  )
}

function DrawdownForm({
  contract,
  onDone,
}: {
  contract: ForwardContract
  onDone: (paymentId: string) => void
}) {
  const services = useServices()
  const queryClient = useQueryClient()
  const remaining = forwardRemainingMinor(contract)
  const [amount, setAmount] = useState(String(remaining / 100))

  const mutation = useMutation({
    mutationFn: (sellMinor: number) => services.forwards.drawdown(contract.id, sellMinor),
    onSuccess: ({ contract: updated, payment }) => {
      queryClient.invalidateQueries({ queryKey: ['forwards', updated.clientId] })
      queryClient.invalidateQueries({ queryKey: ['payments', updated.clientId] })
      onDone(payment.id)
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = Number(amount.replace(/,/g, ''))
    if (!Number.isFinite(parsed) || parsed <= 0) return
    mutation.mutate(toMinor('AUD', parsed))
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md border border-gray-200 bg-surface p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Draw down {contract.reference} · {formatMoney(money('AUD', remaining))} remaining at{' '}
        {formatRate(contract.lockedRate)}
      </p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label="Amount (AUD)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Booking…' : 'Draw down'}
        </Button>
        <Button
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(remaining)}
        >
          Settle remainder
        </Button>
      </div>
      {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
      <p className="text-xs text-gray-400">
        Drawdowns pay {contract.beneficiaryName} at the locked rate and enter the payment pipeline.
      </p>
    </form>
  )
}

export function ForwardsPage() {
  const services = useServices()
  const clientId = useSession((s) => s.clientId)!
  const [drawingDown, setDrawingDown] = useState<string | null>(null)
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['forwards', clientId],
    queryFn: () => services.forwards.list(clientId),
  })

  const open = (data ?? []).filter((f) => f.status === 'open')
  const closed = (data ?? []).filter((f) => f.status !== 'open')

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand">Forward contracts</h1>
        <Link to="/quote">
          <Button>Book a forward</Button>
        </Link>
      </div>

      {lastPaymentId && (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <span>Drawdown booked — a payment has entered the pipeline.</span>
          <Link to={`/payments/${lastPaymentId}`} className="font-bold text-accent hover:underline">
            Track it →
          </Link>
        </div>
      )}

      <Card title={`Open contracts (${open.length})`}>
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : open.length === 0 ? (
          <EmptyState
            message="No open forward contracts. Book a forward to lock a rate for a future date."
            action={
              <Link to="/quote">
                <Button>Book a forward</Button>
              </Link>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-2 font-bold">Reference</th>
                <th className="pb-2 font-bold">Pair</th>
                <th className="pb-2 font-bold">Beneficiary</th>
                <th className="pb-2 text-right font-bold">Locked rate</th>
                <th className="pb-2 text-right font-bold">Notional</th>
                <th className="pb-2 font-bold">Value date</th>
                <th className="pb-2 text-right font-bold">Indicative MTM</th>
                <th className="pb-2 font-bold">Utilization</th>
                <th className="pb-2 text-right font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {open.map((f) => (
                <Fragment key={f.id}>
                  <tr className="border-t border-gray-100">
                    <td className="py-2.5 font-bold text-brand">{f.reference}</td>
                    <td className="py-2.5 text-gray-500">{pairKey(f.pair)}</td>
                    <td className="py-2.5 text-gray-600">{f.beneficiaryName}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatRate(f.lockedRate)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatMoney(f.notional)}</td>
                    <td className="py-2.5 tabular-nums text-gray-600">{f.valueDate}</td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${
                        f.mtmMinor > 0 ? 'text-emerald-600' : f.mtmMinor < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}
                      title="Indicative only (prototype)"
                    >
                      {f.mtmMinor >= 0 ? '+' : ''}
                      {formatMoney(money('AUD', f.mtmMinor))}
                    </td>
                    <td className="py-2.5">
                      <UtilizationBar contract={f} />
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        variant="secondary"
                        className="!px-2 !py-1 !text-xs"
                        onClick={() => setDrawingDown(drawingDown === f.id ? null : f.id)}
                      >
                        {drawingDown === f.id ? 'Close' : 'Draw down'}
                      </Button>
                    </td>
                  </tr>
                  {drawingDown === f.id && (
                    <tr>
                      <td colSpan={9}>
                        <DrawdownForm
                          contract={f}
                          onDone={(paymentId) => {
                            setDrawingDown(null)
                            setLastPaymentId(paymentId)
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-gray-400">
          Mark-to-market is indicative only in the prototype and not a dealing price.
        </p>
      </Card>

      {closed.length > 0 && (
        <Card title={`Settled / closed (${closed.length})`}>
          <table className="w-full text-sm">
            <tbody>
              {closed.map((f) => (
                <tr key={f.id} className="border-t border-gray-100 text-gray-400">
                  <td className="py-2 font-bold">{f.reference}</td>
                  <td className="py-2">{pairKey(f.pair)}</td>
                  <td className="py-2 text-right tabular-nums">{formatRate(f.lockedRate)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(f.notional)}</td>
                  <td className="py-2 tabular-nums">{f.valueDate}</td>
                  <td className="py-2 text-right text-xs font-bold uppercase">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
