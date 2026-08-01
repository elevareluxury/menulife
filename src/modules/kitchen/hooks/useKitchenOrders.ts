import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'

interface OrderItem {
  id: string
  menu_item_name: string
  quantity: number
  notes: string | null
}

export interface KitchenOrder {
  id: string
  restaurant_id: string
  session_id: string
  order_type: string
  table_number: string | null
  customer_name: string | null
  customer_address?: string | null
  waiter_id?: string | null
  status: string
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

const TYPE_PRIORITY: Record<string, number> = { delivery: 0, takeaway: 1, dine_in: 2 }

export function useKitchenOrders(restaurantId: string | null | undefined) {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, restaurant_id, session_id, order_type, table_number, customer_name, customer_address, waiter_id, status, total, currency, created_at, order_items(id, menu_item_name, quantity, notes)')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'cooking', 'ready', 'delivered'])
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordersWithItems: KitchenOrder[] = ((ordersData as any[]) || []).map(order => ({
        ...order,
        items: order.order_items ?? [],
      }))

      ordersWithItems.sort((a, b) => {
        const pa = TYPE_PRIORITY[a.order_type] ?? 3
        const pb = TYPE_PRIORITY[b.order_type] ?? 3
        if (pa !== pb) return pa - pb
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      setOrders(ordersWithItems)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    fetchOrders()
  }, [restaurantId, fetchOrders])

  useRealtimeChannel({
    channelName: `orders_realtime_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [
      { event: '*', table: 'orders',      filter: `restaurant_id=eq.${restaurantId}` },
      { event: '*', table: 'order_items' },
    ],
    onEvent: () => { fetchOrders() },
  })

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as 'pending' | 'cooking' | 'ready' | 'delivered' | 'cancelled' | 'confirmed' })
        .eq('id', orderId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  return { orders, loading, updateOrderStatus, refetch: fetchOrders }
}
