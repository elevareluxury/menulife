import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Table } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useTables(restaurantId: string | undefined) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return

    async function fetchTables() {
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
    }

    fetchTables()

    const channel = supabase
      .channel(`tables_changes_${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchTables()
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [restaurantId])

  return { tables, loading }
}
