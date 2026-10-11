import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PieChart,
  Receipt,
  BarChart3,
  TrendingUp,
  CreditCard,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Home' },
  { to: '/spending',     icon: PieChart,        label: 'Spending' },
  { to: '/transactions', icon: Receipt,         label: 'Txns' },
  { to: '/investments',  icon: TrendingUp,      label: 'Invest' },
  { to: '/analysis',     icon: BarChart3,        label: 'Analysis' },
  { to: '/emis',         icon: CreditCard,       label: 'EMIs' },
  { to: '/settings',     icon: Settings,         label: 'Settings' },
]

/** Mobile bottom tab bar — visible on screens < md */
export function MobileNav() {
  return (
    <nav
      id="mobile-nav"
      aria-label="Mobile navigation"
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0 z-40',
        'bg-[var(--bg-surface)] border-t border-[var(--border)]',
        'flex items-center justify-around',
        'h-16 px-1 pb-safe',
        'shadow-[0_-1px_0_0_var(--border)]'
      )}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          id={`mobile-nav-${label.toLowerCase()}`}
          aria-label={label}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 flex-1 py-2 px-1',
              'text-[var(--text-secondary)] transition-colors duration-150',
              isActive && 'text-brand-500 dark:text-brand-400'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                size={19}
                strokeWidth={isActive ? 2.5 : 2}
                className="shrink-0"
              />
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
