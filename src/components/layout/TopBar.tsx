import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Bell,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  PieChart,
  Receipt,
  BarChart3,
  TrendingUp,
  FileText,
  CreditCard,
  BookMarked,
  Settings,
  CalendarSync,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
}

const ALL_NAV_ITEMS = [
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

/** Mobile top bar — visible only on mobile (md and below) */
export function TopBar({ title }: TopBarProps) {
  const { user, signOut, isDemoMode } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const userInitial = user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      <header
        id="top-bar"
        className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-3 sm:px-4 bg-[var(--bg-surface)] border-b border-[var(--border)]"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="mobile-drawer-toggle"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setDrawerOpen(o => !o)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] active:scale-95 transition-all"
          >
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Logo variant="full" size="sm" />
        </div>

        <div className="flex items-center gap-1">
          {title && (
            <span className="text-sm font-semibold text-[var(--text-secondary)] mr-2 truncate max-w-[120px]">
              {title}
            </span>
          )}
          <button
            id="notifications-btn"
            aria-label="Notifications"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all duration-150"
          >
            <Bell size={18} strokeWidth={2} />
          </button>
          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-1 pl-1 ml-1 border-l border-[var(--border)]">
              <div
                className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold border border-brand-300/40 overflow-hidden shrink-0"
                title={user.email}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
              <button
                id="topbar-signout"
                onClick={() => signOut()}
                aria-label="Sign out"
                title="Sign out"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[var(--bg-surface)] border-r border-[var(--border)] shadow-2xl flex flex-col pt-safe pb-safe animate-slide-in-left"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <Logo variant="full" size="sm" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {ALL_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    )
                  }
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Drawer Footer with user info & sign out */}
            {user && (
              <div className="p-4 border-t border-[var(--border)] space-y-3 bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold border border-brand-300/40 shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      userInitial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {user.fullName || user.email.split('@')[0]}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {isDemoMode ? 'Demo Session' : user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false)
                    signOut()
                  }}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
