import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
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

type TabId = 'home' | 'orders' | 'alerts' | 'profile'

/* ── Constants ──────────────────────────────────────────────────────── */
const BG     = '#0F1115'
const CARD   = 'rgba(255,255,255,0.04)'
const BDR    = '1px solid rgba(255,255,255,0.07)'
const ACCENT = '#F4705A'
const TEXT   = '#F5F7FA'
const MUTED  = 'rgba(255,255,255,0.45)'
const RED    = '#EF4444'
const GREEN  = '#10B981'
const YELLOW = '#F59E0B'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

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
    return { icon: '🔔', label: 'Te están llamando!',      col: RED,    bg: 'rgba(239,68,68,0.12)',   bl: RED,                     urgent: true,  order: ao }
  if (ao?.status === 'ready')
    return { icon: '✅', label: 'Pedido listo en cocina!',  col: GREEN,  bg: 'rgba(16,185,129,0.10)',  bl: GREEN,                   urgent: true,  order: ao }
  if (ao?.bill_requested)
    return { icon: '💳', label: 'Pidieron la cuenta',       col: YELLOW, bg: 'rgba(245,158,11,0.10)', bl: YELLOW,                  urgent: true,  order: ao }
  if (ao)
    return { icon: '🟠', label: 'Ocupada',                  col: '#F97316', bg: 'rgba(249,115,22,0.06)', bl: 'rgba(249,115,22,0.3)', urgent: false, order: ao }
  return   { icon: '🟢', label: 'Libre',                    col: GREEN,  bg: 'rgba(16,185,129,0.04)', bl: 'rgba(16,185,129,0.2)',  urgent: false, order: null as OrderRow | null }
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
      <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: 'var(--font-syne)', lineHeight: 1 }}>{value}</div>
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

