import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'

/** Root layout shell — sidebar (desktop) + top bar + mobile nav */
export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-dvh bg-[var(--bg-app)]" id="app-shell">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-x-hidden bg-[var(--bg-app)]">
        {/* Mobile top bar */}
        <TopBar />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-6 animate-fade-in"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
