import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

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
  status: string
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

const TYPE_PRIORITY: Record<string, number> = { delivery: 0, takeaway: 1, dine_in: 2 }

export function useKitchenOrders(restaurantId: string) {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, restaurant_id, session_id, order_type, table_number, customer_name, customer_address, status, total, currency, created_at, order_items(id, menu_item_name, quantity, notes)')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'cooking', 'ready', 'delivered'])
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ordersWithItems: KitchenOrder[] = ((ordersData as any[]) || []).map(order => ({
        ...order,
        items: order.order_items ?? [],
      }))

      // Sort: delivery → takeaway → dine_in, then by created_at ASC within each group
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
    fetchOrders()

    const channel = supabase
      .channel(`orders_realtime_${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        () => { fetchOrders() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => { fetchOrders() }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [restaurantId, fetchOrders])

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
