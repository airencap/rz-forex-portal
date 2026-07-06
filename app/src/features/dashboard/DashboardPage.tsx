import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useServices } from '../../services'
import { useSession } from '../../store/session'
import { BalancesGrid } from './BalancesGrid'
import { IndicativeRatesPanel } from './IndicativeRatesPanel'
import { PendingActions } from './PendingActions'
import { RecentPayments } from './RecentPayments'

export function DashboardPage() {
  const services = useServices()
  const clientId = useSession((s) => s.clientId)!

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => services.clients.getClients(),
  })
  const client = clients?.find((c) => c.id === clientId)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand">Dashboard</h1>
          {client && <p className="text-sm text-gray-500">{client.name}</p>}
        </div>
        <Link to="/quote">
          <Button>New payment</Button>
        </Link>
      </div>

      <BalancesGrid clientId={clientId} />

      <div className="grid gap-5 lg:grid-cols-2">
        <IndicativeRatesPanel clientId={clientId} pairs={client?.frequentPairs ?? []} />
        <PendingActions clientId={clientId} />
      </div>

      <RecentPayments clientId={clientId} />
    </div>
  )
}
