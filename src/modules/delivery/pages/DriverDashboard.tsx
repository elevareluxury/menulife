import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, Phone, MapPin, CheckCircle, Truck, History, User, Home } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDeliveryAuthStore } from '@/store/deliveryAuthStore'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type TabId = 'orders' | 'historial' | 'perfil'

interface DeliveryOrder {
  id: string
  restaurant_id: string
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  status: string | null
  delivery_fee: number | null
  total: number
  currency: string
  created_at: string
  items: { menu_item_name: string; quantity: number }[]
}

function fmtPrice(n: number) {
  return n.toLocaleString('es-AR')
}

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'Ahora'
  if (diff < 60) return `hace ${diff}m`
  return `hace ${Math.floor(diff / 60)}h`
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
  const [tab, setTab] = useState<TabId>('orders')
  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [histOrders, setHistOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [todayEarnings, setTodayEarnings] = useState(0)
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
        .select('id, restaurant_id, customer_name, customer_phone, customer_address, status, delivery_fee, total, currency, created_at, order_items(menu_item_name, quantity)')
        .eq('delivery_driver_id', driver.id)
        .eq('order_type', 'delivery')
        .in('status', ['pending', 'preparing', 'ready', 'in_transit'])
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

  const fetchHistorial = useCallback(async () => {
    if (!driver?.id) return
    setHistLoading(true)
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data } = await db
        .from('orders')
        .select('id, restaurant_id, customer_name, customer_phone, customer_address, status, delivery_fee, total, currency, created_at, order_items(menu_item_name, quantity)')
        .eq('delivery_driver_id', driver.id)
        .eq('order_type', 'delivery')
        .in('status', ['delivered', 'cancelled'])
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      const result: DeliveryOrder[] = (data ?? []).map((o: DeliveryOrder & { order_items?: { menu_item_name: string; quantity: number }[] }) => ({
        ...o,
        items: o.order_items ?? [],
      }))
      const delivered = result.filter(o => o.status === 'delivered')
      setTodayCount(delivered.length)
      setTodayEarnings(delivered.reduce((s, o) => s + (o.total || 0), 0))
      setHistOrders(result)
    } catch (err) {
      console.error('Error fetching historial:', err)
    } finally {
      setHistLoading(false)
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
    fetchHistorial()

    if (!driver?.id) return
    const channel = supabase
      .channel(`driver_orders_${driver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
        fetchHistorial()
      })
      .subscribe()

    return () => { void channel.unsubscribe() }
  }, [fetchOrders, fetchAvailability, fetchHistorial, driver?.id])

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

  const updateStatus = async (order: DeliveryOrder, newStatus: string, extra?: Record<string, string>) => {
    try {
      const { error: updateError } = await db.from('orders').update({ status: newStatus, ...extra }).eq('id', order.id)
      if (updateError) throw updateError
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar estado')
      return
    }

    if (newStatus === 'in_transit' || newStatus === 'delivered') {
      const type = newStatus === 'in_transit' ? 'delivery_picked_up' : 'delivery_completed'
      const title = newStatus === 'in_transit' ? '🛵 Pedido en camino' : '✅ Pedido entregado'
      const message = newStatus === 'in_transit'
        ? `${driver?.first_name ?? 'Repartidor'} salió con el pedido de ${order.customer_name ?? 'cliente'}`
        : `El pedido de ${order.customer_name ?? 'cliente'} fue entregado`
      try {
        await db.from('owner_notifications').insert({
          restaurant_id: order.restaurant_id,
          type,
          title,
          message,
          data: { order_id: order.id, driver_name: `${driver?.first_name ?? ''} ${driver?.last_name ?? ''}`.trim() },
          is_read: false,
        })
      } catch (notifErr) {
        console.warn('[OwnerNotif] No se pudo notificar:', notifErr)
      }
    }

    fetchOrders()
    fetchHistorial()
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

  if (!driver) return null

  const inTransitOrders = orders.filter(o => o.status === 'in_transit')
  const readyOrders = orders.filter(o => o.status === 'ready')
  const preparingOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing')

  return (
    <div style={{ minHeight: '100vh', background: '#0F1115', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(20px)',
      }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 700, margin: 0, fontFamily: 'Ruda, sans-serif' }}>
            🛵 {driver.first_name} {driver.last_name ?? ''}
          </p>
          <p style={{ fontSize: '12px', margin: '2px 0 0' }}>
            {isAvailable
              ? <span style={{ color: '#22c55e' }}>● Disponible</span>
              : <span style={{ color: '#EF4444' }}>● No disponible</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Today stats pill */}
          <div style={{ background: 'rgba(239,159,39,0.12)', border: '1px solid rgba(239,159,39,0.2)', borderRadius: '20px', padding: '4px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#EF9F27', fontWeight: 700, margin: 0 }}>{todayCount} entregas hoy</p>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', paddingBottom: '90px' }}>
        {tab === 'orders' && (
          loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* In transit */}
              {inTransitOrders.length > 0 && (
                <Section label={`En camino (${inTransitOrders.length})`}>
                  {inTransitOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      type="active"
                      onPickUp={() => {}}
                      onDeliver={() => {
                        if (window.confirm('¿Confirmar entrega?')) {
                          updateStatus(order, 'delivered', { delivered_at: new Date().toISOString() })
                        }
                      }}
                      onCall={() => order.customer_phone && callClient(order.customer_phone)}
                      onMaps={() => order.customer_address && openMaps(order.customer_address)}
                    />
                  ))}
                </Section>
              )}

              {/* Ready for pickup */}
              <Section label={`Listos para retirar (${readyOrders.length})`}>
                {readyOrders.length === 0 ? (
                  <EmptyCard text="Sin pedidos listos" />
                ) : readyOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    type="ready"
                    onPickUp={() => updateStatus(order, 'in_transit', { picked_up_at: new Date().toISOString() })}
                    onDeliver={() => {}}
                    onCall={() => order.customer_phone && callClient(order.customer_phone)}
                    onMaps={() => order.customer_address && openMaps(order.customer_address)}
                  />
                ))}
              </Section>

              {/* Preparing */}
              {preparingOrders.length > 0 && (
                <Section label={`Preparando (${preparingOrders.length})`}>
                  {preparingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      type="preparing"
                      onPickUp={() => {}}
                      onDeliver={() => {}}
                      onCall={() => order.customer_phone && callClient(order.customer_phone)}
                      onMaps={() => order.customer_address && openMaps(order.customer_address)}
                    />
                  ))}
                </Section>
              )}

              {orders.length === 0 && (
                <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                  <p style={{ fontSize: '40px', marginBottom: '12px' }}>🛵</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px' }}>Sin pedidos asignados</p>
                </div>
              )}
            </>
          )
        )}

        {tab === 'historial' && (
          histLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Today stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <StatCard label="Entregas hoy" value={String(todayCount)} color="#22c55e" />
                <StatCard label="Ganancias hoy" value={`$${fmtPrice(todayEarnings)}`} color="#EF9F27" />
              </div>

              <Section label="Historial de hoy">
                {histOrders.length === 0 ? (
                  <EmptyCard text="Sin entregas hoy" />
                ) : histOrders.map(order => (
                  <HistCard key={order.id} order={order} />
                ))}
              </Section>
            </>
          )
        )}

        {tab === 'perfil' && (
          <div style={{ paddingTop: '8px' }}>
            {/* Driver card */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #F4705A, #EF9F27)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 700, margin: '0 auto 12px',
              }}>
                {driver.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <p style={{ fontFamily: 'Ruda, sans-serif', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>
                {driver.first_name} {driver.last_name ?? ''}
              </p>
              {driver.phone && (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>📱 {driver.phone}</p>
              )}
            </div>

            {/* Availability toggle */}
            <button
              onClick={toggleAvailability}
              style={{
                width: '100%', padding: '14px', marginBottom: '12px',
                background: isAvailable ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                border: `1px solid ${isAvailable ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '16px',
                color: isAvailable ? '#22c55e' : '#EF4444',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Ruda, sans-serif',
                transition: 'all 0.2s',
              }}
            >
              {isAvailable ? '🟢 Estoy disponible' : '🔴 No disponible — activar'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '14px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: '16px', color: '#EF4444',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: '0', left: '0', right: '0',
        background: 'rgba(15,17,21,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {([
          { id: 'orders', icon: <Home size={20} />, label: 'Pedidos' },
          { id: 'historial', icon: <History size={20} />, label: 'Historial' },
          { id: 'perfil', icon: <User size={20} />, label: 'Perfil' },
        ] as { id: TabId; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '12px 4px 10px',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              color: tab === t.id ? '#F4705A' : 'rgba(255,255,255,0.35)',
              transition: 'color 0.15s',
            }}
          >
            {t.icon}
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '28px', textAlign: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', margin: 0 }}>{text}</p>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: `1px solid ${color}20`, padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: '22px', fontWeight: 700, color, margin: '0 0 4px', fontFamily: 'Ruda, sans-serif' }}>{value}</p>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

function HistCard({ order }: { order: DeliveryOrder }) {
  const isDelivered = order.status === 'delivered'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.06)',
      borderLeft: `3px solid ${isDelivered ? '#22c55e' : '#EF4444'}`,
      padding: '12px 14px', marginBottom: '8px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{order.customer_name}</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{relTime(order.created_at)}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: isDelivered ? '#22c55e' : '#EF4444', margin: '0 0 2px' }}>
          {isDelivered ? '✓ Entregado' : '✕ Cancelado'}
        </p>
        {isDelivered && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>${(order.total || 0).toLocaleString('es-AR')}</p>}
      </div>
    </div>
  )
}

