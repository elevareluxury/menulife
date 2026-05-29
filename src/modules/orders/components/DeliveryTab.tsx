import { useState, useEffect, useCallback, useRef } from 'react'
import { Phone, MapPin, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { ExternalOrderModal } from './ExternalOrderModal'
import toast from 'react-hot-toast'
import type { DeliveryDriver } from '@/types'

const SOURCE_META: Record<string, { label: string; color: string; emoji: string }> = {
  rappi:     { label: 'Rappi',     color: '#FF6200', emoji: '🟠' },
  pedidosya: { label: 'PedidosYa', color: '#FFD700', emoji: '🟡' },
  whatsapp:  { label: 'WhatsApp',  color: '#25D366', emoji: '🟢' },
  phone:     { label: 'Teléfono',  color: '#3B82F6', emoji: '🔵' },
  own:       { label: 'Propio',    color: '#FF6B7A', emoji: '🔴' },
  other:     { label: 'Otro',      color: '#6B7280', emoji: '⚫' },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const DELIVERY_STATUSES = [
  { value: 'pending',   label: '⏳ Pendiente',      color: '#F59E0B' },
  { value: 'confirmed', label: '✅ Confirmado',      color: '#3B82F6' },
  { value: 'preparing', label: '👨‍🍳 En cocina',      color: '#F97316' },
  { value: 'ready',     label: '📦 Listo',           color: '#10B981' },
  { value: 'picked_up', label: '🛵 En camino',       color: '#8B5CF6' },
  { value: 'delivered', label: '🎉 Entregado',       color: '#10B981' },
  { value: 'cancelled', label: '❌ Cancelado',       color: '#EF4444' },
]

const TAKEAWAY_STATUSES = [
  { value: 'pending',   label: '⏳ Pendiente' },
  { value: 'preparing', label: '👨‍🍳 En preparación' },
  { value: 'ready',     label: '✅ Listo para retirar' },
  { value: 'delivered', label: '🎉 Retirado' },
  { value: 'cancelled', label: '❌ Cancelado' },
]

function statusColor(status: string | null, type: string): string {
  if (type === 'delivery') {
    return DELIVERY_STATUSES.find(s => s.value === status)?.color ?? '#6B7280'
  }
  return '#6B7280'
}

interface DeliveryOrder {
  id: string
  order_type_detail: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  delivery_fee: number | null
  delivery_status: string | null
  delivery_driver_id: string | null
  total: number
  subtotal: number
  currency: string
  created_at: string
  external_source: string | null
  external_order_id: string | null
  items: { menu_item_name: string; quantity: number }[]
}

function fmtPrice(n: number) { return n.toLocaleString('es-AR') }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

interface DeliveryTabProps {
  restaurantId: string
}

export function DeliveryTab({ restaurantId }: DeliveryTabProps) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const prevCountRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    try {
      let query = db
        .from('orders')
        .select('id, order_type_detail, customer_name, customer_phone, customer_address, delivery_fee, delivery_status, delivery_driver_id, total, subtotal, currency, created_at, external_source, external_order_id, order_items(menu_item_name, quantity)')
        .eq('restaurant_id', restaurantId)
        .in('order_type_detail', ['delivery', 'takeaway'])
        .order('created_at', { ascending: false })

      const { data } = await query
      const result: DeliveryOrder[] = (data ?? []).map((o: DeliveryOrder & { order_items?: { menu_item_name: string; quantity: number }[] }) => ({
        ...o,
        items: o.order_items ?? [],
      }))

      const activeCount = result.filter(o => !['delivered', 'cancelled'].includes(o.delivery_status ?? '')).length
      if (activeCount > prevCountRef.current && prevCountRef.current > 0) {
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.value = 1000; gain.gain.setValueAtTime(0.3, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
        } catch { /* blocked */ }
      }
      prevCountRef.current = activeCount
      setOrders(result)
    } catch (err) {
      console.error('Error fetching delivery orders:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const fetchDrivers = useCallback(async () => {
    const { data } = await db
      .from('delivery_drivers')
      .select('id, first_name, last_name, is_active, is_available')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
    setDrivers(data ?? [])
  }, [restaurantId])

  useEffect(() => {
    fetchOrders()
    fetchDrivers()
    const channel = supabase
      .channel(`delivery_orders_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [restaurantId, fetchOrders, fetchDrivers])

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const updates: Record<string, unknown> = { delivery_status: status }
      if (status === 'picked_up') updates.picked_up_at = new Date().toISOString()
      if (status === 'delivered') updates.delivered_at = new Date().toISOString()
      await db.from('orders').update(updates).eq('id', orderId)
      toast.success('Estado actualizado')
      fetchOrders()
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      const extra: Record<string, unknown> = { delivery_driver_id: driverId || null }
      if (driverId) extra.delivery_status = 'picked_up'
      await db.from('orders').update(extra).eq('id', orderId)
      fetchOrders()
    } catch {
      toast.error('Error al asignar repartidor')
    }
  }

  const filtered = orders.filter(o => {
    if (typeFilter !== 'all' && o.order_type_detail !== typeFilter) return false
    if (statusFilter === 'active') return !['delivered', 'cancelled'].includes(o.delivery_status ?? '')
    if (statusFilter !== 'all') return o.delivery_status === statusFilter
    return true
  })

  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.delivery_status ?? '')).length

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.8)',
    padding: '6px 10px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none',
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div>
      {showNewOrderModal && (
        <ExternalOrderModal
          restaurantId={restaurantId}
          drivers={drivers}
          onClose={() => setShowNewOrderModal(false)}
          onCreated={fetchOrders}
        />
      )}

      {/* Filters + new order button */}
      <div className="flex gap-2 mb-5 flex-wrap" style={{ alignItems: 'center' }}>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(247,127,0,0.18)', border: '1px solid #F77F00', color: '#F77F00' }}
        >
          <Plus size={14} /> Pedido externo
        </button>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px', alignSelf: 'stretch' }} />
        {[
          { val: 'all', label: 'Todos' },
          { val: 'delivery', label: '🛵 Delivery' },
          { val: 'takeaway', label: '🥡 Takeaway' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setTypeFilter(f.val)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: typeFilter === f.val ? 'rgba(247,127,0,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${typeFilter === f.val ? '#F77F00' : 'rgba(255,255,255,0.08)'}`,
              color: typeFilter === f.val ? '#F77F00' : 'rgba(255,255,255,0.6)',
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        {[
          { val: 'active', label: `Activos (${activeCount})` },
          { val: 'pending', label: 'Pendiente' },
          { val: 'preparing', label: 'En cocina' },
          { val: 'ready', label: 'Listos' },
          { val: 'picked_up', label: 'En camino' },
          { val: 'delivered', label: 'Entregados' },
          { val: 'all', label: 'Todos' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setStatusFilter(f.val)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: statusFilter === f.val ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusFilter === f.val ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
              color: statusFilter === f.val ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-sm">Sin pedidos de delivery o takeaway</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const isDelivery = order.order_type_detail === 'delivery'
            const accentColor = isDelivery ? '#F77F00' : '#3B82F6'
            const orderStatuses = isDelivery ? DELIVERY_STATUSES : TAKEAWAY_STATUSES

            return (
              <div
                key={order.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '16px',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderLeft: `4px solid ${accentColor}`,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: accentColor, background: `${accentColor}18`, padding: '2px 8px', borderRadius: '20px' }}>
                        {isDelivery ? '🛵 DELIVERY' : '🥡 TAKEAWAY'}
                      </span>
                      {order.external_source && SOURCE_META[order.external_source] && (() => {
                        const src = SOURCE_META[order.external_source]
                        return (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: src.color, background: `${src.color}18`, padding: '2px 7px', borderRadius: '20px', border: `1px solid ${src.color}44` }}>
                            {src.emoji} {src.label}
                          </span>
                        )
                      })()}
                      {order.external_order_id && (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                          #{order.external_order_id}
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 2px' }}>
                      {order.customer_name ?? '—'}
                    </p>
                    {order.customer_phone && (
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
                        📱 {order.customer_phone}
                      </p>
                    )}
                    {order.customer_address && (
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} /> {order.customer_address}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {formatTime(order.created_at)}
                  </span>
                </div>

                {/* Items + total */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                    {order.items.map(i => `${i.menu_item_name} x${i.quantity}`).join(' · ')}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                    ${fmtPrice(order.subtotal)}
                    {(order.delivery_fee ?? 0) > 0 && (
                      <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                        {' '}+ ${fmtPrice(order.delivery_fee ?? 0)} env
                      </span>
                    )}
                    {(order.delivery_fee ?? 0) > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                        {' '}= ${fmtPrice(order.total)} total
                      </span>
                    )}
                  </p>
                </div>

                {/* Controls */}
                <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Status dropdown */}
                  <div style={{ flex: '1 1 auto', minWidth: '160px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Estado</label>
                    <select
                      value={order.delivery_status ?? 'pending'}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      style={{ ...selectStyle, width: '100%' }}
                    >
                      {orderStatuses.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Driver dropdown — only for delivery */}
                  {isDelivery && (
                    <div style={{ flex: '1 1 auto', minWidth: '160px' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Repartidor</label>
                      <select
                        value={order.delivery_driver_id ?? ''}
                        onChange={e => assignDriver(order.id, e.target.value)}
                        style={{ ...selectStyle, width: '100%' }}
                      >
                        <option value="">Sin asignar</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.first_name} {d.last_name}{d.is_available ? '' : ' (no disp.)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Action buttons */}
                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: '10px',
                        background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
                        color: '#3B82F6', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      <Phone size={13} /> Llamar
                    </a>
                  )}
                  {order.customer_address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(order.customer_address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: '10px',
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)',
                        color: '#F59E0B', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      <MapPin size={13} /> Maps
                    </a>
                  )}
                </div>

                {/* Status indicator dot */}
                {order.delivery_status && (
                  <div style={{ height: '3px', background: statusColor(order.delivery_status, order.order_type_detail ?? '') }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

