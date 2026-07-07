import { useQuery } from '@tanstack/react-query'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { CURRENCY_FLAGS, CURRENCY_NAMES, formatMoney } from '@rz/domain'
import { useServices } from '../../services'

export function BalancesGrid({ clientId }: { clientId: string }) {
  const services = useServices()
  const { data, isPending } = useQuery({
    queryKey: ['balances', clientId],
    queryFn: () => services.accounts.getBalances(clientId),
  })

  return (
    <Card title="Account balances">
      {isPending ? (
        <SkeletonRows rows={3} />
      ) : !data?.length ? (
        <EmptyState message="No currency accounts yet." />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.map((b) => (
            <div key={b.currency} className="rounded-md border border-gray-100 bg-surface p-3">
              <p className="text-xs font-bold text-gray-500">
                <span aria-hidden>{CURRENCY_FLAGS[b.currency]}</span> {b.currency}
                <span className="ml-1 font-normal text-gray-400">{CURRENCY_NAMES[b.currency]}</span>
              </p>
              <p className="mt-1 text-lg font-bold text-brand">{formatMoney(b.available, { withCode: false })}</p>
              {b.pending.minor > 0 && (
                <p className="text-xs text-amber-600">{formatMoney(b.pending, { withCode: false })} reserved</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
