import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { StatusChip } from '../../components/ui/StatusChip'
import { formatMoney, pairKey } from '@rz/domain'
import { useServices } from '../../services'

export function RecentPayments({ clientId }: { clientId: string }) {
  const services = useServices()
  const { data, isPending } = useQuery({
    queryKey: ['payments', clientId],
    queryFn: () => services.payments.list({ clientId }),
  })

  const recent = (data ?? []).slice(0, 6)

  return (
    <Card
      title="Recent payments"
      action={
        <Link to="/payments" className="text-xs font-bold text-accent hover:underline">
          View all →
        </Link>
      }
    >
      {isPending ? (
        <SkeletonRows rows={5} />
      ) : recent.length === 0 ? (
        <EmptyState
          message="No payments yet. Book your first FX payment to get started."
          action={
            <Link to="/quote">
              <Button>New payment</Button>
            </Link>
          }
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-2 font-bold">Reference</th>
              <th className="pb-2 font-bold">Beneficiary</th>
              <th className="pb-2 font-bold">Pair</th>
              <th className="pb-2 text-right font-bold">You send</th>
              <th className="pb-2 text-right font-bold">They receive</th>
              <th className="pb-2 text-right font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((p) => (
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
                </td>
                <td className="py-2.5 text-gray-600">{p.beneficiaryName}</td>
                <td className="py-2.5 text-gray-500">{pairKey(p.pair)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatMoney(p.sellAmount)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatMoney(p.buyAmount)}</td>
                <td className="py-2.5 text-right">
                  <StatusChip state={p.state} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
