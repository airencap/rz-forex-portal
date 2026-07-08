import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { StatusChip } from '../../components/ui/StatusChip'
import {
  formatMoney,
  formatRate,
  HAPPY_PATH,
  pairKey,
  type Payment,
  type RailStatus,
} from '@rz/domain'
import { railsRequest } from '../../lib/railsApi'
import { useServices } from '../../services'
import { PaymentTimeline } from './PaymentTimeline'

interface RailEvent {
  receivedAt: string
  verified: boolean
  eventType: string
  occurred?: string
  status?: RailStatus
}

const TERMINAL = new Set(['settled', 'failed', 'cancelled', 'returned'])

/**
 * Webhook-driven rail card: polls the RZ API's Noah event store and applies
 * rail-reported status to the payment state machine — the tracker follows
 * the rail without manual clicks. Direct status lookup stays as a fallback.
 */
function RailStatusCard({ payment }: { payment: Payment }) {
  const services = useServices()
  const queryClient = useQueryClient()
  const rail = payment.rail!
  const terminal = TERMINAL.has(payment.state)

  const eventsQuery = useQuery({
    queryKey: ['noah-events', rail.transactionId],
    queryFn: () => railsRequest<RailEvent[]>(`/api/noah/events?transactionId=${rail.transactionId}`),
    refetchInterval: terminal ? false : 10_000,
    retry: 1,
  })

  const events = eventsQuery.data ?? []
  const latestStatus = [...events].reverse().find((e) => e.status)?.status

  const syncMutation = useMutation({
    mutationFn: (status: RailStatus) => services.payments.applyRailStatus(payment.id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['payment', payment.id], updated)
      queryClient.invalidateQueries({ queryKey: ['payments', updated.clientId] })
    },
  })

  // rail says something newer than our state machine shows → apply it
  useEffect(() => {
    if (!latestStatus || terminal || syncMutation.isPending) return
    const needsSync =
      (latestStatus === 'Settled' && payment.state !== 'settled') ||
      (latestStatus === 'Failed' && payment.state !== 'failed') ||
      (latestStatus === 'Pending' && payment.state === 'booked')
    if (needsSync) syncMutation.mutate(latestStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestStatus, payment.state])

  const directCheck = useMutation({
    mutationFn: () =>
      railsRequest<{ Status?: string }>(`/api/noah/transactions/${rail.transactionId}`),
  })

  return (
    <Card title="Rail execution (Noah sandbox)">
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Transaction ID</dt>
          <dd className="font-mono text-xs text-brand">{rail.transactionId}</dd>
        </div>
        {rail.channelFee && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Channel fee (all-in)</dt>
            <dd className="tabular-nums">{rail.channelFee} USD</dd>
          </div>
        )}
        {directCheck.data && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Direct lookup</dt>
            <dd className="font-bold text-brand">{String(directCheck.data.Status ?? 'unknown')}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Rail events (webhooks{terminal ? '' : ' · live'})
        </p>
        {events.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">
            No events received yet — Noah pushes Transaction events as the payout progresses.
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {events.map((e, i) => (
              <li key={i} className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {e.eventType}
                  {e.status && <strong className="ml-1 text-brand">{e.status}</strong>}
                  {!e.verified && (
                    <span className="ml-1.5 rounded bg-amber-50 px-1 text-[10px] font-bold uppercase text-amber-700">
                      unsigned
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-gray-400">
                  {new Date(e.occurred ?? e.receivedAt).toLocaleTimeString('en-AU')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        variant="secondary"
        className="mt-3 !px-2 !py-1 !text-xs"
        disabled={directCheck.isPending}
        onClick={() => directCheck.mutate()}
      >
        {directCheck.isPending ? 'Checking…' : 'Check rail directly'}
      </Button>
      {(eventsQuery.isError || directCheck.isError) && (
        <p className="mt-2 text-xs text-red-600">
          {((eventsQuery.error ?? directCheck.error) as Error).message}
        </p>
      )}
    </Card>
  )
}

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const services = useServices()
  const queryClient = useQueryClient()

  const { data: payment, isPending, isError, error } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => services.payments.get(id!),
    enabled: !!id,
  })

  const advanceMutation = useMutation({
    mutationFn: () => services.payments.advance(id!),
    onSuccess: (updated) => {
      queryClient.setQueryData(['payment', id], updated)
      queryClient.invalidateQueries({ queryKey: ['payments', updated.clientId] })
    },
  })

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl">
        <SkeletonRows rows={6} />
      </div>
    )
  }

  if (isError || !payment) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm text-red-600">{isError ? (error as Error).message : 'Payment not found'}</p>
        <Link to="/" className="mt-3 inline-block text-sm font-bold text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  const approvalHold = payment.approval?.status === 'pending'
  const advanceable =
    HAPPY_PATH.indexOf(payment.state) >= 0 && payment.state !== 'settled' && !approvalHold
  const awaitingFunding = payment.state === 'booked' || payment.state === 'funds_pending'

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/" className="text-xs font-bold text-accent hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-xl font-bold text-brand">
            {payment.reference}
            {payment.kind === 'forward' && (
              <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold uppercase text-indigo-600">
                Forward
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            {formatMoney(payment.sellAmount)} → {formatMoney(payment.buyAmount)} · {payment.beneficiaryName}
          </p>
        </div>
        <StatusChip state={payment.state} />
      </div>

      {approvalHold && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Awaiting second approval.</strong> This payment exceeds the client's approval
          threshold and holds here until a client admin approves it in the Approvals queue.
        </div>
      )}
      {payment.approval?.status === 'approved' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Second approval granted by {payment.approval.decidedBy}
          {payment.approval.decidedAt &&
            ` on ${new Date(payment.approval.decidedAt).toLocaleString('en-AU')}`}
          .
        </div>
      )}
      {payment.approval?.status === 'rejected' && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Rejected at second approval by {payment.approval.decidedBy} — payment cancelled.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Payment tracker">
          <PaymentTimeline payment={payment} />
        </Card>

        <div className="space-y-5">
          <Card title="Deal details">
            <dl className="space-y-1.5 text-sm">
              {[
                ['Currency pair', pairKey(payment.pair)],
                ['Your rate', formatRate(payment.clientRate)],
                ['Mid-market reference', formatRate(payment.midRate)],
                ['Margin', `${payment.spreadBps} bps`],
                ['Fixed fee', formatMoney(payment.fee)],
                ['Value date', payment.valueDate],
                ['Booked', new Date(payment.createdAt).toLocaleString('en-AU')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-bold text-brand tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {awaitingFunding && (
            <Card title={`Funding instructions (${payment.funding.currency} account)`}>
              <dl className="space-y-1.5 text-sm">
                {[
                  ['Account name', payment.funding.accountName],
                  ...payment.funding.fields.map((f): [string, string] => [f.label, f.value]),
                  ['Reference', payment.reference],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-bold text-brand tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-amber-600">
                Transfer {formatMoney(payment.sellAmount)} with the reference above to release this payment.
              </p>
            </Card>
          )}

          {payment.rail && <RailStatusCard payment={payment} />}

          <Card title="Demo controls">
            <p className="mb-3 text-xs text-gray-400">
              Prototype-only: simulate the payment progressing through the pipeline.
            </p>
            <Button
              variant="secondary"
              disabled={!advanceable || advanceMutation.isPending}
              onClick={() => advanceMutation.mutate()}
            >
              {advanceMutation.isPending ? 'Advancing…' : 'Advance to next state'}
            </Button>
            {advanceMutation.isError && (
              <p className="mt-2 text-sm text-red-600">{(advanceMutation.error as Error).message}</p>
            )}
            {!advanceable && (
              <p className="mt-2 text-xs text-gray-400">This payment is in a terminal state.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
