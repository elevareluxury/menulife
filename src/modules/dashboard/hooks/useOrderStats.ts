import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'

interface OrderStats {
  today: {
    total: number
    count: number
    pending: number
    cooking: number
    ready: number
  }
  week: {
    total: number
    count: number
  }
  topItems: {
    name: string
    count: number
  }[]
}

export function useOrderStats(restaurantId: string | undefined) {
  const [stats, setStats] = useState<OrderStats>({
    today: { total: 0, count: 0, pending: 0, cooking: 0, ready: 0 },
    week: { total: 0, count: 0 },
    topItems: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!restaurantId) return
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total, status')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayStart.toISOString())

      const todayStats = {
        total: todayOrders?.reduce((sum, o) => sum + o.total, 0) ?? 0,
        count: todayOrders?.length ?? 0,
        pending: todayOrders?.filter(o => o.status === 'pending').length ?? 0,
        cooking: todayOrders?.filter(o => o.status === 'cooking').length ?? 0,
        ready: todayOrders?.filter(o => o.status === 'ready').length ?? 0,
      }

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', weekStart.toISOString())

      const weekStats = {
        total: weekOrders?.reduce((sum, o) => sum + o.total, 0) ?? 0,
        count: weekOrders?.length ?? 0,
      }

      const orderIds = weekOrders?.map(o => o.id) ?? []
      let topItems: { name: string; count: number }[] = []

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('menu_item_name, quantity')
          .in('order_id', orderIds)

        if (items) {
          const itemCounts: Record<string, number> = {}
          items.forEach(item => {
            itemCounts[item.menu_item_name] = (itemCounts[item.menu_item_name] ?? 0) + item.quantity
          })
          topItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        }
      }

      setStats({ today: todayStats, week: weekStats, topItems })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  // Initial fetch + polling interval (stats have 30s auto-refresh)
  useEffect(() => {
    if (!restaurantId) return
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => { clearInterval(interval) }
  }, [restaurantId, fetchStats])

  useRealtimeChannel({
    channelName: `stats_updates_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: '*', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetchStats() },
  })

  return { stats, loading }
}
