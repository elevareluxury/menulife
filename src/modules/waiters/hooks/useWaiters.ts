import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Waiter } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const cacheKey = (restaurantId: string) => `ml_waiters_${restaurantId}`

function readCache(restaurantId: string): Waiter[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(restaurantId))
    return raw ? (JSON.parse(raw) as Waiter[]) : null
  } catch {
    return null
  }
}

function writeCache(restaurantId: string, data: Waiter[]) {
  try {
    localStorage.setItem(cacheKey(restaurantId), JSON.stringify(data))
  } catch {
    // storage quota exceeded — ignore
  }
}

export function useWaiters(restaurantId: string | undefined) {
  const [waiters, setWaiters] = useState<Waiter[]>(() =>
    restaurantId ? (readCache(restaurantId) ?? []) : []
  )
  const [loading, setLoading] = useState(true)

  const fetchWaiters = useCallback(async () => {
    if (!restaurantId) return
    try {
      const { data, error } = await db
        .from('waiters')
        .select('id, first_name, last_name, avatar_url, is_active, is_on_shift, restaurant_id, created_at, updated_at')
        .eq('restaurant_id', restaurantId)
        .order('first_name')

      if (error) throw error
      const result: Waiter[] = data ?? []
      setWaiters(result)
      writeCache(restaurantId, result)
    } catch (error) {
      console.error('Error fetching waiters:', error)
      const cached = readCache(restaurantId)
      if (cached) setWaiters(cached)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }

    const cached = readCache(restaurantId)
    if (cached) {
      setWaiters(cached)
      setLoading(false)
    }

    fetchWaiters()

    const channel = supabase
      .channel(`waiters_changes_${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiters', filter: `restaurant_id=eq.${restaurantId}` },
        fetchWaiters
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [restaurantId, fetchWaiters])

  return { waiters, loading }
}
