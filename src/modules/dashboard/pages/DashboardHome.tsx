import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useOrderStats } from '@/modules/dashboard/hooks/useOrderStats'
import { useDashboardStats } from '@/modules/dashboard/hooks/useDashboardStats'
import { formatPrice } from '@/lib/utils'
import { InstallBanner } from '@/components/ui/InstallBanner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveTable {
  id: string
  table_number: string
  is_active: boolean
  status: string
  waiter_called: boolean
  bill_requested: boolean
  has_order: boolean
}

interface AlertItem {
  orderId: string
  tableNumber: string
  minutesWaiting: number
  type: 'waiter_called' | 'bill_requested'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function tableColor(t: LiveTable): string {
  if (!t.is_active || t.status === 'available' || !t.has_order) return '#374151'
  if (t.bill_requested) return '#F4705A'
  if (t.waiter_called)  return '#EF9F27'
  return '#22c55e'
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useLiveTables(restaurantId: string | undefined) {
  const [tables, setTables] = useState<LiveTable[]>([])

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    const [tablesRes, ordersRes] = await Promise.all([
      db.from('tables').select('id, table_number, is_active, status').eq('restaurant_id', restaurantId).order('table_number'),
      db.from('orders').select('table_number, waiter_called, bill_requested').eq('restaurant_id', restaurantId).in('status', ['pending', 'cooking', 'ready']),
    ])

    const activeOrders: Record<string, { waiter_called: boolean; bill_requested: boolean }> = {}
    ;(ordersRes.data ?? []).forEach((o: { table_number: string | null; waiter_called: boolean; bill_requested: boolean }) => {
      if (!o.table_number) return
      activeOrders[o.table_number] = {
        waiter_called:   activeOrders[o.table_number]?.waiter_called  || o.waiter_called,
        bill_requested:  activeOrders[o.table_number]?.bill_requested || o.bill_requested,
      }
    })

    const live: LiveTable[] = (tablesRes.data ?? []).map((t: { id: string; table_number: string; is_active: boolean; status: string }) => ({
      id: t.id,
      table_number: t.table_number,
      is_active: t.is_active,
      status: t.status,
      waiter_called:  activeOrders[t.table_number]?.waiter_called  ?? false,
      bill_requested: activeOrders[t.table_number]?.bill_requested ?? false,
      has_order: !!activeOrders[t.table_number],
    }))

    setTables(live)
  }, [restaurantId])

  useEffect(() => {
    fetch()
    const ch = supabase
      .channel(`live_tables_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables',  filter: `restaurant_id=eq.${restaurantId}` }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders',  filter: `restaurant_id=eq.${restaurantId}` }, fetch)
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [restaurantId, fetch])

  return tables
}

function useAlerts(restaurantId: string | undefined) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    const { data } = await db.from('orders')
      .select('id, table_number, created_at, waiter_called, bill_requested')
      .eq('restaurant_id', restaurantId)
      .in('status', ['pending', 'cooking', 'ready'])
      .or('waiter_called.eq.true,bill_requested.eq.true')

    const now = Date.now()
    const list: AlertItem[] = (data ?? [])
      .filter((o: { table_number: string | null }) => !!o.table_number)
      .map((o: { id: string; table_number: string; created_at: string; waiter_called: boolean; bill_requested: boolean }) => ({
        orderId: o.id,
        tableNumber: o.table_number,
        minutesWaiting: Math.floor((now - new Date(o.created_at).getTime()) / 60000),
        type: o.bill_requested ? 'bill_requested' : 'waiter_called',
      }))
      .sort((a: AlertItem, b: AlertItem) => b.minutesWaiting - a.minutesWaiting)

    setAlerts(list)
  }, [restaurantId])

  useEffect(() => {
    fetch()
    const ch = supabase
      .channel(`alerts_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetch)
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [restaurantId, fetch])

  return alerts
}

function useHourlySalesToday(restaurantId: string | undefined) {
  const [data, setData] = useState<{ hour: number; revenue: number }[]>([])

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data: orders } = await db.from('orders')
      .select('total, created_at')
      .eq('restaurant_id', restaurantId)
      .in('status', ['delivered', 'completed'])
      .gte('created_at', todayStart.toISOString())

