import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useLifeEngagement() {
  const { user } = useAuthStore()
  const [goalsCount, setGoalsCount]   = useState(0)
  const [brainCount, setBrainCount]   = useState(0)

  useEffect(() => {
    if (!user) return

    db.from('life_goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }: { count: number | null }) => setGoalsCount(count ?? 0))

    db.from('life_brain_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .then(({ count }: { count: number | null }) => setBrainCount(count ?? 0))
  }, [user])

  return {
    isEngaged: goalsCount >= 1 && brainCount >= 1,
    goalsCount,
    brainCount,
  }
}
