import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'

interface DashboardStats {
  menuProducts: number
  qrGenerated: number
  activeTables: { current: number; total: number }
}

export function useDashboardStats(restaurantId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats>({
    menuProducts: 0,
    qrGenerated: 0,
    activeTables: { current: 0, total: 0 },
  })

  const fetchStats = useCallback(async () => {
    if (!restaurantId) return
    const [menuResult, tablesResult] = await Promise.all([
      supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId),
      supabase
        .from('tables')
        .select('id, status, is_active')
        .eq('restaurant_id', restaurantId),
    ])

    const tables = tablesResult.data ?? []
    const activeTables = tables.filter(t => t.is_active)

    setStats({
      menuProducts: menuResult.count ?? 0,
      qrGenerated: tables.length,
      activeTables: {
        total: activeTables.length,
        current: activeTables.filter(t => t.status === 'occupied').length,
      },
    })
  }, [restaurantId])

  useEffect(() => { if (restaurantId) fetchStats() }, [restaurantId, fetchStats])

  useRealtimeChannel({
    channelName: `dashboard_tables_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: '*', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetchStats() },
  })

  return { stats }
}
