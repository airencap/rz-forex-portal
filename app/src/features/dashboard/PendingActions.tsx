import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { formatMoney, pairKey } from '@rz/domain'
import { useServices } from '../../services'

export function PendingActions({ clientId }: { clientId: string }) {
  const services = useServices()

  const paymentsQuery = useQuery({
    queryKey: ['payments', clientId],
    queryFn: () => services.payments.list({ clientId }),
  })
  const forwardsQuery = useQuery({
    queryKey: ['forwards', clientId],
    queryFn: () => services.forwards.list(clientId),
  })

  if (paymentsQuery.isPending || forwardsQuery.isPending) {
    return (
      <Card title="Pending actions">
        <SkeletonRows rows={2} />
      </Card>
    )
  }

  const awaitingApproval = (paymentsQuery.data ?? []).filter(
    (p) => p.approval?.status === 'pending',
  )
  const awaitingFunds = (paymentsQuery.data ?? []).filter(
    (p) =>
      (p.state === 'booked' || p.state === 'funds_pending') && p.approval?.status !== 'pending',
  )
  const FOURTEEN_DAYS = 14 * 24 * 3600 * 1000
  const approachingForwards = (forwardsQuery.data ?? []).filter(
    (f) =>
      f.status === 'open' &&
      new Date(f.valueDate).getTime() - Date.now() < FOURTEEN_DAYS &&
      new Date(f.valueDate).getTime() > Date.now(),
  )

  const items = [
    ...awaitingApproval.map((p) => ({
      key: `appr-${p.id}`,
      to: `/payments/${p.id}`,
      icon: '✋',
      text: `${p.reference} · ${formatMoney(p.sellAmount)} to ${p.beneficiaryName} needs second approval`,
    })),
    ...awaitingFunds.map((p) => ({
      key: p.id,
      to: `/payments/${p.id}`,
      icon: '⚠',
      text: `${p.reference} · ${formatMoney(p.sellAmount)} to ${p.beneficiaryName} is awaiting funding`,
    })),
    ...approachingForwards.map((f) => ({
      key: f.id,
      to: '/forwards',
      icon: '⧗',
      text: `Forward ${f.reference} (${pairKey(f.pair)}, ${formatMoney(f.notional)}) settles ${f.valueDate}`,
    })),
  ]

  return (
    <Card title="Pending actions">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">All clear — nothing needs your attention.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                to={item.to}
                className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-gray-700 hover:border-amber-300"
              >
                <span aria-hidden>{item.icon}</span>
                <span>{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
