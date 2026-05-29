import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useReservations(restaurantId: string | undefined, date?: string) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    let q = db
      .from('reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })

    if (date) q = q.eq('reservation_date', date)

    const { data, error } = await q
    if (!error) setReservations((data as Reservation[]) ?? [])
    setLoading(false)
  }, [restaurantId, date])

  useEffect(() => { fetch() }, [fetch])

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return
    const channel = supabase
      .channel(`reservations:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetch])

  return { reservations, loading, refetch: fetch }
}
