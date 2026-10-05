import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { colors, radius } from './design-system'
import { LifeNav } from './components/LifeNav'
import { CaptureButton } from './components/CaptureButton'
import { AchievementToast } from './components/AchievementToast'
import { LifeSettingsModal } from './components/LifeSettingsModal'
import { InstallAppModalIOS } from './components/InstallAppModalIOS'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function LifeShell() {
  const { user, loading, initialized } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan, setOnboardingCompleted } = useLifeStore()
  const [timedOut, setTimedOut]       = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [iosModalOpen, setIosModalOpen] = useState(false)

  // Force body background dark so no white flash between Life OS pages
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0A0B0F'
    return () => { document.body.style.background = prev }
  }, [])

  // Safety timeout — same pattern as DashboardPage
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  // Detect if user has a business restaurant (for showing the "Mi negocio" link)
  useEffect(() => {
    if (!user) return
    db.from('restaurants')
      .select('id,name,slug,plan,onboarding_completed')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { id: string; name: string; slug: string; plan: string | null; onboarding_completed: boolean | null } | null }) => {
        setHasRestaurant(!!data)
        setRestaurantName(data?.name ?? null)
        setRestaurantSlug(data?.slug ?? null)
        setRestaurantPlan(data?.plan ?? null)
        setOnboardingCompleted(data?.onboarding_completed ?? null)
      })
  }, [user, setHasRestaurant])

  if ((!initialized || loading) && !timedOut) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0F1115',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F1115',
      color: '#F5F7FA',
      paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
    }}>
      <Outlet />
      <CaptureButton />
      <AchievementToast />
      <LifeNav />

      {/* Gear button — fixed bottom-left above nav */}
      <button
        onClick={() => setSettingsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(96px + env(safe-area-inset-bottom))',
          left: '16px',
          zIndex: 50,
          width: 32, height: 32,
          borderRadius: radius.full,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.09)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: colors.text.tertiary,
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = colors.text.secondary }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = colors.text.tertiary }}
        aria-label="Ajustes"
      >
        <Settings2 size={14} strokeWidth={2} />
      </button>

      <LifeSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onShowIOSInstructions={() => {
          setSettingsOpen(false)
          setIosModalOpen(true)
        }}
      />

      <InstallAppModalIOS
        open={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
      />
    </div>
  )
}
