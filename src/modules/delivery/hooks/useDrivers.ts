import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import type { DeliveryDriver } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const cacheKey = (restaurantId: string) => `ml_drivers_${restaurantId}`

function readCache(restaurantId: string): DeliveryDriver[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(restaurantId))
    return raw ? (JSON.parse(raw) as DeliveryDriver[]) : null
  } catch {
    return null
  }
}

function writeCache(restaurantId: string, data: DeliveryDriver[]) {
  try {
    localStorage.setItem(cacheKey(restaurantId), JSON.stringify(data))
  } catch { /* quota exceeded */ }
}

export function useDrivers(restaurantId: string | undefined) {
  const [drivers, setDrivers] = useState<DeliveryDriver[]>(() =>
    restaurantId ? (readCache(restaurantId) ?? []) : []
  )
  const [loading, setLoading] = useState(true)

  const fetchDrivers = useCallback(async () => {
    if (!restaurantId) return
    try {
      const { data, error } = await db
        .from('delivery_drivers')
        .select('id, first_name, last_name, phone, is_active, is_available, restaurant_id, created_at, updated_at')
        .eq('restaurant_id', restaurantId)
        .order('first_name')

      if (error) throw error
      const result: DeliveryDriver[] = data ?? []
      setDrivers(result)
      writeCache(restaurantId, result)
    } catch (err) {
      console.error('Error fetching drivers:', err)
      const cached = readCache(restaurantId)
      if (cached) setDrivers(cached)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    const cached = readCache(restaurantId)
    if (cached) { setDrivers(cached); setLoading(false) }
    fetchDrivers()
  }, [restaurantId, fetchDrivers])

  useRealtimeChannel({
    channelName: `drivers_changes_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: '*', table: 'delivery_drivers', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetchDrivers() },
  })

  return { drivers, loading, refetch: fetchDrivers }
}