function Btn({ label, onClick, accent, full }: { label: string; onClick: () => void; accent?: boolean; full?: boolean }) {
  return (
    <button onClick={onClick} style={{ flex: full ? undefined : 1, width: full ? '100%' : undefined, padding: '9px 12px', background: accent ? ACCENT : 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 10, color: accent ? '#fff' : TEXT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  )
}

/* ── Main component ─────────────────────────────────────────────────── */
export function WaiterApp() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { waiter, logout, isAuthenticated } = useWaiterAuthStore()

  const [tab, setTab]               = useState<TabId>('home')
  const [tables, setTables]         = useState<TableRow[]>([])
  const [todayOrders, setToday]     = useState<TodayOrder[]>([])
  const [notifs, setNotifs]         = useState<Notif[]>([])
  const [isOnShift, setIsOnShift]   = useState(true)
  const [shiftStart, setShiftStart] = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const notifsReady = useRef(false)
  const prevIds     = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated() || !waiter?.restaurant_id) {
      navigate(`/mozo/${slug}`, { replace: true })
    }
  }, [isAuthenticated, navigate, slug, waiter])

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
    const s1 = db.channel(`wa-o-${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders',               filter: `restaurant_id=eq.${waiter.restaurant_id}` }, fetchAll).subscribe()
    const s2 = db.channel(`wa-n-${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_notifications', filter: `waiter_id=eq.${waiter.id}` },               fetchAll).subscribe()
    const s3 = db.channel(`wa-t-${waiter.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables',               filter: `waiter_id=eq.${waiter.id}` },               fetchAll).subscribe()
    return () => { s1.unsubscribe(); s2.unsubscribe(); s3.unsubscribe() }
  }, [waiter, fetchAll])

  /* ── Actions ──────────────────────────────────────────────────────── */
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
      try {
        await db.from('waiters').update({ is_on_shift: false }).eq('id', waiter.id)
      } catch { /* ignore */ }
      logActivity('logout')
    }
    logout()
    navigate(`/mozo/${slug}`)
  }

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="animate-spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(244,112,90,0.2)', borderTopColor: ACCENT }} />
    </div>
  )

  /* ── Derived data ─────────────────────────────────────────────────── */
  const unread      = notifs.filter(n => !n.is_read).length
  const activeOrds  = todayOrders.filter(o => !['completed', 'cancelled', 'delivered'].includes(o.status))
  const doneOrds    = todayOrders.filter(o => ['completed', 'delivered'].includes(o.status))
  const totalSales  = doneOrds.reduce((s, o) => s + (o.total ?? 0), 0)
  const urgentCnt   = tables.filter(t => getMesaStatus(t).urgent).length
  const newNotifs   = notifs.filter(n => !n.is_read)
  const oldNotifs   = notifs.filter(n => n.is_read)

  const shiftDur = shiftStart
    ? (() => { const d = Date.now() - new Date(shiftStart).getTime(); return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m` })()
    : null

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: 'var(--font-jakarta)', paddingBottom: 76 }}>

      {/* ══ HOME ══════════════════════════════════════════════════════ */}
      {tab === 'home' && (
        <div style={{ padding: '0 16px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 0 20px' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-syne)', color: TEXT, margin: 0 }}>
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
                <span style={{ fontSize: 12, fontWeight: 600, color: isOnShift ? GREEN : '#6B7280' }}>{isOnShift ? 'En turno' : 'Fuera'}</span>
              </div>
              <button onClick={handleLogout} style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer' }}>
                🚪 Salir
              </button>
            </div>
          </div>

          {/* KPIs 2×2 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <Kpi icon="📦" value={String(todayOrders.length)} label="Pedidos hoy" />
            <Kpi icon="💰" value={fmtARS(totalSales)} label="Ventas hoy" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <Kpi icon="🪑" value={String(new Set(doneOrds.map(o => o.table_number)).size)} label="Mesas atendidas" />
            <Kpi icon="⏱️" value={activeOrds.length > 0 ? `${Math.floor((Date.now() - new Date(activeOrds[0].created_at).getTime()) / 60000)} min` : '—'} label="Más antiguo activo" />
          </div>

          {/* Mesas */}
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
                  <div key={table.id} style={{ background: st.bg, border: st.urgent ? `1px solid ${st.col}40` : BDR, borderLeft: st.urgent ? `3px solid ${st.col}` : undefined, borderRadius: 16, padding: 16 }}>
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

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!st.order ? (
                        <Btn label="📋 Tomar pedido" onClick={() => navigate(`/waiter/${slug}/table/${table.table_number}`)} accent />
                      ) : (
                        <>
                          <Btn label="📋 Ver pedido" onClick={() => navigate(`/waiter/${slug}/table/${table.table_number}`)} />
                          {st.order.waiter_called && (
                            <Btn label="✅ Atendido" onClick={() => attendCall(st.order!.id)} accent />
                          )}
                          {st.order.status === 'ready' && (
                            <Btn label="🍽️ Entregar" onClick={() => deliverOrder(st.order!.id)} accent />
                          )}
                          {st.order.bill_requested && !st.order.waiter_called && st.order.status !== 'ready' && (
                            <Btn label="💳 Cobrar" onClick={() => navigate(`/waiter/${slug}/table/${table.table_number}`)} accent />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Recientes */}
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

      {/* ══ PEDIDOS ════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div style={{ padding: '0 16px 24px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-syne)', color: TEXT, padding: '20px 0 16px', margin: 0 }}>Mis pedidos</h1>

          {activeOrds.length > 0 ? (
            <>
              <SecTitle>⏳ ACTIVOS ({activeOrds.length})</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {activeOrds.map(o => {
                  const ready = o.status === 'ready'
                  const stLabel = ready ? '✅ LISTO' : o.status === 'cooking' ? '👨‍🍳 En cocina' : o.status === 'bill_requested' ? '💳 Cuenta pedida' : '⏳ Pendiente'
                  return (
                    <div key={o.id} style={{ background: ready ? 'rgba(16,185,129,0.08)' : CARD, border: ready ? `1px solid rgba(16,185,129,0.3)` : BDR, borderLeft: ready ? `3px solid ${GREEN}` : undefined, borderRadius: 16, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>Mesa {o.table_number ?? '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: ready ? GREEN : MUTED }}>{stLabel}</span>
                      </div>
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.items?.slice(0, 3).map(i => `${i.menu_item_name} x${i.quantity}`).join(' · ')}
                        {(o.items?.length ?? 0) > 3 ? '…' : ''}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ready ? 12 : 0 }}>
                        <span style={{ fontWeight: 600, color: TEXT }}>{fmtARS(o.total)}</span>
                        <span style={{ fontSize: 12, color: MUTED }}>⏱️ {timeSince(o.created_at)}</span>
                      </div>
                      {ready && (
                        <button onClick={() => deliverOrder(o.id)} style={{ width: '100%', padding: 10, background: GREEN, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                          🍽️ Marcar entregado
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '40px 16px', textAlign: 'center', color: MUTED, marginBottom: 24 }}>
              No hay pedidos activos
            </div>
          )}

          {doneOrds.length > 0 && (
            <>
              <SecTitle>✅ COMPLETADOS HOY ({doneOrds.length})</SecTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {doneOrds.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: CARD, border: BDR, borderRadius: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Mesa {o.table_number ?? '—'}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, color: TEXT }}>{fmtARS(o.total)}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{new Date(o.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ ALERTAS ════════════════════════════════════════════════════ */}
      {tab === 'alerts' && (
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-syne)', color: TEXT, margin: 0 }}>Notificaciones</h1>
            {newNotifs.length > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 13, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpiar</button>
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
                      OK
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

      {/* ══ PERFIL ═════════════════════════════════════════════════════ */}
      {tab === 'profile' && (
        <div style={{ padding: '0 16px 24px' }}>
          {/* Avatar */}
          <div style={{ padding: '28px 0 24px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-syne)', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(244,112,90,0.35)' }}>
              {(waiter?.first_name?.[0] ?? '') + (waiter?.last_name?.[0] ?? '')}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-syne)', color: TEXT, margin: '0 0 4px' }}>
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

          {/* Logout */}
          <button onClick={handleLogout} style={{ width: '100%', padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, color: RED, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🚪 Cerrar sesión
          </button>
        </div>
      )}

      {/* ══ BOTTOM NAV ════════════════════════════════════════════════ */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, paddingBottom: 'env(safe-area-inset-bottom)', background: '#0A0C10', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100 }}>
        {([
          { id: 'home'    as TabId, icon: '🏠', label: 'Inicio',  badge: 0 },
          { id: 'orders'  as TabId, icon: '📋', label: 'Pedidos', badge: activeOrds.length },
          { id: 'alerts'  as TabId, icon: '🔔', label: 'Alertas', badge: unread },
          { id: 'profile' as TabId, icon: '👤', label: 'Perfil',  badge: 0 },
        ]).map(({ id, icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
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
