import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useServices } from '../../services'
import { ROLE_LABELS, useSession } from '../../store/session'
import { Button } from '../ui/Button'

export function TopBar() {
  const services = useServices()
  const { userName, role, clientId, switchClient, logout } = useSession()
  const navigate = useNavigate()

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => services.clients.getClients(),
  })

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <label htmlFor="entity-switcher" className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Entity
        </label>
        <select
          id="entity-switcher"
          value={clientId ?? ''}
          onChange={(e) => switchClient(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-brand"
        >
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-brand">{userName}</p>
          <p className="text-xs text-gray-400">{role ? ROLE_LABELS[role] : ''}</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
