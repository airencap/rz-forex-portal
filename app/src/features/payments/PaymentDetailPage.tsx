import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { StatusChip } from '../../components/ui/StatusChip'
import { formatMoney, formatRate, HAPPY_PATH, pairKey, type RailExecution } from '@rz/domain'
import { railsRequest } from '../../lib/railsApi'
import { useServices } from '../../services'
import { PaymentTimeline } from './PaymentTimeline'

function RailStatusCard({ rail }: { rail: RailExecution }) {
  const statusQuery = useMutation({
    mutationFn: () =>
      railsRequest<{ Status?: string; [k: string]: unknown }>(
        `/api/noah/transactions/${rail.transactionId}`,
      ),
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
        {statusQuery.data && (
          <div className="flex justify-between">
            <dt className="text-gray-500">Rail status</dt>
            <dd className="font-bold text-brand">{String(statusQuery.data.Status ?? 'unknown')}</dd>
          </div>
        )}
      </dl>
      <Button
        variant="secondary"
        className="mt-3 !px-2 !py-1 !text-xs"
        disabled={statusQuery.isPending}
        onClick={() => statusQuery.mutate()}
      >
        {statusQuery.isPending ? 'Checking…' : 'Check rail status'}
      </Button>
      {statusQuery.isError && (
        <p className="mt-2 text-xs text-red-600">{(statusQuery.error as Error).message}</p>
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

          {payment.rail && <RailStatusCard rail={payment.rail} />}

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
