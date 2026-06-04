import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

type Period = '7d' | '30d' | '90d'
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 }
const PERIOD_LABELS: Record<Period, string> = { '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', '90d': 'Últimos 90 días' }

interface DayPoint { date: string; pedidos: number; revenue: number }
interface TopRestaurant { name: string; revenue: number }
interface CityCount { city: string; count: number }

function KPICard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-2xl font-bold mb-0.5" style={{ color: TEXT }}>{value}</p>
      <p className="text-xs font-medium mb-1" style={{ color: TEXT_MUTED }}>{label}</p>
      <p className="text-[11px]" style={{ color: ACCENT }}>{sub}</p>
    </div>
  )
}

const chartTooltipStyle = {
  backgroundColor: '#171A21',
  border: `1px solid ${BORDER}`,
  borderRadius: '10px',
  color: TEXT,
  fontSize: '12px',
}

export function MetricasTab() {
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [activeRestaurants, setActiveRestaurants] = useState(0)
  const [dailyData, setDailyData] = useState<DayPoint[]>([])
  const [topRestaurants, setTopRestaurants] = useState<TopRestaurant[]>([])
  const [cityCounts, setCityCounts] = useState<CityCount[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const days = PERIOD_DAYS[period]
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

        const [
          { data: orders },
          { count: activo },
          { data: restaurants },
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('id, total, created_at, restaurant_id')
            .gte('created_at', since)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: true }),
          supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('restaurants')
            .select('id, name, city'),
        ])

        const ordersArr = orders ?? []
        setTotalOrders(ordersArr.length)
        setTotalRevenue(ordersArr.reduce((s, o) => s + (Number(o.total) || 0), 0))
        setActiveRestaurants(activo ?? 0)

        // Orders per day
        const byDay = new Map<string, DayPoint>()
        for (let i = 0; i < days; i++) {
          const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
          const key = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
          byDay.set(key, { date: key, pedidos: 0, revenue: 0 })
        }
        ordersArr.forEach(o => {
          const key = new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
          const entry = byDay.get(key)
          if (entry) {
            entry.pedidos += 1
            entry.revenue += Number(o.total) || 0
          }
        })
        setDailyData(Array.from(byDay.values()))

        // Top 5 restaurants by revenue
        const revenueByRest = new Map<string, number>()
        ordersArr.forEach(o => {
          revenueByRest.set(o.restaurant_id, (revenueByRest.get(o.restaurant_id) ?? 0) + (Number(o.total) || 0))
        })
        const restMap = new Map((restaurants ?? []).map(r => [r.id, r.name as string]))
        const top5 = Array.from(revenueByRest.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, revenue]) => ({ name: restMap.get(id) ?? id.slice(0, 8), revenue }))
        setTopRestaurants(top5)

        // Restaurants by city
        const cityMap = new Map<string, number>()
        ;(restaurants ?? []).forEach(r => {
          const city = (r.city as string | null) ?? 'Sin ciudad'
          cityMap.set(city, (cityMap.get(city) ?? 0) + 1)
        })
        setCityCounts(
          Array.from(cityMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([city, count]) => ({ city, count }))
        )
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [period])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Métricas globales</h1>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>Todos los negocios en un vistazo</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: period === p ? `${ACCENT}18` : 'transparent',
                color: period === p ? ACCENT : TEXT_MUTED,
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))
        ) : (
          <>
            <KPICard label="Pedidos totales"   value={totalOrders.toLocaleString('es-AR')}  sub={`en ${PERIOD_LABELS[period].toLowerCase()}`} />
            <KPICard label="Revenue total"      value={`$${totalRevenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} sub="todos los negocios" />
            <KPICard label="Negocios activos"   value={String(activeRestaurants)} sub="en este momento" />
          </>
        )}
      </div>

      {/* Orders per day chart */}
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-semibold mb-5" style={{ color: TEXT }}>Pedidos por día</h2>
        {loading ? (
          <div className="h-48 animate-pulse rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
                interval={Math.floor(dailyData.length / 6)} />
              <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="pedidos" name="Pedidos"
                stroke={ACCENT} strokeWidth={2} fill="url(#colorPedidos)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 5 by revenue */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: TEXT }}>Top negocios por revenue</h2>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          ) : topRestaurants.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: TEXT_MUTED }}>Sin datos en este período</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topRestaurants} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
                <XAxis type="number" tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${(v as number / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v) => [`$${Number(v).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`, 'Revenue']} />
                <Bar dataKey="revenue" fill={ACCENT} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Restaurants by city */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: TEXT }}>Negocios por ciudad</h2>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          ) : cityCounts.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: TEXT_MUTED }}>Sin datos</p>
          ) : (
            <div className="space-y-3">
              {cityCounts.map(({ city, count }) => (
                <div key={city}>
                  <div className="flex justify-between text-xs mb-1" style={{ color: TEXT_MUTED }}>
                    <span>{city}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / cityCounts[0].count) * 100}%`, backgroundColor: '#3B82F6' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
