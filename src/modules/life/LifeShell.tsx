import { useState, useEffect } from 'react'
import { useMarkActive } from '@/lib/activity'
import { MotionConfig } from 'framer-motion'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { LifeNav } from './components/LifeNav'
import { AchievementToast } from './components/AchievementToast'
import { OfflineBanner } from './components/OfflineBanner'
import { flushOutbox, pendingFor } from './lib/outbox'
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
import { usePrefs } from '@/lib/prefs'
import { useH1Title } from '@/lib/useH1Title'
import { appServiceWorker, isInstalledApp } from '@/lib/notifications'
import { syncPushSubscription } from '@/lib/webPush'
import { useReminderOpened } from './lib/reminderOpen'
import './life.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function LifeShell() {
  const { user, loading, initialized } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan } = useLifeStore()
  const [timedOut, setTimedOut] = useState(false)
  // "Hoy", meses y horas usan la zona de la cuenta (user_settings.timezone): se espera a tener las preferencias para
  // no leer ni guardar nada con el día del celular (si tardan, a los 5 s se sigue con la zona del dispositivo)
  const prefsReady = usePrefs(s => !!user && s.loadedFor === user.id)
  useTaskReminders(user?.id)
  useHabitReminders(user?.id)
  useReminderOpened(user?.id)
  // "Usé Mycen hoy" para el panel → Crecimiento (una vez por día; sin contenido)
  useMarkActive(user?.id, 'life')
  // Service worker para los avisos (en el celular sólo salen desde ahí): instalada en el inicio o con avisos permitidos.
  // Con avisos permitidos, el dispositivo queda suscrito para recibirlos con la app cerrada (Web Push)
  useEffect(() => {
    if (!user?.id) return
    const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
    if (granted) void syncPushSubscription()
    else if (isInstalledApp()) void appServiceWorker()
  }, [user?.id])
  const dir = langDir(useAppLang(s => s.lang))
  // Título de la pestaña con el de la pantalla ("Brain · Mycen")
  useH1Title('Mycen')

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
  useEffect(() => { if (user && (prefsReady || timedOut)) registerVisit(user.id, dayKey()) }, [user, prefsReady, timedOut])

  // Capturas guardadas sin conexión: se suben al entrar, cuando vuelve la red, al volver a la app y cada minuto mientras
  // quede algo (en iPhone el evento "online" a veces no llega: señal débil o sesión renovada al volver de segundo plano)
  useEffect(() => {
    if (!user) return
    const flush = () => { if (pendingFor(user.id) > 0) void flushOutbox(user.id) }
    const onVisible = () => { if (document.visibilityState === 'visible') flush() }
    void flushOutbox(user.id)
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    const id = window.setInterval(flush, 60_000)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(id)
    }
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
  }, [user, setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan])

  if ((!initialized || loading || (user && !prefsReady)) && !timedOut) {
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
      // Lo último de cada pantalla ("⋯" de la última fila, "Cerrar sesión") queda arriba de la barra de abajo
      // (16 px desde abajo + 56 de alto; el + va adentro de la barra)
      paddingBottom: 'calc(104px + env(safe-area-inset-bottom))',
    }}>
      {/* "Reducir movimiento" apaga las animaciones de Life OS (también las de framer-motion) */}
      <MotionConfig reducedMotion="user">
        <OfflineBanner />
        <Outlet />
        <AchievementToast />
        <LifeNav />
      </MotionConfig>
    </div>
  )
}
