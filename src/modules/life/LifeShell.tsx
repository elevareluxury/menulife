import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { LifeNav } from './components/LifeNav'
import { CaptureButton } from './components/CaptureButton'
import { AchievementToast } from './components/AchievementToast'
import { OfflineBanner } from './components/OfflineBanner'
import { flushOutbox } from './lib/outbox'
import { useTaskReminders } from './hooks/useTaskReminders'
import { useHabitReminders } from './hooks/useHabitReminders'
import { useAppBackground } from '@/lib/useAppBackground'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function LifeShell() {
  const { user, loading, initialized } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan } = useLifeStore()
  const [timedOut, setTimedOut] = useState(false)
  useTaskReminders(user?.id)
  useHabitReminders(user?.id)
  const dir = langDir(useAppLang(s => s.lang))

  // Fondo oscuro en html y body: sin flashes blancos ni franjas al llegar a los bordes
  useAppBackground('#0F1115')

  // Safety timeout — same pattern as DashboardPage
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  // Capturas guardadas sin conexión: se suben al entrar y cada vez que vuelve la red
  useEffect(() => {
    if (!user) return
    const flush = () => { void flushOutbox() }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [user])

  // Detect if user has a business restaurant (for showing the "Mi negocio" link)
  useEffect(() => {
    if (!user) return
    db.from('restaurants')
      .select('id,name,slug,plan')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string; name: string; slug: string; plan: string | null } | null }) => {
        setHasRestaurant(!!data)
        setRestaurantName(data?.name ?? null)
        setRestaurantSlug(data?.slug ?? null)
        setRestaurantPlan(data?.plan ?? null)
      })
  }, [user, setHasRestaurant])

  if ((!initialized || loading) && !timedOut) {
    return (
      <div style={{
        minHeight: '100dvh', background: '#0F1115',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    // Marco de app: la página no scrollea, scrollea este contenedor. Así iOS no mueve
    // el menú ni el botón + (rebote / barra de Safari) y si el contenido entra no hay scroll.
    <div data-scroll-root dir={dir} style={{
      height: '100dvh',
      overflowY: 'auto',
      overscrollBehaviorY: 'contain',
      WebkitOverflowScrolling: 'touch',
      background: '#0F1115',
      color: '#F5F7FA',
      paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
    }}>
      <OfflineBanner />
      <Outlet />
      <CaptureButton />
      <AchievementToast />
      <LifeNav />
    </div>
  )
}
