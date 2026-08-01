import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import { Spinner } from '@/components/ui/Spinner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type NotifType =
  | 'order_new' | 'order_ready' | 'order_completed' | 'bill_requested' | 'waiter_called' | 'info'
  | 'delivery_picked_up' | 'delivery_completed' | 'delivery_failed'

interface Notif {
  id: string
  type: NotifType
  title: string
  subtitle: string
  created_at: string
  orderId?: string
  tableNumber?: string | null
  is_read?: boolean
  source: 'order' | 'owner_notification'
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const NOTIF_COLOR: Record<NotifType, string> = {
  order_new:          '#F4705A',
  order_ready:        '#22c55e',
  order_completed:    '#22c55e',
  bill_requested:     '#EF9F27',
  waiter_called:      '#EF9F27',
  info:               '#888888',
  delivery_picked_up: '#3B82F6',
  delivery_completed: '#22c55e',
  delivery_failed:    '#EF4444',
}

const NOTIF_EMOJI: Record<NotifType, string> = {
  order_new:          '🛍',
  order_ready:        '✅',
  order_completed:    '💰',
  bill_requested:     '💳',
  waiter_called:      '🔔',
  info:               'ℹ️',
  delivery_picked_up: '🚗',
  delivery_completed: '✅',
  delivery_failed:    '❌',
}

function useNotifications(restaurantId: string | undefined) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const since = new Date(Date.now() - 24 * 3600000).toISOString()

      const [newRes, completedRes, billRes, waiterRes, ownerRes] = await Promise.all([
        db.from('orders').select('id, table_number, customer_name, total, created_at, order_type')
          .eq('restaurant_id', restaurantId)
          .eq('status', 'pending')
          .gte('created_at', since)
          .order('created_at', { ascending: false }).limit(20),
        db.from('orders').select('id, table_number, customer_name, total, updated_at, order_type')
          .eq('restaurant_id', restaurantId)
          .in('status', ['delivered', 'completed'])
          .gte('updated_at', since)
          .order('updated_at', { ascending: false }).limit(20),
        db.from('orders').select('id, table_number, customer_name, created_at')
          .eq('restaurant_id', restaurantId)
          .eq('bill_requested', true)
          .gte('created_at', since)
          .order('created_at', { ascending: false }).limit(10),
        db.from('orders').select('id, table_number, customer_name, created_at')
          .eq('restaurant_id', restaurantId)
          .eq('waiter_called', true)
          .gte('created_at', since)
          .order('created_at', { ascending: false }).limit(10),
        db.from('owner_notifications').select('id, type, title, message, data, is_read, created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', since)
          .order('created_at', { ascending: false }).limit(50),
      ])

      const list: Notif[] = []

      ;(newRes.data ?? []).forEach((o: { id: string; table_number: string | null; customer_name: string | null; total: number; created_at: string; order_type: string }) => {
        const where = o.table_number ? `Mesa ${o.table_number}` : (o.customer_name ?? 'Cliente')
        list.push({
          id: `new-${o.id}`, type: 'order_new', title: 'Nuevo pedido',
          subtitle: `${where} · $${o.total}`, created_at: o.created_at,
          orderId: o.id, tableNumber: o.table_number, source: 'order',
        })
      })

      ;(completedRes.data ?? []).forEach((o: { id: string; table_number: string | null; customer_name: string | null; total: number; updated_at: string }) => {
        const where = o.table_number ? `Mesa ${o.table_number}` : (o.customer_name ?? 'Cliente')
        list.push({
          id: `done-${o.id}`, type: 'order_completed', title: 'Pago recibido',
          subtitle: `${where} · $${o.total}`, created_at: o.updated_at,
          orderId: o.id, source: 'order',
        })
      })

      ;(billRes.data ?? []).forEach((o: { id: string; table_number: string | null; created_at: string }) => {
        if (!o.table_number) return
        list.push({
          id: `bill-${o.id}`, type: 'bill_requested', title: 'Solicitaron la cuenta',
          subtitle: `Mesa ${o.table_number}`, created_at: o.created_at,
          orderId: o.id, tableNumber: o.table_number, source: 'order',
        })
      })

