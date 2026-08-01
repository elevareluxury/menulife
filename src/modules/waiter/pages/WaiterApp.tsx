import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import { CheckoutModal } from '@/modules/pos/components/CheckoutModal'
import toast from 'react-hot-toast'

/* ── Types ──────────────────────────────────────────────────────────── */
interface OrderRow {
  id: string
  status: string
  total: number | null
  created_at: string
  waiter_called: boolean | null
  bill_requested: boolean | null
  items: { menu_item_name: string; quantity: number }[]
}

interface TableRow {
  id: string
  table_number: string
  capacity: number
  status: string
  orders: OrderRow[]
}

interface TodayOrder {
  id: string
  total: number | null
  created_at: string
  table_number: string | null
  status: string
  items: { menu_item_name: string; quantity: number }[]
}

interface Notif {
  id: string
  type: string
  message: string
  is_read: boolean
  created_at: string
}

interface DetailItem {
  id: string
  menu_item_name: string
  quantity: number
  price_snapshot: number | null
  notes: string | null
}

interface DetailOrder {
  id: string
  status: string
  total: number | null
  created_at: string
  bill_requested: boolean | null
  waiter_called: boolean | null
  items: DetailItem[]
}

interface HistOrder {
  id: string
  total: number | null
  created_at: string
  status: string
  items: { menu_item_name: string; quantity: number }[]
}

interface MenuSec { id: string; name: string; sort_order: number }
interface MenuItem {
  id: string
  section_id: string
  name: string
  price_ars: number
  image_url: string | null
}
interface CartItem { itemId: string; name: string; price: number; quantity: number; notes: string }

type TabId = 'home' | 'notificaciones' | 'mesas' | 'profile'
type MesaView = 'grid' | 'detail' | 'newOrder'

/* ── Constants ──────────────────────────────────────────────────────── */
const BG     = '#0F1115'
const CARD   = 'rgba(255,255,255,0.04)'
const BDR    = '1px solid rgba(255,255,255,0.07)'
const ACCENT = '#F4705A'
const AMBER  = '#EF9F27'
const TEXT   = '#F5F7FA'
const MUTED  = 'rgba(255,255,255,0.45)'
const RED    = '#EF4444'
const GREEN  = '#10B981'
const YELLOW = '#F59E0B'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const QUICK_NOTES = ['Sin cebolla', 'Sin gluten', 'Extra queso', 'Poco hielo', 'Sin sal', 'Bien cocido']

