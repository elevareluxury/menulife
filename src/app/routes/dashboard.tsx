import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { DashboardLayout } from '@/modules/dashboard/components/DashboardLayout'
import { DashboardHome } from '@/modules/dashboard/pages/DashboardHome'
import { ROUTES } from '@/lib/constants'

export function DashboardPage() {
  const { loading, isAuthenticated, isSuperAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (isSuperAdmin) return <Navigate to={ROUTES.SUPER_ADMIN} replace />

  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  )
}
