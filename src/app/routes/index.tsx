import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'

export function ProtectedRoute({ superAdminOnly = false }: { superAdminOnly?: boolean }) {
  const { user, role, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (superAdminOnly && role !== 'super_admin') return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export function PublicRoute() {
  const { user, role, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={role === 'super_admin' ? '/super-admin' : '/dashboard'} replace />
  }

  return <Outlet />
}
