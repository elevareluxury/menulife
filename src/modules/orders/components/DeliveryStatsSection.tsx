import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { DateRangePicker } from './DateRangePicker'
import { formatPrice } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SOURCE_META: Record<string, { label: string; color: string; emoji: string }> = {
  rappi:     { label: 'Rappi',     color: '#FF6200', emoji: '🟠' },
  pedidosya: { label: 'PedidosYa', color: '#FFD700', emoji: '🟡' },
  whatsapp:  { label: 'WhatsApp',  color: '#25D366', emoji: '🟢' },
  phone:     { label: 'Teléfono',  color: '#3B82F6', emoji: '🔵' },
  own:       { label: 'Propio',    color: '#FF6B7A', emoji: '🔴' },
  other:     { label: 'Otro',      color: '#6B7280', emoji: '⚫' },
  null:      { label: 'Sin fuente', color: '#6B7280', emoji: '⚫' },
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function fmtPrice(n: number) { return formatPrice(n, 'ARS') }

interface DeliveryStatsOrder {
  id: string
  order_type_detail: string
  total: number
  subtotal: number
  delivery_fee: number | null
  delivery_status: string | null
  delivery_driver_id: string | null
  external_source: string | null
  created_at: string
  delivered_at: string | null
  picked_up_at: string | null
}

interface DriverInfo {
  id: string
  first_name: string
  last_name: string
}

interface DeliveryStatsSectionProps {
  restaurantId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px' }}>
      {label && <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{label}</div>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} style={{ color: p.color ?? '#fff', fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtPrice(p.value) : p.value}
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px', padding: '16px',
    }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-syne)' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

export function DeliveryStatsSection({ restaurantId }: DeliveryStatsSectionProps) {
  const now = startOfDay(new Date())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [desde, setDesde] = useState(monthStart)
  const [hasta, setHasta] = useState(now)
  const [orders, setOrders] = useState<DeliveryStatsOrder[]>([])
  const [drivers, setDrivers] = useState<DriverInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const hastaEnd = new Date(hasta)
      hastaEnd.setHours(23, 59, 59, 999)

      const [ordersRes, driversRes] = await Promise.all([
        db.from('orders')
          .select('id, order_type_detail, total, subtotal, delivery_fee, delivery_status, delivery_driver_id, external_source, created_at, delivered_at, picked_up_at')
          .eq('restaurant_id', restaurantId)
          .in('order_type_detail', ['delivery', 'takeaway'])
          .gte('created_at', desde.toISOString())
          .lte('created_at', hastaEnd.toISOString()),
        db.from('delivery_drivers')
          .select('id, first_name, last_name')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true),
      ])

      setOrders(ordersRes.data ?? [])
      setDrivers(driversRes.data ?? [])
    } catch (err) {
      console.error('DeliveryStatsSection fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, desde, hasta])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived stats ──────────────────────────────────────────────
  const deliveryOrders = orders.filter(o => o.order_type_detail === 'delivery')
  const takeawayOrders = orders.filter(o => o.order_type_detail === 'takeaway')
  const deliveredOrders = orders.filter(o => o.delivery_status === 'delivered')
  const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0)
  const deliveryRate = orders.length > 0 ? Math.round((deliveredOrders.length / orders.length) * 100) : 0

  // Avg delivery time (created_at → delivered_at)
  let totalMinutes = 0; let durCount = 0
  deliveredOrders.forEach(o => {
    if (o.delivered_at) {
      const mins = (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000
      if (mins > 0 && mins < 300) { totalMinutes += mins; durCount++ }
    }
  })
  const avgTime = durCount > 0 ? Math.round(totalMinutes / durCount) : 0

  // By source
  const sourceMap: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    const key = o.external_source ?? 'own'
    if (!sourceMap[key]) sourceMap[key] = { count: 0, revenue: 0 }
    sourceMap[key].count += 1
    if (o.delivery_status === 'delivered') sourceMap[key].revenue += o.total
  })
  const sourceData = Object.entries(sourceMap)
    .map(([key, v]) => ({
      name: SOURCE_META[key]?.label ?? key,
      count: v.count,
      revenue: v.revenue,
      color: SOURCE_META[key]?.color ?? '#6B7280',
      emoji: SOURCE_META[key]?.emoji ?? '⚫',
    }))
    .sort((a, b) => b.count - a.count)

  // By hour (for heat map bar chart)
  const hourMap: Record<number, number> = {}
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours()
    hourMap[h] = (hourMap[h] ?? 0) + 1
  })
  const hourData = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] ?? 0 })).filter(h => h.count > 0)
  const peakHour = hourData.reduce((p, h) => h.count > p.count ? h : p, { hour: 0, count: 0 })

  // Driver performance
  const driverStats = drivers.map(d => {
    const dOrders = orders.filter(o => o.delivery_driver_id === d.id)
    const dDelivered = dOrders.filter(o => o.delivery_status === 'delivered')
    return {
      name: `${d.first_name} ${d.last_name}`,
      total: dOrders.length,
      delivered: dDelivered.length,
      revenue: dDelivered.reduce((s, o) => s + o.total, 0),
    }
  }).filter(d => d.total > 0).sort((a, b) => b.delivered - a.delivered)

  // Delivery vs takeaway split for chart
  const splitData = [
    { name: 'Delivery', value: deliveryOrders.length, color: '#F77F00' },
    { name: 'Takeaway', value: takeawayOrders.length, color: '#3B82F6' },
  ].filter(d => d.value > 0)

  // Avg ticket by source
  const avgTicketData = sourceData.map(s => ({
    name: `${s.emoji} ${s.name}`,
    avg: s.count > 0 ? Math.round(s.revenue / s.count) : 0,
    color: s.color,
  })).filter(d => d.avg > 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Date picker */}
      <DateRangePicker
        desde={desde}
        hasta={hasta}
        onChange={(d, h) => { setDesde(d); setHasta(h) }}
      />

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛵</div>
          <p style={{ fontSize: '14px' }}>Sin pedidos de delivery o takeaway en este período</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <KpiCard label="🛵 Pedidos" value={orders.length.toString()} sub={`${deliveryOrders.length} delivery · ${takeawayOrders.length} takeaway`} />
            <KpiCard label="💰 Revenue" value={fmtPrice(totalRevenue)} sub={`${deliveredOrders.length} entregados`} />
            <KpiCard label="⏱️ Tiempo prom." value={avgTime > 0 ? `${avgTime} min` : '—'} sub="creación → entrega" />
            <KpiCard label="✅ Tasa entrega" value={`${deliveryRate}%`} sub={`${deliveredOrders.length} de ${orders.length}`} />
          </div>

          {/* Source split */}
          {sourceData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: splitData.length > 1 ? '1fr 1fr' : '1fr', gap: '16px' }}>
              {/* Pedidos por fuente (bar) */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>Pedidos por fuente</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={sourceData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="Pedidos" radius={[4, 4, 0, 0]}>
                      {sourceData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Delivery vs takeaway pie */}
              {splitData.length > 1 && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>Delivery vs Takeaway</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={splitData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38}>
                        {splitData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                      <Legend
                        formatter={(value) => <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Avg ticket by source */}
          {avgTicketData.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>Ticket promedio por fuente</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={avgTicketData} layout="vertical" margin={{ top: 0, right: 16, left: 20, bottom: 0 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="avg" name="Ticket prom." radius={[0, 4, 4, 0]}>
                    {avgTicketData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hour heat map */}
          {hourData.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Pedidos por hora</h3>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '0 0 14px' }}>
                Hora pico: {peakHour.hour}:00 ({peakHour.count} pedidos)
              </p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={hourData} margin={{ top: 0, right: 10, left: -24, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} tickFormatter={h => `${h}h`} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [`${v} pedidos`, '']} labelFormatter={l => `${l}:00 hs`} contentStyle={{ background: '#1a1d24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {hourData.map(entry => (
                      <Cell key={entry.hour} fill={entry.hour === peakHour.hour ? '#F77F00' : 'rgba(255,255,255,0.15)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Driver ranking */}
          {driverStats.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>🏆 Rendimiento de repartidores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {driverStats.map((d, i) => (
                  <div
                    key={d.name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 0',
                      borderBottom: i < driverStats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: i === 0 ? '#F77F00' : 'rgba(255,255,255,0.35)', minWidth: '20px' }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{d.name}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{d.delivered} entregas</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{fmtPrice(d.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
