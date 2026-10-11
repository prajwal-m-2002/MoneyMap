import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'

interface ProtectedRouteProps {
  children?: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-app)]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Logo variant="full" size="md" />
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            Loading MoneyMap session...
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    // Preserve attempted URL location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