      ;(waiterRes.data ?? []).forEach((o: { id: string; table_number: string | null; created_at: string }) => {
        if (!o.table_number) return
        list.push({
          id: `call-${o.id}`, type: 'waiter_called', title: 'Mesa sin atención',
          subtitle: `Mesa ${o.table_number}`, created_at: o.created_at,
          orderId: o.id, tableNumber: o.table_number, source: 'order',
        })
      })

      ;(ownerRes.data ?? []).forEach((n: { id: string; type: string; title: string; message: string; data: Record<string, unknown> | null; is_read: boolean; created_at: string }) => {
        const validTypes: NotifType[] = ['delivery_picked_up', 'delivery_completed', 'delivery_failed', 'info']
        const type = validTypes.includes(n.type as NotifType) ? (n.type as NotifType) : 'info'
        list.push({
          id: n.id, type, title: n.title,
          subtitle: n.message ?? '',
          created_at: n.created_at,
          is_read: n.is_read,
          source: 'owner_notification',
        })
      })

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifs(list.slice(0, 60))
    } catch (err) {
      console.error('useNotifications error', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => { fetch() }, [restaurantId, fetch])

  useRealtimeChannel({
    channelName: `notif_orders_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: '*', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetch() },
  })

  useRealtimeChannel({
    channelName: `notif_owner_${restaurantId}`,
    enabled: !!restaurantId,
    changes: [{ event: 'INSERT', table: 'owner_notifications', filter: `restaurant_id=eq.${restaurantId}` }],
    onEvent: () => { fetch() },
  })

  return { notifs, loading, refetch: fetch }
}

async function markOwnerNotifRead(id: string) {
  try {
    await db.from('owner_notifications').update({ is_read: true }).eq('id', id)
  } catch {
    // non-critical
  }
}

export function NotificacionesPage() {
  const { restaurant } = useRestaurant()
  const navigate = useNavigate()
  const { notifs, loading } = useNotifications(restaurant?.id)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = notifs.filter(n => !dismissed.has(n.id))
  const cutoff = new Date(Date.now() - 2 * 3600000).toISOString()
  const recent = visible.filter(n => n.created_at >= cutoff)
  const older  = visible.filter(n => n.created_at <  cutoff)

  function dismissAll() {
    setDismissed(new Set(notifs.map(n => n.id)))
  }

  function NotifRow({ n }: { n: Notif }) {
    const color = NOTIF_COLOR[n.type]
    const emoji = NOTIF_EMOJI[n.type]
    const hasOrderAction = n.type === 'waiter_called' || n.type === 'bill_requested' || n.type === 'order_new'
    const isUnread = n.source === 'owner_notification' && n.is_read === false

    return (
      <div
        className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
        style={isUnread ? { background: 'rgba(59,130,246,0.04)' } : undefined}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base mt-0.5"
          style={{ backgroundColor: `${color}18` }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{n.title}</p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#3B82F6' }} />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{n.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
          {hasOrderAction && (
            <button
              onClick={() => {
                if (n.type === 'order_new') navigate('/dashboard/orders')
                else navigate('/dashboard/tables')
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {n.type === 'order_new' ? 'Ver pedido' : 'Ir a mesas'}
            </button>
          )}
          {isUnread && (
            <button
              onClick={() => markOwnerNotifRead(n.id)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}
            >
              Marcar leída
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Notificaciones</h1>
          {visible.length > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full ml-1"
              style={{ backgroundColor: '#F4705A20', color: '#F4705A' }}
            >
              {visible.length}
            </span>
          )}
        </div>
        {visible.length > 0 && (
          <button onClick={dismissAll} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Limpiar todo
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-medium text-gray-600">Sin notificaciones recientes</p>
          <p className="text-sm text-gray-400 mt-1">Todo en orden</p>
        </div>
      ) : (
        <div className="space-y-5">
          {recent.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Ahora</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4">
                {recent.map(n => <NotifRow key={n.id} n={n} />)}
              </div>
            </div>
          )}
          {older.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Hoy</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4">
                {older.map(n => <NotifRow key={n.id} n={n} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
