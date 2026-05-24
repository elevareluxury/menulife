import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'
import { Sidebar } from '@/modules/dashboard/components/Sidebar'
import { BottomNav } from '@/components/dashboard/BottomNav'

export { DashboardHome } from '@/modules/dashboard/pages/DashboardHome'

export function DashboardPage() {
  const { loading, initialized, isAuthenticated } = useAuth()
  const { restaurant } = useRestaurant()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-surface-1 text-ink-1 dashboard-body">
      {/* Sidebar — visible sólo en desktop */}
      <Sidebar restaurantSlug={restaurant?.slug} />

      {/* Área de contenido — se desplaza a la derecha del sidebar en desktop */}
      <div className="lg:pl-60">
        <main className="px-4 py-2 pb-[calc(72px+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — visible sólo en mobile */}
      <BottomNav restaurantSlug={restaurant?.slug} />
    </div>
  )
}
