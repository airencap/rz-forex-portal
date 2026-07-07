import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../../store/session'
import { ClientsPanel } from './ClientsPanel'
import { MonitorPanel } from './MonitorPanel'
import { RailsPanel } from './RailsPanel'
import { RevenuePanel } from './RevenuePanel'

const TABS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'clients', label: 'Clients & tiers' },
  { key: 'monitor', label: 'Payment monitor' },
  { key: 'rails', label: 'Rails' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function OpsPage() {
  const role = useSession((s) => s.role)
  const [tab, setTab] = useState<TabKey>('revenue')

  // ops-only surface
  if (role !== 'ops_user') return <Navigate to="/" replace />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-brand">Ops console</h1>
        <p className="text-sm text-gray-500">AW Fintech — across all clients</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Ops console sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.key
                ? 'border-accent text-brand'
                : 'border-transparent text-gray-400 hover:text-brand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && <RevenuePanel />}
      {tab === 'clients' && <ClientsPanel />}
      {tab === 'monitor' && <MonitorPanel />}
      {tab === 'rails' && <RailsPanel />}
    </div>
  )
}
