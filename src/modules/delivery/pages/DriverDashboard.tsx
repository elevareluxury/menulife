import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, Phone, MapPin, CheckCircle, Truck, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDeliveryAuthStore } from '@/store/deliveryAuthStore'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface DeliveryOrder {
  id: string
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  delivery_status: string | null
  delivery_fee: number | null
  total: number
  currency: string
  created_at: string
  items: { menu_item_name: string; quantity: number }[]
}

function fmtPrice(n: number) {
  return n.toLocaleString('es-AR')
}

function playBip() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch { /* blocked by browser */ }
}

export function DriverDashboard() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { driver, logout, isAuthenticated } = useDeliveryAuthStore()
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)
  const prevOrderCount = useRef(0)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate(`/delivery/${slug}/login`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug])

  const fetchOrders = useCallback(async () => {
    if (!driver?.id) return
    try {
      const { data } = await db
        .from('orders')
        .select('id, customer_name, customer_phone, customer_address, delivery_status, delivery_fee, total, currency, created_at, order_items(menu_item_name, quantity)')
        .eq('delivery_driver_id', driver.id)
        .in('delivery_status', ['ready', 'picked_up'])
        .order('created_at', { ascending: true })

      const result: DeliveryOrder[] = (data ?? []).map((o: DeliveryOrder & { order_items?: { menu_item_name: string; quantity: number }[] }) => ({
        ...o,
        items: o.order_items ?? [],
      }))

      if (result.length > prevOrderCount.current && prevOrderCount.current > 0) {
        playBip()
        toast('🛵 Nuevo pedido asignado', { duration: 4000 })
      }
      prevOrderCount.current = result.length
      setOrders(result)
    } catch (err) {
      console.error('Error fetching driver orders:', err)
    } finally {
      setLoading(false)
    }
  }, [driver?.id])

  const fetchAvailability = useCallback(async () => {
    if (!driver?.id) return
    const { data } = await db.from('delivery_drivers').select('is_available').eq('id', driver.id).single()
    if (data) setIsAvailable(data.is_available)
  }, [driver?.id])

  useEffect(() => {
    fetchOrders()
    fetchAvailability()

    if (!driver?.id) return
    const channel = supabase
      .channel(`driver_orders_${driver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [fetchOrders, fetchAvailability, driver?.id])

  const toggleAvailability = async () => {
    if (!driver?.id) return
    const next = !isAvailable
    try {
      await db.from('delivery_drivers').update({ is_available: next }).eq('id', driver.id)
      setIsAvailable(next)
      toast.success(next ? 'Estás disponible' : 'No disponible')
    } catch {
      toast.error('Error al actualizar disponibilidad')
    }
  }

  const updateDeliveryStatus = async (orderId: string, status: string, extra?: Record<string, string>) => {
    try {
      await db.from('orders').update({ delivery_status: status, ...extra }).eq('id', orderId)
      toast.success('Estado actualizado')
      fetchOrders()
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  const handleLogout = () => {
    logout()
    navigate(`/delivery/${slug}/login`, { replace: true })
  }

  const openMaps = (address: string) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')
  }

  const callClient = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const activeOrders = orders.filter(o => o.delivery_status === 'picked_up')
  const readyOrders = orders.filter(o => o.delivery_status === 'ready')

  if (!driver) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0F1115', color: '#fff', fontFamily: 'var(--font-jakarta)' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)',
      }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-syne)' }}>
            🛵 Hola, {driver.first_name} 👋
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
            {isAvailable
              ? <span style={{ color: '#10B981' }}>● Disponible</span>
              : <span style={{ color: '#EF4444' }}>● No disponible</span>}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '8px 14px',
            color: '#EF4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <LogOut size={14} /> Salir
        </button>
      </div>

      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', paddingBottom: '100px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Active deliveries */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Mis pedidos activos ({activeOrders.length})
              </p>
              {activeOrders.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>Sin pedidos en camino</p>
                </div>
              ) : (
                activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="active"
                    onPickUp={() => {}}
                    onDeliver={() => {
                      if (window.confirm('¿Confirmar entrega?')) {
                        updateDeliveryStatus(order.id, 'delivered', { delivered_at: new Date().toISOString() })
                      }
                    }}
                    onCall={() => order.customer_phone && callClient(order.customer_phone)}
                    onMaps={() => order.customer_address && openMaps(order.customer_address)}
                  />
                ))
              )}
            </div>

            {/* Ready for pickup */}
            <div style={{ marginBottom: '28px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Listos para retirar ({readyOrders.length})
              </p>
              {readyOrders.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>Sin pedidos listos</p>
                </div>
              ) : (
                readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="ready"
                    onPickUp={() => updateDeliveryStatus(order.id, 'picked_up', { picked_up_at: new Date().toISOString() })}
                    onDeliver={() => {}}
                    onCall={() => order.customer_phone && callClient(order.customer_phone)}
                    onMaps={() => order.customer_address && openMaps(order.customer_address)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle availability */}
      <div style={{
        position: 'fixed', bottom: '0', left: '0', right: '0',
        padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        background: 'rgba(15,17,21,0.95)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={toggleAvailability}
          style={{
            width: '100%', padding: '14px',
            background: isAvailable ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isAvailable ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '16px',
            color: isAvailable ? '#10B981' : '#EF4444',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-syne)',
            transition: 'all 0.2s',
          }}
        >
          {isAvailable ? '🟢 Estoy disponible' : '🔴 No disponible'}
        </button>
      </div>
    </div>
  )
}

function OrderCard({ order, type, onPickUp, onDeliver, onCall, onMaps }: {
  order: DeliveryOrder
  type: 'active' | 'ready'
  onPickUp: () => void
  onDeliver: () => void
  onCall: () => void
  onMaps: () => void
}) {
  const accentColor = type === 'active' ? '#8B5CF6' : '#10B981'
  const statusLabel = type === 'active' ? '🛵 En camino' : '📦 Listo en cocina'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderLeft: `4px solid ${accentColor}`,
      marginBottom: '12px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <p style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '15px', margin: 0 }}>
            {order.customer_name}
          </p>
          <span style={{ fontSize: '11px', color: accentColor, fontWeight: 600, background: `${accentColor}18`, padding: '2px 8px', borderRadius: '20px' }}>
            {statusLabel}
          </span>
        </div>
        {order.customer_address && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} /> {order.customer_address}
          </p>
        )}
        {order.customer_phone && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
            📱 {order.customer_phone}
          </p>
        )}
      </div>

      {/* Items */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {order.items.map((item, i) => (
          <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '2px 0' }}>
            {item.quantity}x {item.menu_item_name}
          </p>
        ))}
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', marginTop: '8px' }}>
          Total: ${fmtPrice(order.total)} {order.delivery_fee ? `(env $${fmtPrice(order.delivery_fee)})` : ''}
        </p>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {order.customer_phone && (
          <ActionBtn icon={<Phone size={14} />} label="Llamar" color="#3B82F6" onClick={onCall} />
        )}
        {order.customer_address && (
          <ActionBtn icon={<MapPin size={14} />} label="Maps" color="#F59E0B" onClick={onMaps} />
        )}
        {type === 'ready' && (
          <ActionBtn icon={<Truck size={14} />} label="Salí a entregar" color="#F77F00" onClick={onPickUp} full />
        )}
        {type === 'active' && (
          <ActionBtn icon={<CheckCircle size={14} />} label="Marcar entregado" color="#10B981" onClick={onDeliver} full />
        )}
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, color, onClick, full }: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
  full?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: full ? '1 1 100%' : '0 0 auto',
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '9px 14px',
        background: `${color}18`, border: `1px solid ${color}30`,
        borderRadius: '10px', color,
        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        justifyContent: full ? 'center' : 'flex-start',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}28` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}18` }}
    >
      {icon} {label}
    </button>
  )
}

// suppress TS unused warning
const _Package = Package
void _Package
