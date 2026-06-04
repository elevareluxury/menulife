import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type NotifType = 'order_new' | 'order_ready' | 'order_completed' | 'bill_requested' | 'waiter_called' | 'info'

interface Notif {
  id: string
  type: NotifType
  title: string
  subtitle: string
  created_at: string
  orderId?: string
  tableNumber?: string | null
  itemId?: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const NOTIF_COLOR: Record<NotifType, string> = {
  order_new:       '#F4705A',
  order_ready:     '#22c55e',
  order_completed: '#22c55e',
  bill_requested:  '#EF9F27',
  waiter_called:   '#EF9F27',
  info:            '#888888',
}

const NOTIF_EMOJI: Record<NotifType, string> = {
  order_new:       '🛍',
  order_ready:     '✅',
  order_completed: '💰',
  bill_requested:  '💳',
  waiter_called:   '🔔',
  info:            'ℹ️',
}

function useNotifications(restaurantId: string | undefined) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const since = new Date(Date.now() - 24 * 3600000).toISOString()
      const [newRes, completedRes, billRes, waiterRes] = await Promise.all([
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
      ])

      const list: Notif[] = []

      ;(newRes.data ?? []).forEach((o: { id: string; table_number: string | null; customer_name: string | null; total: number; created_at: string; order_type: string }) => {
        const where = o.table_number ? `Mesa ${o.table_number}` : (o.customer_name ?? 'Cliente')
        list.push({
          id: `new-${o.id}`,
          type: 'order_new',
          title: 'Nuevo pedido',
          subtitle: `${where} · $${o.total}`,
          created_at: o.created_at,
          orderId: o.id,
          tableNumber: o.table_number,
        })
      })

      ;(completedRes.data ?? []).forEach((o: { id: string; table_number: string | null; customer_name: string | null; total: number; updated_at: string }) => {
        const where = o.table_number ? `Mesa ${o.table_number}` : (o.customer_name ?? 'Cliente')
        list.push({
          id: `done-${o.id}`,
          type: 'order_completed',
          title: 'Pago recibido',
          subtitle: `${where} · $${o.total}`,
          created_at: o.updated_at,
          orderId: o.id,
        })
      })

      ;(billRes.data ?? []).forEach((o: { id: string; table_number: string | null; created_at: string }) => {
        if (!o.table_number) return
        list.push({
          id: `bill-${o.id}`,
          type: 'bill_requested',
          title: 'Solicitaron la cuenta',
          subtitle: `Mesa ${o.table_number}`,
          created_at: o.created_at,
          orderId: o.id,
          tableNumber: o.table_number,
        })
      })

      ;(waiterRes.data ?? []).forEach((o: { id: string; table_number: string | null; created_at: string }) => {
        if (!o.table_number) return
        list.push({
          id: `call-${o.id}`,
          type: 'waiter_called',
          title: 'Mesa sin atención',
          subtitle: `Mesa ${o.table_number}`,
          created_at: o.created_at,
          orderId: o.id,
          tableNumber: o.table_number,
        })
      })

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNotifs(list.slice(0, 50))
    } catch (err) {
      console.error('useNotifications error', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    fetch()
    const ch = supabase
      .channel(`notif_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetch)
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [restaurantId, fetch])

  return { notifs, loading, refetch: fetch }
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
    const hasAction = n.type === 'waiter_called' || n.type === 'bill_requested' || n.type === 'order_new'

    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base mt-0.5"
          style={{ backgroundColor: `${color}18` }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{n.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{n.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
          {hasAction && (
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
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
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
