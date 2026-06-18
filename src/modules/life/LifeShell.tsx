import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLifeStore } from '@/store/lifeStore'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { LifeNav } from './components/LifeNav'
import { CaptureButton } from './components/CaptureButton'
import { AchievementToast } from './components/AchievementToast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function LifeShell() {
  const { user, loading, initialized } = useAuthStore()
  const { setHasRestaurant, setRestaurantName, setRestaurantSlug, setRestaurantPlan } = useLifeStore()
  const [timedOut, setTimedOut] = useState(false)

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
    </div>
  )
}
