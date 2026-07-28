import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../../lib/hooks/useAuth'
import { getToken } from '../../lib/api/client'

export function AuthGuard() {
  const location = useLocation()
  const hasToken = !!getToken()
  const { data: user, isLoading } = useCurrentUser()

  if (!hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-text-muted">
        Loading...
      </div>
    )
  }

  if (!user) {
    // token exists but /me failed (expired/invalid) — treat as logged out
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}