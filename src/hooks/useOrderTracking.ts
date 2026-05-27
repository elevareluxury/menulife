import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { playOrderReadySound } from '@/lib/notification-sound'

export interface OrderItem {
  id: string
  menu_item_name: string
  quantity: number
  price_snapshot: number
}

export interface TrackedOrder {
  id: string
  restaurant_id: string
  table_number: string | null
  customer_name: string | null
  order_type: string
  status: string
  total: number
  currency: string
  created_at: string
  items: OrderItem[]
}

export function useOrderTracking(orderId: string) {
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [previousStatus, setPreviousStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return

    async function fetchOrder() {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          restaurant_id,
          table_number,
          customer_name,
          order_type,
          status,
          total,
          currency,
          created_at,
          order_items (
            id,
            menu_item_name,
            quantity,
            price_snapshot
          )
        `)
        .eq('id', orderId)
        .single()

      if (fetchError) {
        setError('No encontramos tu pedido')
        setLoading(false)
        return
      }

      const tracked: TrackedOrder = {
        ...(data as Omit<TrackedOrder, 'items'>),
        items: (data.order_items as unknown as OrderItem[]) ?? [],
      }
      setOrder(tracked)
      setPreviousStatus(data.status as string)
      setLoading(false)
    }

    fetchOrder()

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new as Partial<TrackedOrder>

          setPreviousStatus(prev => {
            if (updated.status === 'ready' && prev !== 'ready') {
              playOrderReadySound()
              if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
            }
            return updated.status ?? prev
          })

          setOrder(prev => (prev ? { ...prev, ...updated } : null))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [orderId])

  return { order, loading, error, previousStatus }
}
