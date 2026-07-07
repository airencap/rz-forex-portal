import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { formatMoney, money, pairKey, toMinor } from '@rz/domain'
import { useServices } from '../../services'
import type { ApprovalRule } from '@rz/domain'
import { useSession } from '../../store/session'

function RuleSettings({ clientId }: { clientId: string }) {
  const services = useServices()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<{ enabled: boolean; thresholdMajor: string } | null>(null)

  const { data: rule, isPending } = useQuery({
    queryKey: ['approval-rule', clientId],
    queryFn: () => services.approvals.getRule(clientId),
  })

  const saveMutation = useMutation({
    mutationFn: (next: ApprovalRule) => services.approvals.setRule(clientId, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rule', clientId] })
      setDraft(null)
    },
  })

  if (isPending || !rule) {
    return (
      <Card title="Approval rule">
        <SkeletonRows rows={2} />
      </Card>
    )
  }

  const current = draft ?? { enabled: rule.enabled, thresholdMajor: String(rule.thresholdMinor / 100) }
  const dirty =
    current.enabled !== rule.enabled || Number(current.thresholdMajor) !== rule.thresholdMinor / 100

  return (
    <Card title="Approval rule">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm font-bold text-brand">
          <input
            type="checkbox"
            checked={current.enabled}
            onChange={(e) => setDraft({ ...current, enabled: e.target.checked })}
            className="h-4 w-4 accent-(--rz-accent)"
          />
          Require second approval for payments above
        </label>
        <div>
          <label htmlFor="threshold" className="sr-only">
            Threshold (AUD)
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">A$</span>
            <input
              id="threshold"
              type="number"
              min={1}
              step={1000}
              value={current.thresholdMajor}
              disabled={!current.enabled}
              onChange={(e) => setDraft({ ...current, thresholdMajor: e.target.value })}
              className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm tabular-nums disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>
        <Button
          disabled={!dirty || saveMutation.isPending}
          onClick={() =>
            saveMutation.mutate({
              enabled: current.enabled,
              thresholdMinor: toMinor('AUD', Number(current.thresholdMajor) || 0),
            })
          }
        >
          {saveMutation.isPending ? 'Saving…' : 'Save rule'}
        </Button>
      </div>
      {saveMutation.isError && (
        <p className="mt-2 text-sm text-red-600">{(saveMutation.error as Error).message}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Applies at booking time. Flagged payments hold in "Booked" and cannot be funded until a
        second user approves them here.
      </p>
    </Card>
  )
}

export function ApprovalsPage() {
  const services = useServices()
  const queryClient = useQueryClient()
  const { clientId, role, userName } = useSession()

  const { data: pending, isPending } = useQuery({
    queryKey: ['approvals', clientId],
    queryFn: () => services.approvals.listPending(clientId!),
    enabled: !!clientId,
  })

  const decideMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) =>
      decision === 'approve'
        ? services.approvals.approve(id, userName ?? 'Admin')
        : services.approvals.reject(id, userName ?? 'Admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', clientId] })
      queryClient.invalidateQueries({ queryKey: ['payments', clientId] })
    },
  })

  // client-admin surface
  if (role !== 'client_admin') return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-xl font-bold text-brand">Approvals</h1>

      <RuleSettings clientId={clientId!} />

      <Card title={`Awaiting approval (${pending?.length ?? 0})`}>
        {isPending ? (
          <SkeletonRows rows={2} />
        ) : (pending ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Queue is clear — no payments awaiting approval.
          </p>
        ) : (
          <ul className="space-y-3">
            {(pending ?? []).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3"
              >
                <div className="text-sm">
                  <Link to={`/payments/${p.id}`} className="font-bold text-accent hover:underline">
                    {p.reference}
                  </Link>
                  <span className="ml-2 text-gray-700">
                    {formatMoney(p.sellAmount)} → {p.beneficiaryName} ({pairKey(p.pair)})
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Booked {new Date(p.createdAt).toLocaleString('en-AU')} · above the{' '}
                    {p.approval && formatMoney(money('AUD', p.approval.thresholdMinor))} threshold
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={decideMutation.isPending}
                    onClick={() => decideMutation.mutate({ id: p.id, decision: 'approve' })}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={decideMutation.isPending}
                    onClick={() => decideMutation.mutate({ id: p.id, decision: 'reject' })}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {decideMutation.isError && (
          <p className="mt-2 text-sm text-red-600">{(decideMutation.error as Error).message}</p>
        )}
      </Card>
    </div>
  )
}
