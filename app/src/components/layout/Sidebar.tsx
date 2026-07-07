import { NavLink } from 'react-router-dom'
import { useSession } from '../../store/session'
import { useTheme } from '../../store/theme'

interface NavItem {
  to: string
  label: string
  icon: string
  roles?: Array<'client_user' | 'client_admin' | 'ops_user'>
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/quote', label: 'New payment', icon: '⇄' },
  { to: '/payments', label: 'Payments', icon: '≡' },
  { to: '/beneficiaries', label: 'Beneficiaries', icon: '☺' },
  { to: '/forwards', label: 'Forwards', icon: '⧗' },
  { to: '/statements', label: 'Statements', icon: '▤' },
  { to: '/approvals', label: 'Approvals', icon: '✓', roles: ['client_admin'] },
  { to: '/ops', label: 'Ops console', icon: '◎', roles: ['ops_user'] },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const theme = useTheme((s) => s.theme)
  const role = useSession((s) => s.role)
  const visible = navItems.filter((item) => !item.roles || (role && item.roles.includes(role)))

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-brand text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          {theme.logoMark}
        </span>
        <span className="text-lg font-bold tracking-tight">{theme.productName}</span>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-3" aria-label="Main">
        {visible.map((item) => (
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
        ))}
      </nav>
      <p className="px-5 py-4 text-[10px] leading-relaxed text-white/40">
        Prototype — mock data only. Not a live trading system.
      </p>
    </aside>
  )
}
