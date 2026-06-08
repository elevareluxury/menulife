import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'

// ─── palette (dark) ──────────────────────────────────────────────────────────
const SURFACE = '#16181F'
const CARD    = 'rgba(255,255,255,0.04)'
const BDR     = '1px solid rgba(255,255,255,0.08)'
const ACCENT  = '#F4705A'
const GREEN   = '#22c55e'
const RED     = '#ef4444'
const AMBER   = '#f59e0b'
const PURPLE  = '#a855f7'
const BLUE    = '#3b82f6'
const TEXT    = '#F5F7FA'
const MUTED   = 'rgba(255,255,255,0.45)'

// ─── chart theme helpers ──────────────────────────────────────────────────────
const db = supabase as any

function fmtARS(n: number) { return '$' + Math.abs(n).toLocaleString('es-AR') }
function fmtK(n: number)   { return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}` }
function fmtShortDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
function fmtDayShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
}

type Period = 'today' | 'week' | 'month' | 'custom'
type SubTab = 'ventas' | 'finanzas' | 'conciliacion'

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function endOfDay(d: Date)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }

function getPeriodRange(period: Period, customFrom: Date, customTo: Date) {
  const now = new Date()
  if (period === 'today')  return { from: startOfDay(now), to: endOfDay(now) }
  if (period === 'week')   return { from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) }
  if (period === 'month')  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
  return { from: startOfDay(customFrom), to: endOfDay(customTo) }
}

function getPrevPeriod(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - ms - 1), to: new Date(from.getTime() - 1) }
}

function deltaDisplay(curr: number, prev: number) {
  if (prev === 0) return null
  const pct = Math.round(((curr - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

// ─── shared components ────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d24', border: BDR, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: TEXT }}>
      <div style={{ color: MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: MUTED }}>{p.name}:</span>
          <span style={{ color: TEXT, fontWeight: 700 }}>{fmtARS(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>
      {children}
    </p>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

// ─── VENTAS TAB ───────────────────────────────────────────────────────────────

interface SalesData {
  revenue: number; prevRevenue: number
  orders: number; prevOrders: number
  avgTicket: number
  salesByDay: { day: string; actual: number; anterior: number }[]
  topItems: { name: string; units: number }[]
  byType: { type: string; count: number; revenue: number }[]
}

const TYPE_COLOR: Record<string, string> = { dine_in: '#888', delivery: ACCENT, takeaway: AMBER }
const TYPE_LABEL: Record<string, string> = { dine_in: 'Mesa', delivery: 'Delivery', takeaway: 'Para llevar' }

function useSalesData(restaurantId: string | undefined, from: Date, to: Date) {
  const [data, setData]     = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const prev = getPrevPeriod(from, to)
      const [ftRes, prevFtRes, ordersRes, prevOrdersRes] = await Promise.all([
        db.from('financial_transactions')
          .select('amount, created_at')
          .eq('restaurant_id', restaurantId)
          .eq('type', 'sale')
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),
        db.from('financial_transactions')
          .select('amount')
          .eq('restaurant_id', restaurantId)
          .eq('type', 'sale')
          .gte('created_at', prev.from.toISOString())
          .lte('created_at', prev.to.toISOString()),
        db.from('orders')
          .select('id, order_type, created_at')
          .eq('restaurant_id', restaurantId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),
        db.from('orders')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', prev.from.toISOString())
          .lte('created_at', prev.to.toISOString()),
      ])

      const ft: any[]       = ftRes.data ?? []
      const prevFt: any[]   = prevFtRes.data ?? []
      const orders: any[]   = ordersRes.data ?? []
      const prevOrders: any[] = prevOrdersRes.data ?? []

      const revenue     = ft.reduce((s, r) => s + (r.amount ?? 0), 0)
      const prevRevenue = prevFt.reduce((s, r) => s + (r.amount ?? 0), 0)
      const ordCount    = orders.length
      const prevOrdCount = prevOrders.length

      // Sales by day from financial_transactions
      const dayMap: Record<string, number> = {}
      const prevDayMap: Record<string, number> = {}
      ft.forEach(r => { const d = r.created_at?.slice(0, 10); if (d) dayMap[d] = (dayMap[d] ?? 0) + (r.amount ?? 0) })
      // prev aligned by index offset
      const dayKeys  = Object.keys(dayMap).sort()

      // Build prev revenue by day map from prevFt
      prevFt.forEach(r => { const d = r.created_at?.slice(0, 10); if (d) prevDayMap[d] = (prevDayMap[d] ?? 0) + (r.amount ?? 0) })
      const prevDayKeys = Object.keys(prevDayMap).sort()

      const salesByDay = dayKeys.map((day, i) => ({
        day,
        actual: dayMap[day],
        anterior: prevDayKeys[i] ? (prevDayMap[prevDayKeys[i]] ?? 0) : 0,
      }))

      // Top items from order_items
      let topItems: { name: string; units: number }[] = []
      if (orders.length > 0) {
        const ids = orders.map(o => o.id)
        const { data: items } = await db.from('order_items')
          .select('menu_item_name, quantity')
          .in('order_id', ids)
        const itemMap: Record<string, number> = {}
        for (const it of (items ?? [])) {
          itemMap[it.menu_item_name] = (itemMap[it.menu_item_name] ?? 0) + (it.quantity ?? 1)
        }
        topItems = Object.entries(itemMap)
          .map(([name, units]) => ({ name, units }))
          .sort((a, b) => b.units - a.units)
          .slice(0, 5)
      }

      // By order type
      const typeMap: Record<string, { count: number; revenue: number }> = {}
      orders.forEach(o => {
        const t = o.order_type ?? 'dine_in'
        if (!typeMap[t]) typeMap[t] = { count: 0, revenue: 0 }
        typeMap[t].count++
      })
      const byType = Object.entries(typeMap).map(([type, v]) => ({ type, ...v }))

      setData({
        revenue, prevRevenue, orders: ordCount, prevOrders: prevOrdCount,
        avgTicket: ordCount > 0 ? Math.round(revenue / ordCount) : 0,
        salesByDay, topItems, byType,
      })
    } catch (err) {
      console.error('useSalesData error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, from, to])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading }
}

function VentasTab({ restaurantId, from, to }: { restaurantId: string; from: Date; to: Date }) {
  const { data: s, loading } = useSalesData(restaurantId, from, to)
  if (loading) return <Spinner />
  if (!s) return null

  const maxUnits   = s.topItems[0]?.units ?? 1
  const typeTotal  = s.byType.reduce((sum, t) => sum + t.count, 0)
  const d          = deltaDisplay(s.revenue, s.prevRevenue)
  const dOrders    = deltaDisplay(s.orders, s.prevOrders)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Hero */}
      <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '20px 22px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>
          Ingresos del período
        </p>
        <p style={{ fontSize: 36, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>
          {fmtARS(s.revenue)}
        </p>
        {d && (
          <p style={{ fontSize: 12, fontWeight: 600, color: d.up ? GREEN : RED, margin: '4px 0 0' }}>
            {d.up ? '↑' : '↓'} {d.pct}% vs período anterior
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {[
            { label: 'Pedidos', value: s.orders.toString(), delta: dOrders },
            { label: 'Ticket prom.', value: fmtARS(s.avgTicket) },
            {
              label: 'Mejor día',
              value: s.salesByDay.length
                ? fmtDayShort(s.salesByDay.reduce((a, b) => a.actual > b.actual ? a : b).day)
                : '—',
            },
          ].map(chip => (
            <div key={chip.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 12px', fontSize: 12 }}>
              <span style={{ color: MUTED }}>{chip.label} </span>
              <span style={{ fontWeight: 700, color: TEXT }}>{chip.value}</span>
              {chip.delta && (
                <span style={{ marginLeft: 4, fontSize: 11, color: chip.delta.up ? GREEN : RED }}>
                  {chip.delta.up ? '↑' : '↓'}{chip.delta.pct}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* LineChart */}
      {s.salesByDay.length > 1 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 4px 8px 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 16px' }}>
            Ventas por día
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={s.salesByDay} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tickFormatter={fmtShortDate} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<DarkTooltip />} />
              <Line type="monotone" dataKey="actual" name="Período actual" stroke={ACCENT} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: ACCENT }} />
              <Line type="monotone" dataKey="anterior" name="Período anterior" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top items */}
      {s.topItems.length > 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            🏆 Top platos del período
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.topItems.map((item, i) => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{i + 1}. {item.name}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{item.units} uds</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                  <div style={{ height: '100%', borderRadius: 999, background: i === 0 ? ACCENT : 'rgba(255,255,255,0.2)', width: `${Math.round((item.units / maxUnits) * 100)}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By order type */}
      {s.byType.length > 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            Desglose por tipo de pedido
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={s.byType.map(t => ({ name: TYPE_LABEL[t.type] ?? t.type, value: t.count }))}
                    cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" strokeWidth={0}
                  >
                    {s.byType.map(t => <Cell key={t.type} fill={TYPE_COLOR[t.type] ?? '#888'} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} pedidos`, '']} contentStyle={{ background: SURFACE, border: BDR, borderRadius: 10, color: TEXT, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.byType.map(t => {
                const pct = typeTotal > 0 ? Math.round((t.count / typeTotal) * 100) : 0
                return (
                  <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[t.type] ?? '#888', flexShrink: 0 }} />
                    <span style={{ color: MUTED, flex: 1 }}>{TYPE_LABEL[t.type] ?? t.type}</span>
                    <span style={{ fontWeight: 700, color: TEXT }}>{t.count}</span>
                    <span style={{ color: MUTED, fontSize: 11, width: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {s.orders === 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <p style={{ color: TEXT, fontSize: 14 }}>Sin ventas registradas en este período</p>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Probá con otro rango de fechas</p>
        </div>
      )}
    </div>
  )
}

// ─── FINANZAS TAB ─────────────────────────────────────────────────────────────

interface DailyFinanceRow {
  date: string
  sales: number; expenses: number; tips: number
  refunds: number; courtesies: number; net: number
}

function useDailyFinance(restaurantId: string | undefined, from: Date, to: Date) {
  const [data, setData]     = useState<DailyFinanceRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data: rows } = await db
        .from('view_daily_finance')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', from.toISOString().slice(0, 10))
        .lte('date', to.toISOString().slice(0, 10))
        .order('date')
      setData((rows ?? []).map((r: any) => ({
        date:       r.date ?? '',
        sales:      Number(r.sales      ?? 0),
        expenses:   Number(r.expenses   ?? 0),
        tips:       Number(r.tips       ?? 0),
        refunds:    Number(r.refunds    ?? 0),
        courtesies: Number(r.courtesies ?? 0),
        net:        r.net != null ? Number(r.net) : Number(r.sales ?? 0) - Number(r.expenses ?? 0) - Number(r.refunds ?? 0) - Number(r.courtesies ?? 0),
      })))
    } catch (err) {
      console.error('useDailyFinance error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, from, to])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading }
}

function FinanzasTab({ restaurantId, from, to, period }: { restaurantId: string; from: Date; to: Date; period: Period }) {
  const { data, loading } = useDailyFinance(restaurantId, from, to)

  // Hourly stats for reports
  const [hourly, setHourly] = useState<any[]>([])
  const [topItems, setTopItems] = useState<any[]>([])
  useEffect(() => {
    if (!restaurantId) return
    Promise.all([
      db.from('view_hourly_stats').select('*').eq('restaurant_id', restaurantId),
      db.from('view_top_items').select('*').eq('restaurant_id', restaurantId).order('units_sold', { ascending: false }).limit(10),
    ]).then(([hRes, tRes]) => {
      setHourly(hRes.data ?? [])
      setTopItems(tRes.data ?? [])
    }).catch(() => {})
  }, [restaurantId])

  if (loading) return <Spinner />

  const totals = data.reduce((acc, r) => ({
    sales:      acc.sales      + r.sales,
    expenses:   acc.expenses   + r.expenses,
    tips:       acc.tips       + r.tips,
    refunds:    acc.refunds    + r.refunds,
    courtesies: acc.courtesies + r.courtesies,
    net:        acc.net        + r.net,
  }), { sales: 0, expenses: 0, tips: 0, refunds: 0, courtesies: 0, net: 0 })

  const netPositive = totals.net >= 0

  const summaryCards = [
    { label: 'Ventas',     value: fmtARS(totals.sales),      color: GREEN   },
    { label: 'Gastos',     value: fmtARS(totals.expenses),   color: RED     },
    { label: 'Propinas',   value: fmtARS(totals.tips),       color: AMBER   },
    { label: 'Reembolsos', value: fmtARS(totals.refunds),    color: MUTED   },
    { label: 'Cortesías',  value: fmtARS(totals.courtesies), color: PURPLE  },
  ]

  const hourlyChart = hourly
    .sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0))
    .map(r => ({ hour: `${String(r.hour ?? 0).padStart(2, '0')}:00`, revenue: Number(r.revenue ?? 0), orders: Number(r.order_count ?? r.orders ?? 0) }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: CARD, border: BDR, borderRadius: 16, padding: '14px 18px' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{c.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: c.color, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>{c.value}</p>
          </div>
        ))}
        {/* NETO — full width */}
        <div style={{ background: netPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${netPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 16, padding: '14px 18px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>NETO</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: netPositive ? GREEN : RED, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>
            {netPositive ? '' : '-'}{fmtARS(totals.net)}
          </p>
        </div>
      </div>

      {/* Period-adaptive chart */}
      {data.length > 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 4px 8px 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 16px' }}>
            {period === 'today' ? 'Resumen del día' : period === 'week' ? 'Ventas vs Gastos por día' : 'Evolución diaria'}
          </p>
          {(period === 'today' || data.length <= 1) ? (
            /* Today: show profitability bar */
            <div style={{ padding: '0 16px 8px' }}>
              {['sales', 'expenses', 'tips'].map(k => {
                const v = totals[k as keyof typeof totals]
                const color = k === 'sales' ? GREEN : k === 'expenses' ? RED : AMBER
                const label = k === 'sales' ? 'Ventas' : k === 'expenses' ? 'Gastos' : 'Propinas'
                const max = Math.max(totals.sales, 1)
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED, marginBottom: 4 }}>
                      <span>{label}</span><span style={{ color, fontWeight: 700 }}>{fmtARS(v)}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                      <div style={{ height: '100%', background: color, borderRadius: 999, width: `${Math.min(100, (v / max) * 100)}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : period === 'month' ? (
            /* Month: LineChart */
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.map(r => ({ day: fmtShortDate(r.date), ventas: r.sales, gastos: r.expenses }))} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="ventas" name="Ventas" stroke={GREEN} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gastos" name="Gastos" stroke={RED} strokeWidth={2} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            /* Week: grouped BarChart */
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.map(r => ({ day: fmtDayShort(r.date), ventas: r.sales, gastos: r.expenses }))} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="ventas" name="Ventas" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="gastos" name="Gastos" fill={RED} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {data.length === 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ color: MUTED, fontSize: 14 }}>Sin datos financieros para este período</p>
        </div>
      )}

      {/* ── REPORTES ── */}
      <div style={{ borderTop: BDR, paddingTop: 20 }}>
        <SectionLabel>Reportes</SectionLabel>

        {/* Profitability */}
        <div style={{ background: netPositive ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${netPositive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 20, padding: '20px 22px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>Rentabilidad del período</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: MUTED }}>{fmtARS(totals.sales)}</span>
            <span style={{ fontSize: 13, color: MUTED }}>−</span>
            <span style={{ fontSize: 13, color: MUTED }}>{fmtARS(totals.expenses)}</span>
            <span style={{ fontSize: 13, color: MUTED }}>=</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: netPositive ? GREEN : RED, fontFamily: 'var(--font-ruda, sans-serif)' }}>
              {netPositive ? '' : '-'}{fmtARS(totals.net)}
            </span>
          </div>
        </div>

        {/* Hourly BarChart */}
        {hourlyChart.length > 0 && (
          <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 4px 8px 4px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 16px' }}>Ventas por hora</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyChart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tickFormatter={fmtK} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="revenue" name="Ventas" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top items table */}
        {topItems.length > 0 && (
          <div style={{ background: CARD, border: BDR, borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', borderBottom: BDR }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Top productos</p>
            </div>
            {topItems.map((item: any, idx: number) => (
              <div key={item.menu_item_name ?? item.item_name ?? idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: idx < topItems.length - 1 ? BDR : 'none' }}>
                <span style={{ fontSize: 13, color: TEXT }}>
                  <span style={{ color: MUTED, marginRight: 8 }}>#{idx + 1}</span>
                  {item.menu_item_name ?? item.item_name ?? '—'}
                </span>
                <span style={{ fontSize: 13, color: MUTED }}>{item.units_sold ?? item.quantity ?? '—'} uds</span>
              </div>
            ))}
          </div>
        )}

        {/* Export button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            disabled
            title="Próximamente: PDF, Excel, CSV"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(255,255,255,0.04)', border: BDR, borderRadius: 12, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'not-allowed', opacity: 0.6 }}
          >
            <Download style={{ width: 16, height: 16 }} />
            Exportar
            <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 6px' }}>Próximamente</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CONCILIACIÓN TAB ─────────────────────────────────────────────────────────

const METHOD_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  cash:           { label: 'Efectivo',      icon: '💵', color: GREEN  },
  efectivo:       { label: 'Efectivo',      icon: '💵', color: GREEN  },
  debit_card:     { label: 'Débito',        icon: '💳', color: BLUE   },
  debito:         { label: 'Débito',        icon: '💳', color: BLUE   },
  credit_card:    { label: 'Crédito',       icon: '💳', color: PURPLE },
  credito:        { label: 'Crédito',       icon: '💳', color: PURPLE },
  transfer:       { label: 'Transferencia', icon: '📱', color: AMBER  },
  transferencia:  { label: 'Transferencia', icon: '📱', color: AMBER  },
  mercadopago:    { label: 'MercadoPago',   icon: '🟣', color: '#009ee3' },
  other:          { label: 'Otro',          icon: '📝', color: MUTED  },
  otro:           { label: 'Otro',          icon: '📝', color: MUTED  },
}

interface ConcRow { method: string; count: number; total: number }

function useConciliation(restaurantId: string | undefined, from: Date, to: Date) {
  const [data, setData]     = useState<ConcRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data: rows, error } = await db
        .from('view_payment_conciliation')
        .select('*')
        .eq('restaurant_id', restaurantId)
      if (error) throw error
      const filtered = (rows ?? []).filter((r: any) => {
        if (!r.date) return true
        const d = r.date as string
        return d >= from.toISOString().slice(0, 10) && d <= to.toISOString().slice(0, 10)
      })
      setData(filtered.map((r: any) => ({
        method: r.payment_method ?? r.method ?? 'other',
        count:  Number(r.transaction_count ?? r.count ?? 0),
        total:  Number(r.total_amount ?? r.total ?? 0),
      })))
    } catch (err) {
      console.error('useConciliation error:', err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [restaurantId, from, to])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading }
}

function ConciliacionTab({ restaurantId, from, to }: { restaurantId: string; from: Date; to: Date }) {
  const { data, loading } = useConciliation(restaurantId, from, to)
  if (loading) return <Spinner />

  const totalCount = data.reduce((s, r) => s + r.count, 0)
  const totalAmt   = data.reduce((s, r) => s + r.total, 0)

  const chartData = data.map(r => {
    const cfg = METHOD_CONFIG[r.method.toLowerCase()] ?? { label: r.method, icon: '📝', color: MUTED }
    return { name: cfg.label, total: r.total, fill: cfg.color }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Cards by method */}
      {data.length === 0 ? (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ color: MUTED, fontSize: 14 }}>Sin datos de pagos para este período</p>
        </div>
      ) : (
        <div style={{ background: SURFACE, border: BDR, borderRadius: 20, overflow: 'hidden' }}>
          {data.map((row, idx) => {
            const cfg = METHOD_CONFIG[row.method.toLowerCase()] ?? { label: row.method, icon: '📝', color: MUTED }
            return (
              <div key={row.method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: idx < data.length - 1 ? BDR : 'none', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{cfg.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                  <span style={{ color: MUTED }}>Trans: <span style={{ fontWeight: 700, color: TEXT }}>{row.count}</span></span>
                  <span style={{ color: cfg.color, fontWeight: 700 }}>{fmtARS(row.total)}</span>
                </div>
              </div>
            )
          })}
          {/* Total row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.12)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>TOTAL</span>
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span style={{ color: MUTED }}>Trans: <span style={{ fontWeight: 700, color: TEXT }}>{totalCount}</span></span>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{fmtARS(totalAmt)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal BarChart */}
      {chartData.length > 0 && (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '18px 4px 8px 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 16px' }}>
            Distribución por método
          </p>
          <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 38)}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtK} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="total" name="Total" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today',  label: 'Hoy' },
  { id: 'week',   label: 'Semana' },
  { id: 'month',  label: 'Mes' },
  { id: 'custom', label: 'Personalizado' },
]

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'ventas',       label: 'Ventas' },
  { id: 'finanzas',     label: 'Finanzas' },
  { id: 'conciliacion', label: 'Conciliación' },
]

