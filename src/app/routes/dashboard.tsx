import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useRestaurantStore } from '@/store/restaurantStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { Sidebar } from '@/modules/dashboard/components/Sidebar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { ImpersonationBanner } from '@/modules/super-admin/components/ImpersonationBanner'
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator'
import { useLoadTerminology } from '@/modules/services/hooks/useLoadTerminology'
import type { Restaurant } from '@/types/restaurant'

export { DashboardHome } from '@/modules/dashboard/pages/DashboardHome'

export function DashboardPage() {
  const { loading, initialized, isAuthenticated, user } = useAuth()
  const {
    restaurant,
    isInitialized,
    isLoading: restaurantLoading,
    setRestaurant,
    setLoading,
    setError,
  } = useRestaurantStore()
  const location = useLocation()
  const [timedOut, setTimedOut] = useState(false)

  // Hidratar el store una sola vez cuando el usuario está autenticado
  useEffect(() => {
    if (isInitialized) return
    if (!user?.id) return

    setLoading(true)
    supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[restaurantStore] Error al hidratar:', error)
          setError('No se pudo cargar el negocio')
        } else {
          setRestaurant(data as Restaurant | null)
        }
      })
  }, [user?.id, isInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load terminology for Services vertical (no-op for gastronomy/retail)
  useLoadTerminology(restaurant?.id)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  if ((!initialized || loading || restaurantLoading) && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // hub_free users: always redirect to hub editor (only page available)
  if (isInitialized && restaurant?.plan === 'hub_free' &&
      !location.pathname.startsWith('/dashboard/hub')) {
    return <Navigate to="/dashboard/hub" replace />
  }
  // Redirect new OS users to onboarding until they complete it
  if (isInitialized && restaurant && restaurant.plan !== 'hub_free' && restaurant.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />
  }

  // No restaurant — Life OS user navigating to /dashboard. Redirect to home.
  if (isInitialized && isAuthenticated && !restaurant) {
    return <Navigate to="/life" replace />
  }

  return (
    <div className="min-h-screen bg-surface-1 text-ink-1 dashboard-body">
      <ImpersonationBanner />
      {/* Sidebar — visible sólo en desktop */}
      <Sidebar restaurantSlug={restaurant?.slug} restaurantName={restaurant?.name} />

      {/* Área de contenido — se desplaza a la derecha del sidebar en desktop */}
      <div className="lg:pl-60">
        <div className="sticky top-0 z-40 flex justify-center pt-2 px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <RealtimeStatusIndicator />
          </div>
        </div>
        <main className="px-4 py-2 pb-[calc(72px+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation — visible sólo en mobile */}
      <BottomNav restaurantSlug={restaurant?.slug} />
    </div>
  )
}
