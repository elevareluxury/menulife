import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Waiter } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useWaiters(restaurantId: string | undefined) {
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return

    async function fetchWaiters() {
      try {
        const { data, error } = await db
          .from('waiters')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('first_name')

        if (error) throw error
        setWaiters(data ?? [])
      } catch (error) {
        console.error('Error fetching waiters:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchWaiters()

    const channel = supabase
      .channel(`waiters_changes_${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiters', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchWaiters()
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [restaurantId])

  return { waiters, loading }
}
