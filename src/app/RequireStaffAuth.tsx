/**
 * RequireStaffAuth
 *
 * Protege rutas de staff (KDS, mozo app, delivery app).
 * Permite el acceso si hay sesión válida de:
 *   - Propietario autenticado con Supabase (authStore)
 *   - Mozo autenticado con PIN para este slug (waiterAuthStore)
 *   - Repartidor autenticado para este slug (deliveryAuthStore)
 *
 * La verificación de mozo/delivery es sincrónica (zustand/persist
 * rehidrata desde localStorage antes del primer render).
 * La del propietario puede tardar un tick (getSession de Supabase)
 * — mostramos un spinner en ese caso.
 */
import type { ReactNode } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { useDeliveryAuthStore } from '@/store/deliveryAuthStore'

interface RequireStaffAuthProps {
  children: ReactNode
  loginPath: string | ((slug: string) => string)
  allowOwner?: boolean
  allowWaiter?: boolean
  allowDelivery?: boolean
}

export function RequireStaffAuth({
  children,
  loginPath,
  allowOwner = true,
  allowWaiter = true,
  allowDelivery = true,
}: RequireStaffAuthProps) {
  const { slug } = useParams<{ slug: string }>()

  const { user, loading: authLoading, initialized } = useAuthStore()
  const waiterAuth   = useWaiterAuthStore()
  const deliveryAuth = useDeliveryAuthStore()

  // Waiter/delivery sessions are synchronous (persist rehydrates before render)
  const isWaiter =
    allowWaiter &&
    !!waiterAuth.token &&
    !!waiterAuth.waiter &&
    waiterAuth.restaurantSlug === slug

  const isDelivery =
    allowDelivery &&
    !!deliveryAuth.token &&
    !!deliveryAuth.driver &&
    deliveryAuth.restaurantSlug === slug

  // If waiter or delivery session matches this slug — allow immediately
  if (isWaiter || isDelivery) {
    return <>{children}</>
  }

  // Owner auth via Supabase may still be initializing — wait before redirecting
  if (allowOwner && !initialized && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1115' }}>
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#F4705A' }}
        />
      </div>
    )
  }

  const isOwner = allowOwner && !!user

  if (isOwner) {
    return <>{children}</>
  }

  // No valid session — redirect to login
  const redirectTo =
    typeof loginPath === 'function' ? loginPath(slug ?? '') : loginPath

  return <Navigate to={redirectTo} replace />
}
