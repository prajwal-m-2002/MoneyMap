import { Bell, LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'

interface TopBarProps {
  title?: string
}

/** Mobile top bar — visible only on mobile (md and below) */
export function TopBar({ title }: TopBarProps) {
  const { user, signOut } = useAuth()
  const userInitial = user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header
      id="top-bar"
      className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-[var(--bg-surface)] border-b border-[var(--border)]"
    >
      <Logo variant="full" size="sm" />

      <div className="flex items-center gap-1.5">
        {title && (
          <span className="text-sm font-semibold text-[var(--text-secondary)] mr-2">
            {title}
          </span>
        )}
        <button
          id="notifications-btn"
          aria-label="Notifications"
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-all duration-150"
        >
          <Bell size={18} strokeWidth={2} />
        </button>
        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-1 pl-1 ml-1 border-l border-[var(--border)]">
            <div
              className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold border border-brand-300/40 overflow-hidden"
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
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
