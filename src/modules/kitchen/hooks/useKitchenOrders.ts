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
  status: string
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

export function useKitchenOrders(restaurantId: string) {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, restaurant_id, session_id, order_type, table_number, customer_name, status, total, currency, created_at')
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'cooking', 'ready', 'delivered'])
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('id, menu_item_name, quantity, notes')
            .eq('order_id', order.id)

          return { ...order, items: itemsData || [] }
        })
      )

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
