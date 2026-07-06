import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SelectField, TextField } from '../../components/ui/Field'
import { useServices } from '../../services'
import { ROLE_LABELS, useSession, type Role } from '../../store/session'
import { activeTheme } from '../../theme'

const ROLES: Role[] = ['client_user', 'client_admin', 'ops_user']

export function LoginPage() {
  const services = useServices()
  const login = useSession((s) => s.login)
  const navigate = useNavigate()

  const [name, setName] = useState('Priya Sharma')
  const [role, setRole] = useState<Role>('client_user')
  const [clientId, setClientId] = useState('')

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => services.clients.getClients(),
  })

  useEffect(() => {
    if (!clientId && clients?.length) setClientId(clients[0].id)
  }, [clients, clientId])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!clientId) return
    login(name.trim() || 'Demo User', role, clientId)
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            {activeTheme.logoMark}
          </span>
          <h1 className="text-2xl font-bold text-white">{activeTheme.productName}</h1>
          <p className="mt-1 text-sm text-white/60">Cross-border FX client portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-lg">
          <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-brand">
            Demo sign-in — pick a role and entity. No real authentication in the prototype.
          </p>
          <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Client entity" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.segment}
              </option>
            ))}
          </SelectField>
          <Button type="submit" className="w-full" disabled={!clientId}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">{activeTheme.companyLine}</p>
      </div>
    </div>
  )
}
