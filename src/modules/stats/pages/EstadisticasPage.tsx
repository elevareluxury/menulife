import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { formatPrice } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'

// ─── Types ──────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'custom'

interface DaySalesRow { day: string; revenue: number; orders: number }
interface TopDish { name: string; units: number }
interface TypeRow { type: string; count: number; revenue: number }

interface StatsData {
  totalRevenue: number
  totalOrders: number
  avgTicket: number
  tablesServed: number
  cancelledOrders: number
  salesByDay: DaySalesRow[]
  salesByDayPrev: DaySalesRow[]
  topItems: TopDish[]
  byOrderType: TypeRow[]
  prevRevenue: number
  prevOrders: number
}

const EMPTY_STATS: StatsData = {
  totalRevenue: 0, totalOrders: 0, avgTicket: 0,
  tablesServed: 0, cancelledOrders: 0,
  salesByDay: [], salesByDayPrev: [], topItems: [],
  byOrderType: [], prevRevenue: 0, prevOrders: 0,
}

const TYPE_COLOR: Record<string, string> = {
  dine_in: '#888888', delivery: '#F4705A', takeaway: '#EF9F27',
}
const TYPE_LABEL: Record<string, string> = {
  dine_in: 'Mesa', delivery: 'Delivery', takeaway: 'Para llevar',
}

// ─── Period helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }

function getPeriodRange(period: Period, customFrom: Date, customTo: Date): { from: Date; to: Date } {
  const now = new Date()
  if (period === 'today')  return { from: startOfDay(now), to: endOfDay(now) }
  if (period === 'week')   return { from: startOfDay(new Date(now.getTime() - 6 * 86400000)), to: endOfDay(now) }
  if (period === 'month')  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
  return { from: startOfDay(customFrom), to: endOfDay(customTo) }
}

function getPrevPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const ms = to.getTime() - from.getTime()
  return { from: new Date(from.getTime() - ms - 1), to: new Date(from.getTime() - 1) }
}

