import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface DayStat { date: string; label: string; total: number; count: number }
export interface TopItem { name: string; count: number; pct: number }
export interface WaiterStat { name: string; total: number; count: number }
export interface HourStat { hour: number; count: number }
export interface TableStat { table: string; avg: number; count: number }
export interface OrderTypeStat { type: string; label: string; count: number; total: number }

export interface Analytics {
  salesByDay: DayStat[]
  topItems: TopItem[]
  byWaiter: WaiterStat[]
  byHour: HourStat[]
  byTable: TableStat[]
  byOrderType: OrderTypeStat[]
  current: { total: number; count: number; avgTicket: number; avgMinutes: number }
  previous: { total: number; count: number; avgTicket: number }
}

const EMPTY: Analytics = {
  salesByDay: [], topItems: [], byWaiter: [], byHour: [], byTable: [], byOrderType: [],
  current: { total: 0, count: 0, avgTicket: 0, avgMinutes: 0 },
  previous: { total: 0, count: 0, avgTicket: 0 },
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: 'Mesa', delivery: 'Delivery', takeaway: 'Para llevar',
}

export function useOrderAnalytics(
  restaurantId: string | undefined,
  desde: Date,
  hasta: Date
): { analytics: Analytics; loading: boolean } {
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const hastaEnd = new Date(hasta)
      hastaEnd.setHours(23, 59, 59, 999)

      // Current period
      const { data: orders } = await supabase
        .from('orders')
        .select('id, table_number, status, total, currency, created_at, updated_at, order_type')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', desde.toISOString())
        .lte('created_at', hastaEnd.toISOString())

      const delivered = (orders || []).filter(o => o.status === 'delivered')

      // Previous period (same length, immediately before)
      const rangeMs = hastaEnd.getTime() - desde.getTime()
      const prevHasta = new Date(desde.getTime() - 1)
      const prevDesde = new Date(desde.getTime() - rangeMs)
      const { data: prevOrders } = await supabase
        .from('orders')
        .select('id, total, status')
        .eq('restaurant_id', restaurantId)
        .in('status', ['delivered'])
        .gte('created_at', prevDesde.toISOString())
        .lte('created_at', prevHasta.toISOString())

      const prevDelivered = prevOrders || []
      const prevTotal = prevDelivered.reduce((s, o) => s + o.total, 0)
      const prevCount = prevDelivered.length

      // Order items for current period
      const orderIds = (orders || []).map(o => o.id)
      let items: { order_id: string; menu_item_name: string; quantity: number }[] = []
      if (orderIds.length > 0) {
        const { data } = await supabase
          .from('order_items')
          .select('order_id, menu_item_name, quantity')
          .in('order_id', orderIds)
        items = data || []
      }

      // Sales by day
      const dayMap: Record<string, { total: number; count: number }> = {}
      delivered.forEach(o => {
        const d = o.created_at.slice(0, 10)
        if (!dayMap[d]) dayMap[d] = { total: 0, count: 0 }
        dayMap[d].total += o.total
        dayMap[d].count += 1
      })
      const salesByDay: DayStat[] = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          label: new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }),
          ...v,
        }))

      // Top items
      const itemMap: Record<string, number> = {}
      items.forEach(i => { itemMap[i.menu_item_name] = (itemMap[i.menu_item_name] ?? 0) + i.quantity })
      const totalItemCount = Object.values(itemMap).reduce((s, v) => s + v, 0)
      const topItems: TopItem[] = Object.entries(itemMap)
        .map(([name, count]) => ({ name, count, pct: totalItemCount > 0 ? Math.round((count / totalItemCount) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // By hour (all orders, not just delivered)
      const hourMap: Record<number, number> = {}
      ;(orders || []).forEach(o => {
        const h = new Date(o.created_at).getHours()
        hourMap[h] = (hourMap[h] ?? 0) + 1
      })
      const byHour: HourStat[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] ?? 0 }))
        .filter(h => h.count > 0)

      // By waiter — no waiter_id on orders, derive from customer_name or mark as table
      // group by table for ticket avg
      const tableMap: Record<string, { total: number; count: number }> = {}
      delivered.forEach(o => {
        if (!o.table_number) return
        if (!tableMap[o.table_number]) tableMap[o.table_number] = { total: 0, count: 0 }
        tableMap[o.table_number].total += o.total
        tableMap[o.table_number].count += 1
      })
      const byTable: TableStat[] = Object.entries(tableMap)
        .map(([table, v]) => ({ table, avg: Math.round(v.total / v.count), count: v.count }))
        .sort((a, b) => b.avg - a.avg)

      // By order type
      const typeMap: Record<string, { count: number; total: number }> = {}
      delivered.forEach(o => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t: string = (o as any).order_type ?? 'dine_in'
        if (!typeMap[t]) typeMap[t] = { count: 0, total: 0 }
        typeMap[t].count++
        typeMap[t].total += o.total
      })
      const byOrderType: OrderTypeStat[] = Object.entries(typeMap).map(([type, v]) => ({
        type, label: ORDER_TYPE_LABEL[type] ?? type, ...v,
      }))

      // Avg duration (minutes) for delivered orders
      let totalMinutes = 0
      let durCount = 0
      delivered.forEach(o => {
        if (o.updated_at) {
          const mins = (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000
          if (mins > 0 && mins < 240) { totalMinutes += mins; durCount++ }
        }
      })

      const currentTotal = delivered.reduce((s, o) => s + o.total, 0)
      const currentCount = delivered.length

      setAnalytics({
        salesByDay,
        topItems,
        byWaiter: [],
        byHour,
        byTable,
        byOrderType,
        current: {
          total: currentTotal,
          count: currentCount,
          avgTicket: currentCount > 0 ? Math.round(currentTotal / currentCount) : 0,
          avgMinutes: durCount > 0 ? Math.round(totalMinutes / durCount) : 0,
        },
        previous: {
          total: prevTotal,
          count: prevCount,
          avgTicket: prevCount > 0 ? Math.round(prevTotal / prevCount) : 0,
        },
      })
    } catch (err) {
      console.error('useOrderAnalytics error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, desde, hasta])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  return { analytics, loading }
}
