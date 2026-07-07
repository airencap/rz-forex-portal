import { NavLink } from 'react-router-dom'
import { activeTheme } from '../../theme'

const navItems: Array<{ to: string; label: string; icon: string; phase2?: boolean }> = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/quote', label: 'New payment', icon: '⇄' },
  { to: '/payments', label: 'Payments', icon: '≡' },
  { to: '/beneficiaries', label: 'Beneficiaries', icon: '☺' },
  { to: '/forwards', label: 'Forwards', icon: '⧗' },
  { to: '/statements', label: 'Statements', icon: '▤' },
]

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-brand text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          {activeTheme.logoMark}
        </span>
        <span className="text-lg font-bold tracking-tight">{activeTheme.productName}</span>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-3" aria-label="Main">
        {navItems.map((item) =>
          item.phase2 ? (
            <span
              key={item.to}
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-white/40"
              title="Coming in Phase 2"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
              <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase">soon</span>
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
      <p className="px-5 py-4 text-[10px] leading-relaxed text-white/40">
        Prototype — mock data only. Not a live trading system.
      </p>
    </aside>
  )
}
