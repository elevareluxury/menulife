import { useState, useEffect, useRef, useCallback } from 'react'
import { playNotificationSound, playUrgentSound } from '@/lib/notifications'

export interface NotificationItem {
  id: string
  message: string
  type: 'order' | 'call' | 'ready' | 'bill'
}

interface OrderSnapshot {
  id: string
  status: string
  table_number: string | null
}

interface CallSnapshot {
  id: string
  table: { table_number: string }
  type?: string
}

export function useWaiterNotifications(
  orders: OrderSnapshot[],
  calls: CallSnapshot[]
) {
  const [banners, setBanners] = useState<NotificationItem[]>([])
  const prevOrderMap = useRef<Map<string, string>>(new Map())
  const prevCallIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  const addBanner = useCallback((banner: NotificationItem) => {
    setBanners(prev => [banner, ...prev.filter(b => b.id !== banner.id)].slice(0, 3))
  }, [])

  useEffect(() => {
    if (!initialized.current) {
      prevOrderMap.current = new Map(orders.map(o => [o.id, o.status]))
      prevCallIds.current = new Set(calls.map(c => c.id))
      initialized.current = true
      return
    }

    for (const order of orders) {
      if (!prevOrderMap.current.has(order.id)) {
        playNotificationSound()
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        addBanner({
          id: `order-${order.id}`,
          message: `🛎 Nuevo pedido — Mesa ${order.table_number ?? '?'}`,
          type: 'order',
        })
      } else if (
        prevOrderMap.current.get(order.id) !== 'ready' &&
        order.status === 'ready'
      ) {
        playNotificationSound()
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        addBanner({
          id: `ready-${order.id}`,
          message: `✅ Pedido listo — Mesa ${order.table_number ?? '?'}`,
          type: 'ready',
        })
      } else if (
        prevOrderMap.current.get(order.id) !== 'bill_requested' &&
        order.status === 'bill_requested'
      ) {
        playUrgentSound()
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
        addBanner({
          id: `bill-order-${order.id}`,
          message: `💰 Mesa ${order.table_number ?? '?'} pide la cuenta`,
          type: 'bill',
        })
      }
    }

    for (const call of calls) {
      if (!prevCallIds.current.has(call.id)) {
        if (call.type === 'bill_request') {
          playUrgentSound()
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
          addBanner({
            id: `bill-${call.id}`,
            message: `💰 Mesa ${call.table.table_number} pide la cuenta`,
            type: 'bill',
          })
        } else {
          playUrgentSound()
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
          addBanner({
            id: `call-${call.id}`,
            message: `🔔 Mesa ${call.table.table_number} llama al mozo`,
            type: 'call',
          })
        }
      }
    }

    prevOrderMap.current = new Map(orders.map(o => [o.id, o.status]))
    prevCallIds.current = new Set(calls.map(c => c.id))
  }, [orders, calls, addBanner])

  const dismissBanner = useCallback((id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id))
  }, [])

  return { banners, dismissBanner }
}
