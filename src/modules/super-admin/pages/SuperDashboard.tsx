import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, ClipboardList, CheckCircle, TrendingUp,
  ShoppingBag, Users, Truck, Grid3x3,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PLAN_COLORS, PLAN_LABELS } from '../lib/adminActions'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

interface KPI {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: string
}

type AlertKind = 'trialsExpiring' | 'inactive' | 'oldRequests' | 'incompleteOnboarding'
interface Alert {
  level: 'red' | 'yellow' | 'blue' | 'orange'
  kind: AlertKind
  count: number
  names: string[]
  link: string
}

interface RecentEvent {
  type: 'new_restaurant' | 'approved'
  name: string
  time: string
}

interface Totals {
  totalRest: number; newThisMonth: number; pendingReq: number; activeRest: number; revenue: number
  ordersToday: number; waiters: number; drivers: number; tables: number
}

function buildKpis(n: Totals, td: AdminDict['dashboard'], num: (v: number) => string): KPI[] {
  return [
    { label: td.totalBusinesses, value: String(n.totalRest), sub: td.newThisMonth(n.newThisMonth), icon: <Store className="w-4 h-4" />, color: '#3B82F6' },
    { label: td.pendingRequests, value: String(n.pendingReq), sub: n.pendingReq > 0 ? td.needsReview : td.allClear,
      icon: <ClipboardList className="w-4 h-4" />, color: n.pendingReq > 0 ? ACCENT : '#10B981' },
    { label: td.activeOnline, value: String(n.activeRest), sub: td.rightNow, icon: <CheckCircle className="w-4 h-4" />, color: '#10B981' },
    { label: td.revenueMonth, value: `$${num(n.revenue)}`, sub: td.allBusinesses, icon: <TrendingUp className="w-4 h-4" />, color: '#F59E0B' },
    { label: td.ordersToday, value: String(n.ordersToday), sub: td.inAllBusinesses, icon: <ShoppingBag className="w-4 h-4" />, color: '#8B5CF6' },
    { label: td.activeWaiters, value: String(n.waiters), sub: td.systemTotal, icon: <Users className="w-4 h-4" />, color: '#06B6D4' },
    { label: td.drivers, value: String(n.drivers), sub: td.systemTotal, icon: <Truck className="w-4 h-4" />, color: '#F97316' },
    { label: td.activeTables, value: String(n.tables), sub: td.systemTotal, icon: <Grid3x3 className="w-4 h-4" />, color: '#EC4899' },
  ]
}

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${kpi.color}18` }}>
          <span style={{ color: kpi.color }}>{kpi.icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: TEXT }}>{kpi.value}</p>
      <p className="text-xs font-medium mb-1" style={{ color: TEXT_MUTED }}>{kpi.label}</p>
      {/* Auditoría v2 (#24): con el color del ícono a 11 px no llegaba a 4,5:1; el color queda en el punto */}
      <p className="text-xs flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
        <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: kpi.color }} />
        {kpi.sub}
      </p>
    </div>
  )
}

const ALERT_COLORS = {
  red:    { bg: '#EF444410', border: '#EF444430', text: '#EF4444', dot: '🔴' },
  yellow: { bg: '#F59E0B10', border: '#F59E0B30', text: '#F59E0B', dot: '🟡' },
  blue:   { bg: '#3B82F610', border: '#3B82F630', text: '#3B82F6', dot: '🔵' },
  orange: { bg: '#F9731610', border: '#F9731630', text: '#F97316', dot: '🟠' },
}

export function SuperDashboard() {
  const navigate = useNavigate()
  const t = useAdminT()
  const td = t.dashboard
  const { number, since } = useAdminFormat()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [planDistribution, setPlanDistribution] = useState<{ plan: string; count: number }[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString()
      const ago7d   = new Date(Date.now() - 7  * 24 * 3600 * 1000).toISOString()
      const ago48h  = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

      const [
        { count: totalRest },
        { count: pendingReq },
        { count: activeRest },
        { data: monthOrders },
        { data: todayOrdersData },
        { count: totalWaiters },
        { count: totalDrivers },
        { count: totalTables },
        { data: allRest },
        { data: recentRest },
        { data: recentApproved },
      ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('total').gte('created_at', startOfMonth).neq('status', 'cancelled'),
        supabase.from('orders').select('id').gte('created_at', today).neq('status', 'cancelled'),
        supabase.from('waiters').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('delivery_drivers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('restaurants').select('id, name, plan, subscription_status, trial_ends_at, updated_at, onboarding_completed'),
        supabase.from('restaurants').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('access_requests').select('id, business_name, reviewed_at').eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(5),
      ])

      const revenue = (monthOrders ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0)

      // New registrations this month
      const newThisMonth = (recentRest ?? []).filter(r =>
        new Date(r.created_at) >= new Date(startOfMonth)
      ).length

      setTotals({
        totalRest: totalRest ?? 0, newThisMonth, pendingReq: pendingReq ?? 0, activeRest: activeRest ?? 0, revenue,
        ordersToday: (todayOrdersData ?? []).length, waiters: totalWaiters ?? 0, drivers: totalDrivers ?? 0, tables: totalTables ?? 0,
      })

      // Alerts
      const rests = (allRest ?? []) as {
        id: string; name: string; plan: string; subscription_status: string;
        trial_ends_at: string | null; updated_at: string; onboarding_completed: boolean
      }[]

      const expiringSoon = rests.filter(r =>
        r.subscription_status === 'trial' &&
        r.trial_ends_at &&
        new Date(r.trial_ends_at) > new Date() &&
        new Date(r.trial_ends_at) < new Date(in3Days)
      )

      const noActivity7d = rests.filter(r =>
        r.subscription_status === 'active' &&
        new Date(r.updated_at) < new Date(ago7d)
      )

      const pendingOld = (await supabase
        .from('access_requests')
        .select('id, business_name, created_at')
        .eq('status', 'pending')
        .lte('created_at', ago48h)
      ).data ?? []

      const incompleteOnboarding = rests.filter(r => !r.onboarding_completed && r.subscription_status !== 'cancelled')

      const newAlerts: Alert[] = []
      if (expiringSoon.length)
        newAlerts.push({ level: 'red', kind: 'trialsExpiring', count: expiringSoon.length, names: expiringSoon.map(r => r.name), link: '/super-admin/planes' })
      if (noActivity7d.length)
        newAlerts.push({ level: 'yellow', kind: 'inactive', count: noActivity7d.length, names: noActivity7d.slice(0, 3).map(r => r.name), link: '/super-admin/negocios' })
      if (pendingOld.length)
        newAlerts.push({ level: 'blue', kind: 'oldRequests', count: pendingOld.length, names: (pendingOld as { business_name: string }[]).slice(0, 3).map(r => r.business_name), link: '/super-admin/solicitudes' })
      if (incompleteOnboarding.length)
        newAlerts.push({ level: 'orange', kind: 'incompleteOnboarding', count: incompleteOnboarding.length, names: incompleteOnboarding.slice(0, 3).map(r => r.name), link: '/super-admin/negocios' })

      setAlerts(newAlerts)

      // Recent events
      const events: RecentEvent[] = []
      ;(recentRest ?? []).forEach(r => {
        events.push({ type: 'new_restaurant', name: r.name, time: r.created_at })
      })
      ;(recentApproved ?? []).forEach(r => {
        if (r.reviewed_at) {
          events.push({ type: 'approved', name: (r as { business_name: string }).business_name, time: r.reviewed_at })
        }
      })
      events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentEvents(events.slice(0, 10))

      // Plan distribution
      const planCount = rests.reduce<Record<string, number>>((acc, r) => {
        acc[r.plan] = (acc[r.plan] || 0) + 1
        return acc
      }, {})
      setPlanDistribution(Object.entries(planCount).map(([plan, count]) => ({ plan, count })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const kpis = totals ? buildKpis(totals, td, number) : []
  const maxPlanCount = Math.max(...planDistribution.map(p => p.count), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>{td.title}</h1>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>{td.subtitle}</p>
      </div>

      <OpenErrorsBanner />

      {/* Row 1: KPIs principales */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {kpis.slice(0, 4).map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>
      )}

      {/* Row 2: KPIs operativos */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.slice(4).map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>
      )}

      {/* Row 3: Alertas */}
      <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>{td.alertsTitle}</h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl p-4"
            style={{ backgroundColor: '#10B98110', border: '1px solid #10B98130' }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
            <p className="text-sm" style={{ color: '#10B981' }}>
              {td.noAlerts}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const cfg = ALERT_COLORS[alert.level]
              return (
                <div key={i}
                  className="flex items-start justify-between gap-3 rounded-xl p-3"
                  style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-0.5" style={{ color: cfg.text }}>
                      <span aria-hidden="true">{cfg.dot}</span> {td[alert.kind](alert.count)}
                    </p>
                    <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>
                      {alert.names.join(', ')}
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => navigate(alert.link)}
                    className="flex items-center gap-1 text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: cfg.text, minHeight: 44, minWidth: 44 }}
                  >
                    {td.see} <ChevronRight className="w-3 h-3 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Row 4: Actividad + Distribución */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: TEXT }}>{td.recentActivity}</h2>
            <button type="button" onClick={() => navigate('/super-admin/negocios')}
              className="text-xs" style={{ color: ACCENT, minHeight: 44 }}>
              {td.seeAll}
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>{td.noActivity}</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: TEXT }}>
                    <span aria-hidden="true">{ev.type === 'approved' ? '✅' : '🆕'}</span> {ev.type === 'approved' ? td.approved(ev.name) : td.registered(ev.name)}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: TEXT_MUTED }}>{since(ev.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>{td.planDistribution}</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : planDistribution.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>{td.noData}</p>
          ) : (
            <div className="space-y-4">
              {planDistribution.map(({ plan, count }) => (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium" style={{ color: PLAN_COLORS[plan] ?? TEXT_MUTED }}>
                      {PLAN_LABELS[plan] ?? plan}
                    </span>
                    <span style={{ color: TEXT_MUTED }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / maxPlanCount) * 100}%`,
                        backgroundColor: PLAN_COLORS[plan] ?? TEXT_MUTED,
                      }}
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

/** Aviso con los errores abiertos (registro propio, L5). No aparece si no hay o si la migración no está. */
function OpenErrorsBanner() {
  const navigate = useNavigate()
  const td = useAdminT().dashboard
  const [summary, setSummary] = useState<{ open: number; affected_today: number } | null>(null)
  useEffect(() => {
    void Promise.resolve((supabase as unknown as { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> })
      .rpc('admin_error_summary')).then(({ data, error }) => { if (!error) setSummary(data as { open: number; affected_today: number }) })
  }, [])
  if (!summary || summary.open === 0) return null
  return (
    <button type="button" onClick={() => navigate('/super-admin/errores')}
      className="w-full text-start rounded-2xl mb-6 px-5 py-4"
      style={{ backgroundColor: 'rgba(255,107,122,0.08)', border: '1px solid rgba(255,107,122,0.3)', color: TEXT, cursor: 'pointer' }}>
      <strong>{td.openErrors(summary.open)}</strong>
      <span style={{ color: TEXT_MUTED }}> · {td.affectedToday(summary.affected_today)} · {td.seeErrors}</span>
    </button>
  )
}
