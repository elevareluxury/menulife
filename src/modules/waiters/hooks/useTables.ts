import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import type { Table } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useTables(restaurantId: string | undefined) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTables = useCallback(async () => {
    if (!restaurantId) return
    try {
      const { data, error } = await db
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('table_number')

      if (error) throw error
      setTables(data ?? [])
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }

    // 10s fallback so the UI never stays in a loading skeleton forever
    const timer = setTimeout(() => { setLoading(false) }, 10_000)

    fetchTables().then(() => clearTimeout(timer))

    return () => { clearTimeout(timer) }
  }, [restaurantId, fetchTables])

  useRealtimeChannel({
    channelName: `tables_changes_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: '*', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetchTables() },
  })

  return { tables, loading }
}
