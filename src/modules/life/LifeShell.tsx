import { useState, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
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
import { registerVisit } from './lib/kindMoments'
import { dayKey } from './hooks/useToday'
import { useTaskReminders } from './hooks/useTaskReminders'
import { useHabitReminders } from './hooks/useHabitReminders'
import { useAppBackground } from '@/lib/useAppBackground'
import { useAppLang } from '@/i18n/app/store'
import { langDir } from '@/i18n/app/languages'
import { colors } from './design-system'
import { THEME_BG } from '@/design/themes'
import { usePrefersLight } from '@/modules/profile/lib/usePrefersLight'
import './life.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function LifeShell() {
  const { user, loading, initialized } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan } = useLifeStore()
  const [timedOut, setTimedOut] = useState(false)
  useTaskReminders(user?.id)
  useHabitReminders(user?.id)
  const dir = langDir(useAppLang(s => s.lang))

  // Tema del sistema de diseño según el celular (Amanecer con el modo claro, Universo con el oscuro). Va en <html>
  // para que lo hereden también las hojas y diálogos que se abren en un portal.
  const theme = usePrefersLight() ? 'amanecer' : 'universo'
  useEffect(() => {
    const html = document.documentElement
    const prev = html.getAttribute('data-mycen-theme')
    html.setAttribute('data-mycen-theme', theme)
    return () => { if (prev) html.setAttribute('data-mycen-theme', prev); else html.removeAttribute('data-mycen-theme') }
  }, [theme])
  // html y body con el fondo del tema: sin flashes ni franjas de otro color al llegar a los bordes
  useAppBackground(THEME_BG[theme])

  // Safety timeout — same pattern as DashboardPage
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  // Anota la visita del día (para dar la bienvenida a quien vuelve después de unos días; lib/kindMoments.ts)
  useEffect(() => { if (user) registerVisit(user.id, dayKey()) }, [user])

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
      <div data-mycen-theme={theme} style={{
        minHeight: '100dvh', background: colors.bg,
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
    <div data-scroll-root data-mycen-theme={theme} dir={dir} style={{
      height: '100dvh',
      overflowY: 'auto',
      overscrollBehaviorY: 'contain',
      WebkitOverflowScrolling: 'touch',
      background: colors.bg,
      color: colors.text.primary,
      paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
    }}>
      {/* "Reducir movimiento" apaga las animaciones de Life OS (también las de framer-motion) */}
      <MotionConfig reducedMotion="user">
        <OfflineBanner />
        <Outlet />
        <CaptureButton />
        <AchievementToast />
        <LifeNav />
      </MotionConfig>
    </div>
  )
}
