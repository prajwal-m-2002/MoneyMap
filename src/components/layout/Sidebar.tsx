import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PieChart,
  Receipt,
  BarChart3,
  TrendingUp,
  FileText,
  CreditCard,
  BookMarked,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CalendarSync,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Home' },
  { to: '/spending',     icon: PieChart,        label: 'Spending' },
  { to: '/transactions', icon: Receipt,         label: 'Transactions' },
  { to: '/analysis',     icon: BarChart3,        label: 'Analysis' },
  { to: '/investments',  icon: TrendingUp,      label: 'Investments' },
  { to: '/recurring',    icon: CalendarSync,    label: 'Recurring' },
  { to: '/statements',   icon: FileText,         label: 'Statements' },
  { to: '/emis',         icon: CreditCard,       label: 'EMIs' },
  { to: '/presets',      icon: BookMarked,       label: 'Presets' },
  { to: '/settings',     icon: Settings,         label: 'Settings' },
]

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const { user, signOut, isDemoMode } = useAuth()

  const userInitial = user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <aside
      id="sidebar"
      aria-label="Main navigation"
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 z-30',
        'bg-[var(--bg-surface)] border-r border-[var(--border)]',
        'transition-[width] duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-[var(--border)]',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {collapsed ? (
          <Logo variant="icon" size="sm" />
        ) : (
          <Logo variant="full" size="sm" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            id={`nav-${label.toLowerCase()}`}
            className={({ isActive }) =>
              cn(
                'nav-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User profile & auth controls */}
      {user && (
        <div className="px-2 py-2 border-t border-[var(--border)]">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div
                className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold border border-brand-300/40"
                title={`${user.fullName || user.email}${isDemoMode ? ' (Demo)' : ''}`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <button
                id="sidebar-signout-collapsed"
                onClick={() => signOut()}
                title="Sign out"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0 border border-brand-300/40 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.fullName || user.email.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {isDemoMode ? 'Demo Session' : user.email}
                  </p>
                </div>
              </div>
              <button
                id="sidebar-signout"
                onClick={() => signOut()}
                title="Sign out"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={cn(
          'flex items-center p-3 border-t border-[var(--border)] gap-2',
          collapsed ? 'flex-col' : 'justify-between'
        )}
      >
        <ThemeToggle />
        <button
          id="sidebar-collapse-toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