function deltaDisplay(curr: number, prev: number) {
  if (prev === 0) return null
  const pct = Math.round(((curr - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function useStats(restaurantId: string | undefined, from: Date, to: Date) {
  const [data, setData] = useState<StatsData>(EMPTY_STATS)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const prev = getPrevPeriod(from, to)

      const [ordersRes, cancelledRes, prevRes] = await Promise.all([
        db.from('orders')
          .select('id, total, order_type, table_number, created_at, status')
          .eq('restaurant_id', restaurantId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),
        db.from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'cancelled')
          .gte('created_at', from.toISOString())
          .lte('created_at', to.toISOString()),
        db.from('orders')
          .select('id, total')
          .eq('restaurant_id', restaurantId)
          .in('status', ['delivered', 'completed'])
          .gte('created_at', prev.from.toISOString())
          .lte('created_at', prev.to.toISOString()),
      ])

      const orders: Array<{ id: string; total: number; order_type: string; table_number: string | null; created_at: string }> = ordersRes.data ?? []
      const orderIds = orders.map(o => o.id)

      let items: Array<{ menu_item_name: string; quantity: number; order_id: string }> = []
      if (orderIds.length > 0) {
        const { data } = await db.from('order_items')
          .select('menu_item_name, quantity, order_id')
          .in('order_id', orderIds)
        items = data ?? []
      }

      // Sales by day
      const dayMap: Record<string, { revenue: number; orders: number }> = {}
      orders.forEach(o => {
        const d = o.created_at.slice(0, 10)
        if (!dayMap[d]) dayMap[d] = { revenue: 0, orders: 0 }
        dayMap[d].revenue += o.total
        dayMap[d].orders++
      })
      const salesByDay: DaySalesRow[] = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, ...v }))

      // Prev period sales by day (for chart comparison)
      const prevOrders2: Array<{ id: string; total: number; created_at: string }> = prevRes.data ?? []
      const prevDayMap: Record<string, { revenue: number; orders: number }> = {}
      prevOrders2.forEach(o => {
        const d = o.created_at.slice(0, 10)
        if (!prevDayMap[d]) prevDayMap[d] = { revenue: 0, orders: 0 }
        prevDayMap[d].revenue += o.total
        prevDayMap[d].orders++
      })
      const salesByDayPrev: DaySalesRow[] = Object.entries(prevDayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, ...v }))

      // Top items
      const itemMap: Record<string, number> = {}
      items.forEach(i => { itemMap[i.menu_item_name] = (itemMap[i.menu_item_name] ?? 0) + i.quantity })
      const topItems: TopDish[] = Object.entries(itemMap)
        .map(([name, units]) => ({ name, units }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 5)

      // By order type
      const typeMap: Record<string, { count: number; revenue: number }> = {}
      orders.forEach(o => {
        const t = o.order_type ?? 'dine_in'
        if (!typeMap[t]) typeMap[t] = { count: 0, revenue: 0 }
        typeMap[t].count++
        typeMap[t].revenue += o.total
      })
      const byOrderType: TypeRow[] = Object.entries(typeMap).map(([type, v]) => ({ type, ...v }))

      const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
      const totalOrders = orders.length
      const tablesServed = new Set(orders.filter(o => o.table_number).map(o => o.table_number)).size
      const prevRevenue = prevOrders2.reduce((s, o) => s + o.total, 0)

      setData({
        totalRevenue,
        totalOrders,
        avgTicket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        tablesServed,
        cancelledOrders: cancelledRes.count ?? 0,
        salesByDay,
        salesByDayPrev,
        topItems,
        byOrderType,
        prevRevenue,
        prevOrders: prevOrders2.length,
      })
    } catch (err) {
      console.error('useStats error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, from, to])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DeltaBadge({ curr, prev }: { curr: number; prev: number }) {
  const d = deltaDisplay(curr, prev)
  if (!d) return null
  return (
    <span className={`text-xs font-semibold ${d.up ? 'text-emerald-600' : 'text-red-500'}`}>
      {d.up ? '↑' : '↓'} {d.pct}% vs período ant.
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-semibold">{formatPrice(p.value, 'ARS')}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EstadisticasPage() {
  const { restaurant } = useRestaurant()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState(() => startOfDay(new Date(Date.now() - 6 * 86400000)))
  const [customTo, setCustomTo]     = useState(() => startOfDay(new Date()))

  const { from, to } = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  )
  const { data: s, loading } = useStats(restaurant?.id, from, to)

  const maxUnits = s.topItems[0]?.units ?? 1
  const typeTotal = s.byOrderType.reduce((sum, t) => sum + t.count, 0)

  const today = new Date().toISOString().slice(0, 10)

  // Align prev-period chart to same index positions as current
  const chartData = s.salesByDay.map((row, i) => ({
    label: new Date(row.day + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }),
    actual: row.revenue,
    anterior: s.salesByDayPrev[i]?.revenue ?? 0,
  }))

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'week',  label: 'Semana' },
    { id: 'month', label: 'Mes' },
    { id: 'custom', label: 'Personalizado' },
  ]

  return (
    <div className="space-y-6 pb-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-ruda, inherit)' }}>
          <BarChart2 className="w-6 h-6 text-[#F4705A]" strokeWidth={2} />
          Estadísticas
        </h1>
        <p className="text-sm text-ink-3 mt-0.5">{restaurant?.name}</p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customFrom.toISOString().slice(0, 10)}
              max={today}
              onChange={e => setCustomFrom(new Date(e.target.value + 'T00:00:00'))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F4705A]"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={customTo.toISOString().slice(0, 10)}
              max={today}
              onChange={e => setCustomTo(new Date(e.target.value + 'T00:00:00'))}
              className="border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F4705A]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* BLOQUE 1 — Hero de ventas */}
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Ingresos del período</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <p className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-ruda, inherit)' }}>
                  {formatPrice(s.totalRevenue, 'ARS')}
                </p>
                <div className="mt-1.5">
                  <DeltaBadge curr={s.totalRevenue} prev={s.prevRevenue} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: 'Pedidos', value: s.totalOrders.toString() },
                { label: 'Ticket prom.', value: formatPrice(s.avgTicket, 'ARS') },
                {
                  label: 'Mejor día',
                  value: s.salesByDay.length > 0
                    ? new Date(s.salesByDay.reduce((a, b) => a.revenue > b.revenue ? a : b).day + 'T12:00:00')
                        .toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
                    : '—'
                },
              ].map(chip => (
                <div key={chip.label} className="px-3 py-1.5 rounded-xl bg-gray-100 text-sm">
                  <span className="text-gray-500">{chip.label} </span>
                  <span className="font-semibold text-gray-900">{chip.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* BLOQUE 2 — LineChart ventas por día */}
          {chartData.length > 1 && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Ventas por día</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Line
                    type="monotone" dataKey="actual" name="Período actual"
                    stroke="#F4705A" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 4, fill: '#F4705A' }}
                  />
                  {s.salesByDayPrev.length > 0 && (
                    <Line
                      type="monotone" dataKey="anterior" name="Período anterior"
                      stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 3"
                      dot={false} activeDot={{ r: 3, fill: '#9CA3AF' }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* BLOQUE 3 — Grid métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                emoji: '🍽', label: 'Platos vendidos',
                value: s.topItems.reduce((sum, i) => sum + i.units, 0).toString(),
                curr: s.topItems.reduce((sum, i) => sum + i.units, 0),
                prev: 0,
              },
              {
                emoji: '🪑', label: 'Mesas atendidas',
                value: s.tablesServed.toString(),
                curr: s.tablesServed, prev: 0,
              },
              {
                emoji: '❌', label: 'Cancelaciones',
                value: s.cancelledOrders.toString(),
                curr: s.cancelledOrders, prev: 0,
              },
              {
                emoji: '📋', label: 'Pedidos totales',
                value: s.totalOrders.toString(),
                curr: s.totalOrders, prev: s.prevOrders,
              },
            ].map(m => (
              <Card key={m.label} className="p-4">
                <div className="text-xl mb-1">{m.emoji}</div>
                <div className="text-xs text-gray-500 mb-0.5">{m.label}</div>
                <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                {m.prev > 0 && <DeltaBadge curr={m.curr} prev={m.prev} />}
              </Card>
            ))}
          </div>

          {/* BLOQUE 4 — Top platos */}
          {s.topItems.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">🏆 Top platos del período</h3>
                <button
                  onClick={() => navigate('/dashboard/menu')}
                  className="text-sm font-medium"
                  style={{ color: '#F4705A' }}
                >
                  Ver todos →
                </button>
              </div>
              <div className="space-y-3">
                {s.topItems.map((item, i) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-800 font-medium truncate flex-1 mr-2">
                        {i + 1}. {item.name}
                      </span>
                      <span className="text-gray-500 text-xs shrink-0">{item.units} uds</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round((item.units / maxUnits) * 100)}%`,
                          backgroundColor: i === 0 ? '#F4705A' : '#D1D5DB',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* BLOQUE 5 — Donut por tipo de orden */}
          {s.byOrderType.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4">🍽 Desglose por tipo de pedido</h3>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="w-40 h-40 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={s.byOrderType.map(t => ({ name: TYPE_LABEL[t.type] ?? t.type, value: t.count }))}
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={72}
                        dataKey="value" strokeWidth={0}
                      >
                        {s.byOrderType.map(t => (
                          <Cell key={t.type} fill={TYPE_COLOR[t.type] ?? '#888'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} pedidos`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-[140px]">
                  {s.byOrderType.map(t => {
                    const pct = typeTotal > 0 ? Math.round((t.count / typeTotal) * 100) : 0
                    const color = TYPE_COLOR[t.type] ?? '#888'
                    return (
                      <div key={t.type} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-gray-700 flex-1">{TYPE_LABEL[t.type] ?? t.type}</span>
                        <span className="font-semibold text-gray-900">{t.count}</span>
                        <span className="text-gray-400 text-xs w-9 text-right">{pct}%</span>
                      </div>
                    )
                  })}
                  <div className="mt-1 pt-2 border-t border-gray-100 text-sm">
                    <span className="text-gray-500">Ingresos: </span>
                    <span className="font-semibold text-gray-900">{formatPrice(s.totalRevenue, 'ARS')}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {s.totalOrders === 0 && (
            <Card>
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📊</div>
                <p className="font-medium text-gray-600">Sin pedidos completados en este período</p>
                <p className="text-sm text-gray-400 mt-1">Probá con otro rango de fechas</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
