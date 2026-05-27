import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface HistoryOrderItem {
  id: string
  menu_item_name: string
  quantity: number
  price_snapshot: number
  currency: string
  notes: string | null
}

export interface HistoryOrder {
  id: string
  order_type: string
  table_number: string | null
  customer_name: string | null
  status: string
  subtotal: number
  total: number
  currency: string
  created_at: string
  items: HistoryOrderItem[]
}

export interface HistorySummary {
  total: number
  count: number
  avgTicket: number
}

interface UseOrderHistoryResult {
  orders: HistoryOrder[]
  summary: HistorySummary
  loading: boolean
  hasMore: boolean
  loadMore: () => void
}

const PAGE_SIZE = 20

export function useOrderHistory(
  restaurantId: string | undefined,
  desde: Date,
  hasta: Date,
  search: string,
  statusFilter: string
): UseOrderHistoryResult {
  const [allOrders, setAllOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const hastaEnd = new Date(hasta)
      hastaEnd.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_type, table_number, customer_name, status, subtotal, total, currency, created_at, order_items(id, menu_item_name, quantity, price_snapshot, currency, notes)')
        .eq('restaurant_id', restaurantId)
        .in('status', ['delivered', 'cancelled'])
        .gte('created_at', desde.toISOString())
        .lte('created_at', hastaEnd.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordersWithItems: HistoryOrder[] = ((data as any[]) || []).map(order => ({
        ...order,
        items: order.order_items ?? [],
      }))

      setAllOrders(ordersWithItems)
      setPage(0)
    } catch (err) {
      console.error('useOrderHistory error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, desde, hasta])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Apply client-side filters
  const filtered = allOrders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const orderNum = o.id.slice(-4)
      const mesa = o.table_number ?? ''
      const nombre = o.customer_name ?? ''
      if (!orderNum.includes(q) && !mesa.toLowerCase().includes(q) && !nombre.toLowerCase().includes(q)) return false
    }
    return true
  })

  const visible = filtered.slice(0, PAGE_SIZE * (page + 1))
  const hasMore = visible.length < filtered.length

  const summary: HistorySummary = {
    total: filtered.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0),
    count: filtered.length,
    avgTicket: filtered.length > 0
      ? filtered.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0) /
        Math.max(1, filtered.filter(o => o.status === 'delivered').length)
      : 0,
  }

  return { orders: visible, summary, loading, hasMore, loadMore: () => setPage(p => p + 1) }
}
