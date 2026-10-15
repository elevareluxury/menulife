import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { learnCategories, type CategoryMemory } from '../lib/moneyInsights'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/** Lo que la persona ya ordenó en el último año (movimientos con descripción y categoría distinta de "Otros"). */
export function useCategoryMemory(enabled: boolean): CategoryMemory | null {
  const { user } = useAuthStore()
  const [memory, setMemory] = useState<CategoryMemory | null>(null)
  useEffect(() => {
    if (!enabled || !user) return
    let alive = true
    const since = new Date(); since.setFullYear(since.getFullYear() - 1)
    void db.from('life_transactions').select('type,amount,category,description,currency,occurred_at')
      .eq('user_id', user.id).gte('occurred_at', since.toISOString()).neq('category', 'Otros')
      .not('description', 'is', null).order('occurred_at', { ascending: false }).limit(3000)
      .then(({ data }: { data: Parameters<typeof learnCategories>[0] | null }) => { if (alive) setMemory(learnCategories(data ?? [])) })
    return () => { alive = false }
  }, [enabled, user])
  return memory
}