function OrderCard({ order, type, onPickUp, onDeliver, onCall, onMaps }: {
  order: DeliveryOrder
  type: 'active' | 'ready' | 'preparing'
  onPickUp: () => void
  onDeliver: () => void
  onCall: () => void
  onMaps: () => void
}) {
  const accentColor = type === 'active' ? '#8B5CF6' : type === 'ready' ? '#22c55e' : '#EF9F27'
  const statusLabel = type === 'active' ? '🛵 En camino' : type === 'ready' ? '📦 Listo en cocina' : '⏳ Preparando'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `4px solid ${accentColor}`,
      marginBottom: '12px', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <p style={{ fontFamily: 'Ruda, sans-serif', fontWeight: 700, fontSize: '15px', margin: 0 }}>
            {order.customer_name}
          </p>
          <span style={{ fontSize: '11px', color: accentColor, fontWeight: 600, background: `${accentColor}18`, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
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
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: '4px 0 0' }}>{relTime(order.created_at)}</p>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {order.items.map((item, i) => (
          <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '2px 0' }}>
            {item.quantity}× {item.menu_item_name}
          </p>
        ))}
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', marginTop: '8px', marginBottom: 0 }}>
          ${fmtPrice(order.total)} {order.delivery_fee ? `(env $${fmtPrice(order.delivery_fee)})` : ''}
        </p>
      </div>

      {type !== 'preparing' && (
        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {order.customer_phone && (
            <ActionBtn icon={<Phone size={14} />} label="Llamar" color="#3B82F6" onClick={onCall} />
          )}
          {order.customer_address && (
            <ActionBtn icon={<MapPin size={14} />} label="Maps" color="#F59E0B" onClick={onMaps} />
          )}
          {type === 'ready' && (
            <ActionBtn icon={<Truck size={14} />} label="Salí a entregar" color="#F4705A" onClick={onPickUp} full />
          )}
          {type === 'active' && (
            <ActionBtn icon={<CheckCircle size={14} />} label="Marcar entregado" color="#22c55e" onClick={onDeliver} full />
          )}
        </div>
      )}
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