    const hourMap: Record<number, number> = {}
    ;(orders ?? []).forEach((o: { total: number; created_at: string }) => {
      const h = new Date(o.created_at).getHours()
      hourMap[h] = (hourMap[h] ?? 0) + o.total
    })

    const now = new Date().getHours()
    const start = Math.max(0, now - 7)
    setData(Array.from({ length: now - start + 1 }, (_, i) => {
      const h = start + i
      return { hour: h, revenue: hourMap[h] ?? 0 }
    }))
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return data
}

// ─── SVG Progress Circle ─────────────────────────────────────────────────────

function ProgressCircle({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#F4705A" strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-xs font-bold fill-gray-900" style={{ fontSize: 13, fontWeight: 700 }}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const DAILY_GOAL = 150000 // ARS — configurable per restaurant in future

export function DashboardHome() {
  const { restaurant } = useRestaurant()
  const { stats } = useOrderStats(restaurant?.id)
  const { stats: dashStats } = useDashboardStats(restaurant?.id)
  const navigate = useNavigate()

  const liveTables  = useLiveTables(restaurant?.id)
  const alerts      = useAlerts(restaurant?.id)
  const hourlyData  = useHourlySalesToday(restaurant?.id)

  const todayRevenue  = stats.today.total
  const activeOrders  = stats.today.pending + stats.today.cooking + stats.today.ready
  const avgTicket     = stats.today.count > 0 ? Math.round(stats.today.total / stats.today.count) : 0
  const goalPct       = DAILY_GOAL > 0 ? (todayRevenue / DAILY_GOAL) * 100 : 0
  const peakHour      = hourlyData.reduce((a, b) => a.revenue > b.revenue ? a : b, { hour: 0, revenue: 0 })
  const activeTbls    = liveTables.filter(t => t.is_active)
  const initial       = (restaurant?.name ?? 'M').charAt(0).toUpperCase()
  const urgentAlert   = alerts[0]

  return (
    <div className="space-y-4 pb-6 max-w-xl mx-auto lg:max-w-none">
      <InstallBanner />

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-gray-400 font-medium">{greeting()}</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{restaurant?.name ?? 'Mi Local'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/notificaciones')}
            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {alerts.length > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: '#F4705A' }}
              >
                {alerts.length}
              </span>
            )}
          </button>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ backgroundColor: '#F4705A' }}
          >
            {initial}
          </div>
        </div>
      </div>

      {/* ── NIVEL 1 — ALERTA ACTIVA ──────────────────────────────── */}
      {urgentAlert && (
        <button
          onClick={() => navigate('/dashboard/tables')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.99]"
          style={{ backgroundColor: '#451a03', border: '1px solid #92400e' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#F4705A' }} />
            <p className="text-sm font-semibold" style={{ color: '#FEF3C7' }}>
              {urgentAlert.type === 'bill_requested' ? '💳' : '🔔'}{' '}
              Mesa {urgentAlert.tableNumber}{' '}
              {urgentAlert.type === 'bill_requested' ? 'pidió la cuenta' : 'sin atención'}{' '}
              — {urgentAlert.minutesWaiting} min
              {alerts.length > 1 && <span style={{ color: '#FCD34D' }}> · y {alerts.length - 1} más</span>}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#F97316' }} />
        </button>
      )}

      {/* ── NIVEL 2 — HERO DE VENTAS ─────────────────────────────── */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--surface-2, #1c1f26)', border: '1px solid var(--border-subtle, #2a2d35)' }}
      >
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ventas de hoy
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Meta {formatPrice(DAILY_GOAL, 'ARS')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-ruda, inherit)' }}>
              {formatPrice(todayRevenue, 'ARS')}
            </p>
            <p className="text-xs mt-1" style={{ color: goalPct >= 100 ? '#22c55e' : 'rgba(255,255,255,0.45)' }}>
              {goalPct >= 100 ? '🎉 Meta alcanzada' : `${Math.round(goalPct)}% de la meta diaria`}
            </p>
          </div>
          <ProgressCircle pct={goalPct} />
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { label: 'Pedidos', value: stats.today.count.toString() },
            { label: 'Ticket prom.', value: avgTicket > 0 ? formatPrice(avgTicket, 'ARS') : '—' },
            {
              label: 'Mejor hora',
              value: hourlyData.length > 0 && peakHour.revenue > 0 ? `${peakHour.hour}:00 hs` : '—',
            },
          ].map(chip => (
            <div
              key={chip.label}
              className="px-2.5 py-1 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>{chip.label} </span>
              <span className="font-semibold text-white">{chip.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NIVEL 3 — MESAS EN VIVO ──────────────────────────────── */}
      {activeTbls.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Mesas en vivo</h2>
            <button
              onClick={() => navigate('/dashboard/tables')}
              className="text-xs font-medium"
              style={{ color: '#F4705A' }}
            >
              Ver todas →
            </button>
          </div>

          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
            {activeTbls.map(t => (
              <button
                key={t.id}
                onClick={() => navigate('/dashboard/tables')}
                className="aspect-square rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: tableColor(t) }}
              >
                {t.table_number}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-2">
            {[
              { color: '#22c55e', label: 'Activa' },
              { color: '#EF9F27', label: 'Sin atención' },
              { color: '#F4705A', label: 'A cobrar' },
              { color: '#374151', label: 'Libre' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NIVEL 4 — MINI CHART ─────────────────────────────────── */}
      {hourlyData.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Ventas por hora — hoy</h2>
            <button
              onClick={() => navigate('/dashboard/estadisticas')}
              className="text-xs font-medium"
              style={{ color: '#F4705A' }}
            >
              Ver stats →
            </button>
          </div>
          <div
            className="rounded-2xl p-3"
            style={{ backgroundColor: 'var(--surface-2, #1c1f26)', border: '1px solid var(--border-subtle, #2a2d35)' }}
          >
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12}>
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {hourlyData.map(entry => (
                    <Cell
                      key={entry.hour}
                      fill={entry.hour === peakHour.hour ? '#F4705A' : 'rgba(255,255,255,0.15)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── NIVEL 5 — ACCESOS RÁPIDOS ────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-2">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              emoji: '🛍',
              title: 'Pedidos',
              data: activeOrders > 0 ? `${activeOrders} activos` : 'Sin pedidos activos',
              to: '/dashboard/orders',
              highlight: activeOrders > 0,
            },
            {
              emoji: '🍽',
              title: 'Menú',
              data: `${dashStats.menuProducts} platos`,
              to: '/dashboard/menu',
              highlight: false,
            },
            {
              emoji: '📊',
              title: 'Estadísticas',
              data: stats.week.count > 0 ? `${stats.week.count} ped. esta semana` : 'Ver reportes',
              to: '/dashboard/estadisticas',
              highlight: false,
            },
            {
              emoji: '📱',
              title: 'Código QR',
              data: dashStats.qrGenerated > 0 ? 'QR activo' : 'Sin QR',
              to: '/dashboard/qr',
              highlight: false,
            },
          ].map(card => (
            <button
              key={card.to}
              onClick={() => navigate(card.to)}
              className="flex items-start justify-between p-4 rounded-2xl text-left transition-all active:scale-[0.98] hover:scale-[1.01]"
              style={{
                backgroundColor: card.highlight ? '#F4705A0F' : 'var(--surface-2, #f9fafb)',
                border: `1px solid ${card.highlight ? '#F4705A30' : 'var(--border-subtle, #e5e7eb)'}`,
              }}
            >
              <div>
                <span className="text-2xl">{card.emoji}</span>
                <p className="font-semibold text-gray-900 mt-1 text-sm">{card.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.data}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
