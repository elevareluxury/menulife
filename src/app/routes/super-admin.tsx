import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { SuperAdminLayout } from '@/modules/super-admin/components/SuperAdminLayout'
import { SuperDashboard } from '@/modules/super-admin/pages/SuperDashboard'
import { ROUTES } from '@/lib/constants'

export function SuperAdminPage() {
  const { loading, isAuthenticated, isSuperAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (!isSuperAdmin) return <Navigate to={ROUTES.DASHBOARD} replace />

  return (
    <SuperAdminLayout>
      <SuperDashboard />
    </SuperAdminLayout>
  )
}