/* ── Helpers ────────────────────────────────────────────────────────── */
function timeSince(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m} min`
  return `hace ${Math.floor(m / 60)}h`
}

function fmtARS(n: number | null) {
  if (!n) return '$0'
  return '$' + n.toLocaleString('es-AR')
}

function getMesaStatus(table: TableRow) {
  const ao = (table.orders ?? []).find(
    o => !['completed', 'cancelled', 'delivered'].includes(o.status)
  )
  if (ao?.waiter_called)
    return { icon: '🔔', label: 'Te están llamando!',      col: RED,       bg: 'rgba(239,68,68,0.12)',    bl: RED,                      urgent: true,  order: ao }
  if (ao?.status === 'ready')
    return { icon: '✅', label: 'Pedido listo en cocina!',  col: GREEN,     bg: 'rgba(16,185,129,0.10)',   bl: GREEN,                    urgent: true,  order: ao }
  if (ao?.bill_requested)
    return { icon: '💳', label: 'Pidieron la cuenta',       col: YELLOW,    bg: 'rgba(245,158,11,0.10)',   bl: YELLOW,                   urgent: true,  order: ao }
  if (ao)
    return { icon: '🟠', label: 'Ocupada',                  col: '#F97316', bg: 'rgba(249,115,22,0.06)',   bl: 'rgba(249,115,22,0.3)',   urgent: false, order: ao }
  return   { icon: '🟢', label: 'Libre',                    col: GREEN,     bg: 'rgba(16,185,129,0.04)',   bl: 'rgba(16,185,129,0.2)',   urgent: false, order: null as OrderRow | null }
}

function notifIcon(type: string) {
  if (type === 'call_waiter')    return '🔔'
  if (type === 'order_ready')    return '✅'
  if (type === 'new_order')      return '📦'
  if (type === 'bill_requested') return '💳'
  return '🔔'
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

/* ── Small UI pieces ────────────────────────────────────────────────── */
function Kpi({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: 'var(--font-ruda, var(--font-syne))', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, margin: '0 0 12px' }}>
      {children}
    </h2>
  )
}

function Btn({ label, onClick, accent, full, disabled }: { label: string; onClick: () => void; accent?: boolean; full?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ flex: full ? undefined : 1, width: full ? '100%' : undefined, padding: '9px 12px', background: accent ? ACCENT : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: accent ? '#fff' : TEXT, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      {label}
    </button>
  )
}

function BackBtn({ onBack, label = 'Volver' }: { onBack: () => void; label?: string }) {
  return (
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '20px 0 12px' }}>
      ← {label}
    </button>
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export function WaiterApp() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { waiter, logout } = useWaiterAuthStore()

  /* ── State ── */
  const [tab, setTab]               = useState<TabId>('home')
  const [tables, setTables]         = useState<TableRow[]>([])
  const [todayOrders, setToday]     = useState<TodayOrder[]>([])
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [isOnShift, setIsOnShift]   = useState(true)
  const [shiftStart, setShiftStart] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)

  // Mesas sub-screens
  const [mesaView, setMesaView]         = useState<MesaView>('grid')
  const [activeMesa, setActiveMesa]     = useState<TableRow | null>(null)
  const [detailOrder, setDetailOrder]   = useState<DetailOrder | null>(null)
  const [detailHisto, setDetailHisto]   = useState<HistOrder[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailModal, setDetailModal]   = useState<'cuenta' | 'obs' | 'mover' | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [obsText, setObsText]           = useState('')
  const [allTables, setAllTables]       = useState<{ id: string; table_number: string; status: string }[]>([])

  // New order sub-screen
  const [menuSections, setMenuSections] = useState<MenuSec[]>([])
  const [menuItems, setMenuItems]       = useState<MenuItem[]>([])
  const [cart, setCart]                 = useState<CartItem[]>([])
  const [selSection, setSelSection]     = useState<string>('')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [expandQty, setExpandQty]       = useState(1)
  const [expandNotes, setExpandNotes]   = useState('')
  const [orderSaving, setOrderSaving]   = useState(false)
  const [menuLoading, setMenuLoading]   = useState(false)
  const [openCashRegister, setOpenCashRegister] = useState<string | null>(null)

  const notifsReady = useRef(false)
  const prevIds     = useRef<Set<string>>(new Set())

  /* ── Caja abierta para vincular cobros ── */
  useEffect(() => {
    if (!waiter?.restaurant_id) return
    db.from('cash_registers')
      .select('id')
      .eq('restaurant_id', waiter.restaurant_id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setOpenCashRegister(data?.id ?? null))
  }, [waiter?.restaurant_id])

  /* ── fetchAll: realtime data ── */
  const fetchAll = useCallback(async () => {
    if (!waiter?.restaurant_id) return
    const today = new Date().toISOString().split('T')[0]

    try {
      const [t, o, n, p] = await Promise.all([
        db.from('tables')
          .select('id, table_number, capacity, status, orders:orders(id, status, total, created_at, waiter_called, bill_requested, items:order_items(menu_item_name, quantity))')
          .eq('restaurant_id', waiter.restaurant_id)
          .eq('waiter_id', waiter.id)
          .eq('is_active', true),
        db.from('orders')
          .select('id, total, created_at, table_number, status, items:order_items(menu_item_name, quantity)')
          .eq('restaurant_id', waiter.restaurant_id)
          .eq('waiter_id', waiter.id)
          .gte('created_at', `${today}T00:00:00`)
          .order('created_at', { ascending: false }),
        db.from('waiter_notifications')
          .select('id, type, message, is_read, created_at')
          .eq('waiter_id', waiter.id)
          .order('created_at', { ascending: false })
          .limit(50),
        db.from('waiters')
          .select('is_on_shift, shift_start')
          .eq('id', waiter.id)
          .single(),
      ])

      setTables(t.data ?? [])
      setToday(o.data ?? [])

      const fresh: Notif[] = n.data ?? []
      if (notifsReady.current) {
        const incoming = fresh.filter(x => !prevIds.current.has(x.id))
        if (incoming.length > 0) {
          playBeep()
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          incoming.forEach(x => toast(x.message, { icon: notifIcon(x.type) }))
        }
      } else {
        notifsReady.current = true
      }
      prevIds.current = new Set(fresh.map(x => x.id))
      setNotifs(fresh)

      if (p.data) {
        setIsOnShift(p.data.is_on_shift ?? true)
        setShiftStart(p.data.shift_start ?? null)
      }
    } catch (err) {
      console.error('fetchAll error:', err)
    } finally {
      setLoading(false)
    }
  }, [waiter])

  useEffect(() => {
    if (!waiter?.restaurant_id) return
    fetchAll()
  }, [waiter, fetchAll])

  useRealtimeChannel({
    channelName: `wa-o-${waiter?.id ?? 'none'}`,
    enabled: !!waiter?.restaurant_id,
    changes: [{ event: '*', table: 'orders', filter: `restaurant_id=eq.${waiter?.restaurant_id}` }],
    onEvent: () => { fetchAll() },
  })

  useRealtimeChannel({
    channelName: `wa-n-${waiter?.id ?? 'none'}`,
    enabled: !!waiter?.id,
    changes: [{ event: '*', table: 'waiter_notifications', filter: `waiter_id=eq.${waiter?.id}` }],
    onEvent: () => { fetchAll() },
  })

  useRealtimeChannel({
    channelName: `wa-t-${waiter?.id ?? 'none'}`,
    enabled: !!waiter?.id,
    changes: [{ event: '*', table: 'tables', filter: `waiter_id=eq.${waiter?.id}` }],
    onEvent: () => { fetchAll() },
  })

  /* ── Mesa detail fetch ── */
  const openDetail = useCallback(async (table: TableRow) => {
    if (!waiter?.restaurant_id) return
    setActiveMesa(table)
    setMesaView('detail')
    setDetailModal(null)
    setDetailLoading(true)
    try {
      const [orderRes, histRes, tablesRes] = await Promise.all([
        db.from('orders')
          .select('id, status, total, created_at, bill_requested, waiter_called, items:order_items(id, menu_item_name, quantity, price_snapshot, notes)')
          .eq('restaurant_id', waiter.restaurant_id)
          .eq('table_number', table.table_number)
          .in('status', ['pending', 'cooking', 'preparing', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        db.from('orders')
          .select('id, total, created_at, status, items:order_items(menu_item_name, quantity)')
          .eq('restaurant_id', waiter.restaurant_id)
          .eq('table_number', table.table_number)
          .in('status', ['completed', 'delivered'])
          .gte('created_at', `${new Date().toISOString().split('T')[0]}T00:00:00`)
          .order('created_at', { ascending: false }),
        db.from('tables')
          .select('id, table_number, status')
          .eq('restaurant_id', waiter.restaurant_id)
          .eq('is_active', true)
          .neq('id', table.id),
      ])
      setDetailOrder(orderRes.data ?? null)
      setDetailHisto(histRes.data ?? [])
      setAllTables(tablesRes.data ?? [])
    } catch (err) {
      console.error('openDetail error:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [waiter])

  /* ── Load menu for new order screen ── */
  const loadMenu = useCallback(async () => {
    if (!waiter?.restaurant_id || menuSections.length > 0) return
    setMenuLoading(true)
    try {
      const [sec, items] = await Promise.all([
        db.from('menu_sections').select('id, name, sort_order').eq('restaurant_id', waiter.restaurant_id).eq('is_active', true).order('sort_order'),
        db.from('menu_items').select('id, section_id, name, price_ars, image_url').eq('restaurant_id', waiter.restaurant_id).eq('is_available', true).order('sort_order'),
      ])
      const sections: MenuSec[] = sec.data ?? []
      setMenuSections(sections)
      setMenuItems(items.data ?? [])
      if (sections.length > 0 && !selSection) setSelSection(sections[0].id)
    } catch (err) {
      console.error('loadMenu error:', err)
    } finally {
      setMenuLoading(false)
    }
  }, [waiter, menuSections.length, selSection])

  /* ── Actions ── */
  const logActivity = (action: string, extra?: Record<string, string>) => {
    if (!waiter) return
    void db.from('waiter_activity_log')
      .insert({ restaurant_id: waiter.restaurant_id, waiter_id: waiter.id, action, ...extra })
      .then(null, () => {})
  }

  const attendCall = async (orderId: string) => {
    await db.from('orders').update({ waiter_called: false }).eq('id', orderId)
    logActivity('call_attended', { order_id: orderId })
    toast.success('Llamada atendida')
    fetchAll()
  }

  const deliverOrder = async (orderId: string) => {
    await db.from('orders').update({ status: 'delivered' }).eq('id', orderId)
    logActivity('order_delivered', { order_id: orderId })
    toast.success('¡Pedido entregado!')
    fetchAll()
  }

  const markRead = async (id: string) => {
    await db.from('waiter_notifications').update({ is_read: true }).eq('id', id)
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    if (!waiter) return
    await db.from('waiter_notifications').update({ is_read: true }).eq('waiter_id', waiter.id).eq('is_read', false)
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
  }

  const toggleShift = async () => {
    if (!waiter) return
    const next = !isOnShift
    await db.from('waiters').update({ is_on_shift: next, shift_start: next ? new Date().toISOString() : null }).eq('id', waiter.id)
    logActivity(next ? 'login' : 'logout')
    setIsOnShift(next)
    setShiftStart(next ? new Date().toISOString() : null)
    toast.success(next ? '🟢 Turno iniciado' : '⚫ Turno finalizado')
  }

  const handleLogout = async () => {
    if (waiter) {
      try { await db.from('waiters').update({ is_on_shift: false }).eq('id', waiter.id) } catch { /* ignore */ }
      logActivity('logout')
    }
    logout()
    navigate(`/mozo/${slug}`)
  }

  /* ── Detail actions ── */
  const requestBill = async () => {
    if (!detailOrder) return
    await db.from('orders').update({ bill_requested: true }).eq('id', detailOrder.id)
    toast.success('💳 Cuenta solicitada')
    setDetailOrder(prev => prev ? { ...prev, bill_requested: true } : prev)
    fetchAll()
  }

  const saveObs = async () => {
    if (!detailOrder || !obsText.trim()) return
    await db.from('orders').update({ notes: obsText }).eq('id', detailOrder.id)
    toast.success('Observación guardada')
    setDetailModal(null)
    setObsText('')
  }

  const freeTable = async () => {
    if (!activeMesa) return
    const hasActive = (activeMesa.orders ?? []).some(o => !['completed', 'cancelled', 'delivered'].includes(o.status))
    if (hasActive) { toast.error('La mesa tiene pedidos activos'); return }
    await db.from('tables').update({ status: 'free', waiter_id: null }).eq('id', activeMesa.id)
    toast.success('Mesa liberada')
    setMesaView('grid')
    fetchAll()
  }

  const moveTable = async (targetTableId: string) => {
    if (!detailOrder || !activeMesa) return
    const target = allTables.find(t => t.id === targetTableId)
    if (!target) return
    try {
      await Promise.all([
        db.from('orders').update({ table_number: target.table_number }).eq('id', detailOrder.id),
        db.from('tables').update({ status: 'occupied' }).eq('id', target.id),
        db.from('tables').update({ status: 'free' }).eq('id', activeMesa.id),
      ])
      toast.success(`Pedido movido a Mesa ${target.table_number}`)
      setDetailModal(null)
      setMesaView('grid')
      fetchAll()
    } catch { toast.error('Error al mover mesa') }
  }

  /* ── New order: cart management ── */
  const addToCart = (item: MenuItem) => {
    if (expandQty < 1) return
    setCart(prev => {
      const idx = prev.findIndex(c => c.itemId === item.id && c.notes === expandNotes)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + expandQty }
        return next
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price_ars, quantity: expandQty, notes: expandNotes }]
    })
    setExpandedId(null)
    setExpandQty(1)
    setExpandNotes('')
    toast(`✅ ${item.name} agregado`, { duration: 1500 })
  }

  const removeFromCart = (itemId: string, notes: string) => {
    setCart(prev => prev.filter(c => !(c.itemId === itemId && c.notes === notes)))
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  const submitOrder = async () => {
    if (!waiter || !activeMesa || cart.length === 0) return
    setOrderSaving(true)
    try {
      const { data: orderData, error: orderErr } = await db.from('orders').insert({
        restaurant_id: waiter.restaurant_id,
        table_number: activeMesa.table_number,
        waiter_id: waiter.id,
        order_type: 'dine_in',
        status: 'pending',
        subtotal: cartTotal,
        total: cartTotal,
        session_id: crypto.randomUUID(),
        currency: 'ARS',
      }).select('id').single()
      if (orderErr) throw orderErr

      for (const item of cart) {
        await db.from('order_items').insert({
          order_id: orderData.id,
          menu_item_id: item.itemId,
          menu_item_name: item.name,
          quantity: item.quantity,
          price_snapshot: item.price,
          notes: item.notes || null,
        })
      }
      await db.from('tables').update({ status: 'occupied' }).eq('id', activeMesa.id)

      setCart([])
      toast.success('✅ Pedido enviado a cocina')
      setMesaView('detail')
      openDetail(activeMesa)
      fetchAll()
    } catch (err) {
      toast.error('Error al enviar el pedido')
      console.error(err)
    } finally {
      setOrderSaving(false)
    }
  }

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(244,112,90,0.2)', borderTopColor: ACCENT }} />
    </div>
  )

  /* ── Derived data ── */
  const unread      = notifs.filter(n => !n.is_read).length
  const activeOrds  = todayOrders.filter(o => !['completed', 'cancelled', 'delivered'].includes(o.status))
  const doneOrds    = todayOrders.filter(o => ['completed', 'delivered'].includes(o.status))
  const totalSales  = doneOrds.reduce((s, o) => s + (o.total ?? 0), 0)
  const urgentCnt   = tables.filter(t => getMesaStatus(t).urgent).length
  const newNotifs   = notifs.filter(n => !n.is_read)
  const oldNotifs   = notifs.filter(n => n.is_read)
  const kitchenOrds = todayOrders.filter(o => ['pending', 'cooking', 'preparing', 'ready'].includes(o.status))

  const shiftDur = shiftStart
    ? (() => { const d = Date.now() - new Date(shiftStart).getTime(); return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m` })()
    : null

  const filteredItems = menuItems.filter(i => i.section_id === selSection)

  /* ── Detail consumo total ── */
  const detailTotal = (detailOrder?.items ?? []).reduce((s, i) => s + (i.price_snapshot ?? 0) * i.quantity, 0)

  /* ════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'var(--font-jakarta, Inter, sans-serif)', paddingBottom: 76 }}>

      {/* ══ HOME ══════════════════════════════════════════════════════ */}
      {tab === 'home' && (
        <div style={{ padding: '0 16px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 0 20px' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-ruda, var(--font-syne))', color: TEXT, margin: 0 }}>
                Hola, {waiter?.first_name} 👋
              </h1>
              <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
                {tables.length} mesa{tables.length !== 1 ? 's' : ''} asignada{tables.length !== 1 ? 's' : ''}
                {urgentCnt > 0 && <span style={{ color: RED, fontWeight: 700 }}> · {urgentCnt} urgente{urgentCnt > 1 ? 's' : ''}</span>}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isOnShift ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '5px 12px', border: `1px solid ${isOnShift ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnShift ? GREEN : '#6B7280' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: isOnShift ? GREEN : '#6B7280' }}>{isOnShift ? 'Turno activo' : 'Fuera'}</span>
              </div>
              <button onClick={handleLogout} style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>🚪 Salir</button>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <Kpi icon="📦" value={String(todayOrders.length)} label="Pedidos hoy" />
            <Kpi icon="💰" value={fmtARS(totalSales)} label="Ventas hoy" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <Kpi icon="🪑" value={String(new Set(doneOrds.map(o => o.table_number)).size)} label="Mesas atendidas" />
            <Kpi icon="⏳" value={activeOrds.length > 0 ? `${Math.floor((Date.now() - new Date(activeOrds[0].created_at).getTime()) / 60000)} min` : '—'} label="Más antiguo activo" />
          </div>

          {/* Mis Mesas */}
          <SecTitle>MIS MESAS</SecTitle>
          {tables.length === 0 ? (
            <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '32px 16px', textAlign: 'center', color: MUTED, marginBottom: 24 }}>
              No tenés mesas asignadas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {tables.map(table => {
                const st = getMesaStatus(table)
                const itms = st.order?.items?.length ?? 0
                return (
                  <div
                    key={table.id}
                    onClick={() => { setTab('mesas'); openDetail(table) }}
                    style={{ background: st.bg, border: st.urgent ? `1px solid ${st.col}40` : BDR, borderLeft: st.urgent ? `3px solid ${st.col}` : undefined, borderRadius: 16, padding: 16, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Mesa {table.table_number}</span>
                          <span style={{ fontSize: 12, color: MUTED }}>· {table.capacity} pers.</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{st.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: st.col }}>{st.label}</span>
                        </div>
                      </div>
                    </div>
                    {st.order && (
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
                        {itms} item{itms !== 1 ? 's' : ''} · {fmtARS(st.order.total)} · {timeSince(st.order.created_at)}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                      {st.order?.waiter_called && (
                        <Btn label="✅ Atendido" onClick={() => attendCall(st.order!.id)} accent />
                      )}
                      {st.order?.status === 'ready' && (
                        <Btn label="🍽️ Entregar" onClick={() => deliverOrder(st.order!.id)} accent />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pedidos recientes */}
          {doneOrds.length > 0 && (
            <>
              <SecTitle>PEDIDOS RECIENTES</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {doneOrds.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: CARD, border: BDR, borderRadius: 12 }}>
                    <span style={{ fontSize: 13, color: TEXT }}>Mesa {o.table_number ?? '—'}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{fmtARS(o.total)} · {timeSince(o.created_at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ NOTIFICACIONES ════════════════════════════════════════════ */}
      {tab === 'notificaciones' && (
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-ruda, var(--font-syne))', color: TEXT, margin: 0 }}>Notificaciones</h1>
            {newNotifs.length > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 13, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpiar todas</button>
            )}
          </div>

          {newNotifs.length > 0 && (
            <>
              <SecTitle>🔴 NUEVAS</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {newNotifs.map(n => (
                  <div key={n.id} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderLeft: `3px solid ${RED}`, borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{notifIcon(n.type)}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{n.message}</span>
                      </div>
                      <span style={{ fontSize: 12, color: MUTED }}>{timeSince(n.created_at)}</span>
                    </div>
                    <button onClick={() => markRead(n.id)} style={{ fontSize: 11, color: MUTED, background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                      Atendido
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {oldNotifs.length > 0 && (
            <>
              <SecTitle>📖 ANTERIORES</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {oldNotifs.slice(0, 20).map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: CARD, border: BDR, borderRadius: 12 }}>
                    <span style={{ fontSize: 15 }}>{notifIcon(n.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{timeSince(n.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {notifs.length === 0 && (
            <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '40px 16px', textAlign: 'center', color: MUTED }}>
              Sin notificaciones por ahora
            </div>
          )}
        </div>
      )}

      {/* ══ MESAS ═════════════════════════════════════════════════════ */}
      {tab === 'mesas' && (
        <>
          {/* ─ GRID VIEW ─ */}
          {mesaView === 'grid' && (
            <div style={{ padding: '0 16px 24px' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-ruda, var(--font-syne))', color: TEXT, padding: '20px 0 16px', margin: 0 }}>Mis Mesas</h1>

              {tables.length === 0 ? (
                <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '40px 16px', textAlign: 'center', color: MUTED }}>
                  No tenés mesas asignadas
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                    {tables.map(table => {
                      const st = getMesaStatus(table)
                      return (
                        <button
                          key={table.id}
                          onClick={() => openDetail(table)}
                          style={{ background: st.bg, border: `2px solid ${st.col}50`, borderRadius: 12, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', position: 'relative' }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{table.table_number}</span>
                          <span style={{ fontSize: 14 }}>{st.icon}</span>
                          {st.urgent && <div style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: RED }} />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 24 }}>
                    {[['🟢', 'Libre', GREEN], ['🟠', 'Ocupada', '#F97316'], ['🔔', 'Llamando', RED], ['✅', 'Listo', GREEN], ['💳', 'Cuenta', YELLOW]].map(([ic, lb]) => (
                      <span key={lb as string} style={{ fontSize: 11, color: MUTED }}>
                        {ic} {lb}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Estado de cocina */}
              {kitchenOrds.length > 0 && (
                <>
                  <SecTitle>🍳 EN COCINA</SecTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kitchenOrds.map(o => {
                      const ready = o.status === 'ready'
                      const statusLabel = ready ? '✅ Listo' : o.status === 'cooking' || o.status === 'preparing' ? '👨‍🍳 Preparando' : '⏳ Recibido'
                      return (
                        <div key={o.id} style={{ background: ready ? 'rgba(16,185,129,0.08)' : CARD, border: ready ? `1px solid ${GREEN}40` : BDR, borderLeft: ready ? `3px solid ${GREEN}` : undefined, borderRadius: 14, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, color: TEXT }}>Mesa {o.table_number ?? '—'}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: ready ? GREEN : AMBER }}>{statusLabel}</span>
                          </div>
                          <div style={{ fontSize: 12, color: MUTED, marginBottom: ready ? 10 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {o.items?.slice(0, 3).map(i => `${i.menu_item_name} x${i.quantity}`).join(' · ')}{(o.items?.length ?? 0) > 3 ? '…' : ''}
                          </div>
                          {ready && (
                            <button onClick={() => deliverOrder(o.id)} style={{ width: '100%', padding: 10, background: GREEN, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                              🍽️ Marcar servido
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─ DETAIL VIEW ─ */}
          {mesaView === 'detail' && activeMesa && (
            <div style={{ padding: '0 16px 24px' }}>
              <BackBtn onBack={() => setMesaView('grid')} label="Mis Mesas" />

              {/* Mesa header */}
              <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0 }}>Mesa {activeMesa.table_number}</h2>
                  {(() => {
                    const st = getMesaStatus(activeMesa)
                    return (
                      <span style={{ fontSize: 12, fontWeight: 700, color: st.col, background: `${st.col}18`, padding: '3px 10px', borderRadius: 999 }}>
                        {st.icon} {st.label}
                      </span>
                    )
                  })()}
                </div>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{activeMesa.capacity} personas · {detailOrder ? `Desde ${timeSince(detailOrder.created_at)}` : 'Sin pedido activo'}</p>
              </div>

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>Cargando...</div>
              ) : (
                <>
                  {/* Consumo actual */}
                  {detailOrder ? (
                    <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <SecTitle>CONSUMO ACTUAL</SecTitle>
                      {(detailOrder.items ?? []).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, color: TEXT }}>{item.quantity}x {item.menu_item_name}</span>
                            {item.notes && <p style={{ fontSize: 11, color: AMBER, margin: '2px 0 0' }}>⚠️ {item.notes}</p>}
                          </div>
                          <span style={{ fontSize: 13, color: MUTED }}>{item.price_snapshot ? fmtARS(item.price_snapshot * item.quantity) : '—'}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 }}>
                        <span style={{ fontWeight: 700, color: TEXT }}>Total parcial</span>
                        <span style={{ fontWeight: 700, color: ACCENT }}>{fmtARS(detailTotal)}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '24px 16px', textAlign: 'center', color: MUTED, marginBottom: 12 }}>
                      Mesa libre — sin consumo registrado
                    </div>
                  )}

                  {/* Acciones rápidas */}
                  <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <SecTitle>ACCIONES</SecTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <ActionTile icon="➕" label="Agregar pedido" accent onClick={async () => { await loadMenu(); setMesaView('newOrder') }} />
                      {detailOrder && <ActionTile icon="💳" label="Cobrar" accent onClick={() => setShowCheckout(true)} />}
                      {detailOrder && <ActionTile icon="📄" label="Ver cuenta" onClick={() => setDetailModal('cuenta')} />}
                      {detailOrder && !detailOrder.bill_requested && <ActionTile icon="💰" label="Solicitar cobro" onClick={requestBill} />}
                      {detailOrder && <ActionTile icon="📝" label="Agregar obs." onClick={() => { setObsText(''); setDetailModal('obs') }} />}
                      {detailOrder && <ActionTile icon="🔄" label="Mover mesa" onClick={() => setDetailModal('mover')} />}
                      <ActionTile icon="🚫" label="Liberar mesa" onClick={freeTable} />
                    </div>
                  </div>

                  {/* Historial de hoy */}
                  {detailHisto.length > 0 && (
                    <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                      <SecTitle>HISTORIAL DE HOY</SecTitle>
                      {detailHisto.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: 13, color: MUTED }}>{timeSince(o.created_at)}</span>
                          <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{fmtARS(o.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Modals inline */}
                  {detailModal === 'cuenta' && detailOrder && (
                    <div style={{ background: '#1a1f2e', border: `1px solid ${ACCENT}30`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <SecTitle>CUENTA — Mesa {activeMesa.table_number}</SecTitle>
                        <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>×</button>
                      </div>
                      {(detailOrder.items ?? []).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                          <span style={{ color: TEXT }}>{item.quantity}x {item.menu_item_name}</span>
                          <span style={{ color: MUTED }}>{item.price_snapshot ? fmtARS(item.price_snapshot * item.quantity) : '—'}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: BDR, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, color: TEXT, fontSize: 16 }}>TOTAL</span>
                        <span style={{ fontWeight: 800, color: ACCENT, fontSize: 16 }}>{fmtARS(detailTotal)}</span>
                      </div>
                    </div>
                  )}

                  {detailModal === 'obs' && (
                    <div style={{ background: '#1a1f2e', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <SecTitle>OBSERVACIÓN</SecTitle>
                        <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>×</button>
                      </div>
                      <textarea
                        value={obsText}
                        onChange={e => setObsText(e.target.value)}
                        placeholder="Nota para el pedido..."
                        rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 10, color: TEXT, padding: '10px 12px', fontSize: 14, resize: 'none', boxSizing: 'border-box' }}
                      />
                      <button onClick={saveObs} style={{ width: '100%', marginTop: 10, padding: 12, background: ACCENT, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        Guardar
                      </button>
                    </div>
                  )}

                  {detailModal === 'mover' && (
                    <div style={{ background: '#1a1f2e', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 16, padding: 20, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <SecTitle>MOVER A MESA</SecTitle>
                        <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>×</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {allTables.filter(t => t.status !== 'occupied').map(t => (
                          <button
                            key={t.id}
                            onClick={() => moveTable(t.id)}
                            style={{ padding: '12px 8px', background: 'rgba(255,255,255,0.07)', border: BDR, borderRadius: 10, color: TEXT, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Mesa {t.table_number}
                          </button>
                        ))}
                        {allTables.filter(t => t.status !== 'occupied').length === 0 && (
                          <span style={{ gridColumn: '1/-1', color: MUTED, fontSize: 13, textAlign: 'center' }}>No hay mesas disponibles</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─ NEW ORDER VIEW ─ */}
          {mesaView === 'newOrder' && activeMesa && (
            <div style={{ padding: '0 0 120px' }}>
              <div style={{ padding: '0 16px' }}>
                <BackBtn onBack={() => setMesaView('detail')} label={`Mesa ${activeMesa.table_number}`} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: '0 0 16px', fontFamily: 'var(--font-ruda, var(--font-syne))' }}>Nuevo pedido</h2>
              </div>

              {menuLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: MUTED }}>Cargando menú...</div>
              ) : (
                <>
                  {/* Category pills */}
                  <div style={{ display: 'flex', gap: 8, padding: '0 16px', overflowX: 'auto', paddingBottom: 2, marginBottom: 16, scrollbarWidth: 'none' }}>
                    {menuSections.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelSection(s.id)}
                        style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 999, border: 'none', background: selSection === s.id ? ACCENT : 'rgba(255,255,255,0.08)', color: selSection === s.id ? '#fff' : MUTED, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>

                  {/* Items list */}
                  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredItems.length === 0 && (
                      <div style={{ textAlign: 'center', color: MUTED, padding: '32px 0' }}>Sin ítems en esta sección</div>
                    )}
                    {filteredItems.map(item => {
                      const expanded = expandedId === item.id
                      return (
                        <div
                          key={item.id}
                          style={{ background: CARD, border: expanded ? `1px solid ${ACCENT}50` : BDR, borderRadius: 14, overflow: 'hidden' }}
                        >
                          <div
                            onClick={() => { setExpandedId(expanded ? null : item.id); setExpandQty(1); setExpandNotes('') }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}
                          >
                            {item.image_url && (
                              <img src={item.image_url} alt={item.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>{item.name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 13, color: ACCENT, fontWeight: 700 }}>{fmtARS(item.price_ars)}</p>
                            </div>
                            <span style={{ fontSize: 18, color: MUTED }}>{expanded ? '▲' : '+'}</span>
                          </div>

                          {expanded && (
                            <div style={{ padding: '0 14px 14px', borderTop: BDR }}>
                              {/* Qty selector */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                                <button onClick={() => setExpandQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: BDR, background: 'rgba(255,255,255,0.06)', color: TEXT, fontSize: 18, cursor: 'pointer' }}>−</button>
                                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT, minWidth: 24, textAlign: 'center' }}>{expandQty}</span>
                                <button onClick={() => setExpandQty(q => q + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: ACCENT, color: '#fff', fontSize: 18, cursor: 'pointer' }}>+</button>
                                <span style={{ fontSize: 14, color: MUTED, marginLeft: 4 }}>= {fmtARS(item.price_ars * expandQty)}</span>
                              </div>

                              {/* Quick note chips */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {QUICK_NOTES.map(chip => (
                                  <button
                                    key={chip}
                                    onClick={() => setExpandNotes(n => n ? `${n}, ${chip}` : chip)}
                                    style={{ padding: '4px 10px', borderRadius: 999, border: BDR, background: 'rgba(255,255,255,0.05)', color: MUTED, fontSize: 11, cursor: 'pointer' }}
                                  >
                                    {chip}
                                  </button>
                                ))}
                              </div>

                              <input
                                value={expandNotes}
                                onChange={e => setExpandNotes(e.target.value)}
                                placeholder="Observación..."
                                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 10, color: TEXT, padding: '8px 12px', fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }}
                              />

                              <button
                                onClick={() => addToCart(item)}
                                style={{ width: '100%', padding: 10, background: ACCENT, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                              >
                                Agregar al pedido
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Cart bottom sheet */}
              {cart.length > 0 && (
                <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, background: '#0D1018', borderTop: `1px solid ${ACCENT}30`, padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 50 }}>
                  <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 10 }}>
                    {cart.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                        <span style={{ fontSize: 13, color: TEXT }}>{c.quantity}x {c.name}{c.notes ? ` · ${c.notes}` : ''}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: MUTED }}>{fmtARS(c.price * c.quantity)}</span>
                          <button onClick={() => removeFromCart(c.itemId, c.notes)} style={{ background: 'none', border: 'none', color: RED, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={submitOrder}
                    disabled={orderSaving}
                    style={{ width: '100%', padding: 14, background: orderSaving ? 'rgba(244,112,90,0.5)' : ACCENT, border: 'none', borderRadius: 14, color: '#fff', fontWeight: 800, fontSize: 15, cursor: orderSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-ruda, var(--font-syne))' }}
                  >
                    {orderSaving ? '⏳ Enviando...' : `🍽️ Enviar a cocina · ${fmtARS(cartTotal)}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ PERFIL ═════════════════════════════════════════════════════ */}
      {tab === 'profile' && (
        <div style={{ padding: '0 16px 24px' }}>
          {/* Avatar */}
          <div style={{ padding: '28px 0 24px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-ruda, var(--font-syne))', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(244,112,90,0.35)' }}>
              {(waiter?.first_name?.[0] ?? '') + (waiter?.last_name?.[0] ?? '')}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-ruda, var(--font-syne))', color: TEXT, margin: '0 0 4px' }}>
              {waiter?.first_name} {waiter?.last_name}
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Mozo · MenuLife</p>
          </div>

          {/* Turno */}
          <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <SecTitle>TURNO ACTUAL</SecTitle>
            {shiftStart && (
              <p style={{ fontSize: 13, color: TEXT, margin: '0 0 12px' }}>
                Entrada: {new Date(shiftStart).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                {shiftDur && <span style={{ color: MUTED }}> · Lleva {shiftDur}</span>}
              </p>
            )}
            <button onClick={toggleShift} style={{ width: '100%', padding: 12, background: isOnShift ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isOnShift ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 12, color: isOnShift ? GREEN : TEXT, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnShift ? GREEN : '#6B7280' }} />
              {isOnShift ? 'En turno · Tocar para salir' : 'Fuera de turno · Tocar para entrar'}
            </button>
          </div>

          {/* Resumen */}
          <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <SecTitle>RESUMEN DE HOY</SecTitle>
            {([
              { icon: '📦', label: 'Pedidos',         value: todayOrders.length },
              { icon: '💰', label: 'Ventas',           value: fmtARS(totalSales) },
              { icon: '🪑', label: 'Mesas atendidas',  value: new Set(doneOrds.map(o => o.table_number)).size },
              { icon: '⏳', label: 'En curso ahora',   value: activeOrds.length },
            ] as { icon: string; label: string; value: string | number }[]).map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 13, color: TEXT }}>{icon} {label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{value}</span>
              </div>
            ))}
          </div>

          <button onClick={handleLogout} style={{ width: '100%', padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, color: RED, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🚪 Cerrar sesión
          </button>
        </div>
      )}

      {/* ══ CHECKOUT MODAL ═══════════════════════════════════════════════ */}
      {showCheckout && detailOrder && activeMesa && waiter && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false)
            setMesaView('grid')
            fetchAll()
          }}
          orderId={detailOrder.id}
          tableNumber={activeMesa.table_number}
          restaurantId={waiter.restaurant_id}
          cashRegisterId={openCashRegister}
          paidBy={`${waiter.first_name} ${waiter.last_name ?? ''}`.trim()}
          waiterId={waiter.id}
          waiterName={`${waiter.first_name} ${waiter.last_name ?? ''}`.trim()}
        />
      )}

      {/* ══ BOTTOM NAV ═════════════════════════════════════════════════ */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, paddingBottom: 'env(safe-area-inset-bottom)', background: '#0A0C10', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100 }}>
        {([
          { id: 'home'          as TabId, icon: '🏠', label: 'Inicio',        badge: 0 },
          { id: 'notificaciones' as TabId, icon: '🔔', label: 'Notifs',       badge: unread },
          { id: 'mesas'         as TabId, icon: '🍽️', label: 'Mesas',         badge: urgentCnt },
          { id: 'profile'       as TabId, icon: '👤', label: 'Perfil',         badge: 0 },
        ]).map(({ id, icon, label, badge }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id === 'mesas' && mesaView !== 'grid') setMesaView('grid') }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px', position: 'relative', color: tab === id ? ACCENT : MUTED, transition: 'color 200ms' }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === id ? 700 : 400 }}>{label}</span>
            {badge > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 6, minWidth: 18, height: 18, background: RED, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

/* ── ActionTile ─────────────────────────────────────────────────────── */
function ActionTile({ icon, label, onClick, accent }: { icon: string; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: accent ? `rgba(244,112,90,0.12)` : 'rgba(255,255,255,0.05)', border: accent ? `1px solid rgba(244,112,90,0.3)` : '1px solid rgba(255,255,255,0.07)', borderRadius: 14, cursor: 'pointer' }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: accent ? '#F4705A' : 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

// suppress unused var warning
void Btn