export function EstadisticasPage() {
  const { restaurant } = useRestaurant()
  const [tab, setTab]       = useState<SubTab>('ventas')
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState(() => startOfDay(new Date(Date.now() - 6 * 86400000)))
  const [customTo,   setCustomTo]   = useState(() => startOfDay(new Date()))

  const { from, to } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const today = new Date().toISOString().slice(0, 10)
  const rId   = restaurant?.id

  const btnBase: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 150ms',
  }
  const btnActive: React.CSSProperties   = { ...btnBase, background: ACCENT, color: '#fff' }
  const btnInactive: React.CSSProperties = { ...btnBase, background: 'rgba(255,255,255,0.06)', color: MUTED }

  const subBtnBase: React.CSSProperties   = { ...btnBase, padding: '8px 18px', fontSize: 14 }
  const subBtnActive: React.CSSProperties = { ...subBtnBase, background: SURFACE, color: TEXT, border: BDR }
  const subBtnInactive: React.CSSProperties = { ...subBtnBase, background: 'transparent', color: MUTED }

  return (
    <div style={{ color: TEXT, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart2 style={{ width: 20, height: 20, color: ACCENT }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>Estadísticas</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{restaurant?.name}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 4 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tab === t.id ? subBtnActive : subBtnInactive}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={period === p.id ? btnActive : btnInactive}>
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="date" value={customFrom.toISOString().slice(0, 10)} max={today}
              onChange={e => setCustomFrom(new Date(e.target.value + 'T00:00:00'))}
              style={{ background: SURFACE, border: BDR, borderRadius: 10, padding: '6px 10px', color: TEXT, fontSize: 13, outline: 'none' }}
            />
            <span style={{ color: MUTED }}>→</span>
            <input type="date" value={customTo.toISOString().slice(0, 10)} max={today}
              onChange={e => setCustomTo(new Date(e.target.value + 'T00:00:00'))}
              style={{ background: SURFACE, border: BDR, borderRadius: 10, padding: '6px 10px', color: TEXT, fontSize: 13, outline: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Tab content */}
      {rId && tab === 'ventas'       && <VentasTab restaurantId={rId} from={from} to={to} />}
      {rId && tab === 'finanzas'     && <FinanzasTab restaurantId={rId} from={from} to={to} period={period} />}
      {rId && tab === 'conciliacion' && <ConciliacionTab restaurantId={rId} from={from} to={to} />}
    </div>
  )
}
