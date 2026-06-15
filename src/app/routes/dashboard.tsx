import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useRestaurantStore } from '@/store/restaurantStore'
import { Spinner } from '@/components/ui/Spinner'
import { Sidebar } from '@/modules/dashboard/components/Sidebar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { ImpersonationBanner } from '@/modules/super-admin/components/ImpersonationBanner'
import { useLoadTerminology } from '@/modules/services/hooks/useLoadTerminology'

export { DashboardHome } from '@/modules/dashboard/pages/DashboardHome'

export function DashboardPage() {
  const { loading, initialized, isAuthenticated } = useAuth()
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const setBusinessType = useRestaurantStore(s => s.setBusinessType)
  const setPlan         = useRestaurantStore(s => s.setPlan)
  const location        = useLocation()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    setBusinessType(restaurant?.business_type ?? 'gastronomy')
    setPlan(restaurant?.plan ?? null)
  }, [restaurant?.business_type, restaurant?.plan, setBusinessType, setPlan])

  // Load terminology for Services vertical (no-op for gastronomy/retail)
  useLoadTerminology(restaurant?.id)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  if ((!initialized || loading) && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // hub_free users: always redirect to hub editor (only page available)
  if (!restaurantLoading && restaurant?.plan === 'hub_free' &&
      !location.pathname.startsWith('/dashboard/hub')) {
    return <Navigate to="/dashboard/hub" replace />
  }
  // Redirect new OS users to onboarding until they complete it
  if (!restaurantLoading && restaurant && restaurant.plan !== 'hub_free' && restaurant.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />
  }

  // Auth succeeded but no restaurant found — INSERT probably failed during registration
  if (!restaurantLoading && isAuthenticated && !restaurant) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0F1115',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '36px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '17px', fontWeight: 700, color: '#F5F7FA', margin: '0 0 10px' }}>
            Hubo un problema al crear tu perfil
          </h2>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Tu cuenta fue creada pero no pudimos configurar tu negocio.
            Intentá de nuevo o contactanos.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%', padding: '12px', borderRadius: '50px', border: 'none',
              background: '#F4705A', color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-jakarta)', marginBottom: '12px',
            }}
          >
            Reintentar
          </button>
          <a
            href="https://wa.me/543416962827"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-jakarta)', fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}
          >
            Contactar soporte →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-1 text-ink-1 dashboard-body">
      <ImpersonationBanner />
      {/* Sidebar — visible sólo en desktop */}
      <Sidebar restaurantSlug={restaurant?.slug} restaurantName={restaurant?.name} />

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
