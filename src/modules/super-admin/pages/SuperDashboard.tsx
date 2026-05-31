import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Store, ClipboardList, CheckCircle, TrendingUp,
  ShoppingBag, Users, Truck, Grid3x3,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PLAN_COLORS, PLAN_LABELS, timeSince } from '../lib/adminActions'

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

interface Alert {
  level: 'red' | 'yellow' | 'blue' | 'orange'
  text: string
  names: string[]
  link: string
}

interface RecentEvent {
  type: 'new_restaurant' | 'approved' | 'plan_change'
  label: string
  time: string
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
      <p className="text-[11px]" style={{ color: kpi.color }}>{kpi.sub}</p>
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
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPI[]>([])
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
        supabase.from('orders').select('total').gte('created_at', startOfMonth),
        supabase.from('orders').select('id').gte('created_at', today),
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

      setKpis([
        {
          label: 'Total negocios',
          value: String(totalRest ?? 0),
          sub: `+${newThisMonth} este mes`,
          icon: <Store className="w-4 h-4" />,
          color: '#3B82F6',
        },
        {
          label: 'Solicitudes pendientes',
          value: String(pendingReq ?? 0),
          sub: (pendingReq ?? 0) > 0 ? 'Requieren revisión' : 'Todo al día',
          icon: <ClipboardList className="w-4 h-4" />,
          color: (pendingReq ?? 0) > 0 ? ACCENT : '#10B981',
        },
        {
          label: 'Activos online',
          value: String(activeRest ?? 0),
          sub: 'en este momento',
          icon: <CheckCircle className="w-4 h-4" />,
          color: '#10B981',
        },
        {
          label: 'Revenue este mes',
          value: `$${revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
          sub: 'todos los negocios',
          icon: <TrendingUp className="w-4 h-4" />,
          color: '#F59E0B',
        },
        {
          label: 'Pedidos hoy',
          value: String((todayOrdersData ?? []).length),
          sub: 'en todos los negocios',
          icon: <ShoppingBag className="w-4 h-4" />,
          color: '#8B5CF6',
        },
        {
          label: 'Mozos activos',
          value: String(totalWaiters ?? 0),
          sub: 'total sistema',
          icon: <Users className="w-4 h-4" />,
          color: '#06B6D4',
        },
        {
          label: 'Repartidores',
          value: String(totalDrivers ?? 0),
          sub: 'total sistema',
          icon: <Truck className="w-4 h-4" />,
          color: '#F97316',
        },
        {
          label: 'Mesas activas',
          value: String(totalTables ?? 0),
          sub: 'total sistema',
          icon: <Grid3x3 className="w-4 h-4" />,
          color: '#EC4899',
        },
      ])

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
        newAlerts.push({ level: 'red', text: `${expiringSoon.length} trial${expiringSoon.length > 1 ? 's' : ''} vence${expiringSoon.length === 1 ? '' : 'n'} en los próximos 3 días`, names: expiringSoon.map(r => r.name), link: '/super-admin/planes' })
      if (noActivity7d.length)
        newAlerts.push({ level: 'yellow', text: `${noActivity7d.length} negocio${noActivity7d.length > 1 ? 's' : ''} sin actividad en 7+ días`, names: noActivity7d.slice(0, 3).map(r => r.name), link: '/super-admin/negocios' })
      if (pendingOld.length)
        newAlerts.push({ level: 'blue', text: `${pendingOld.length} solicitud${pendingOld.length > 1 ? 'es' : ''} pendiente${pendingOld.length > 1 ? 's' : ''} hace +48 horas`, names: (pendingOld as { business_name: string }[]).slice(0, 3).map(r => r.business_name), link: '/super-admin/solicitudes' })
      if (incompleteOnboarding.length)
        newAlerts.push({ level: 'orange', text: `${incompleteOnboarding.length} negocio${incompleteOnboarding.length > 1 ? 's' : ''} sin completar onboarding`, names: incompleteOnboarding.slice(0, 3).map(r => r.name), link: '/super-admin/negocios' })

      setAlerts(newAlerts)

      // Recent events
      const events: RecentEvent[] = []
      ;(recentRest ?? []).forEach(r => {
        events.push({ type: 'new_restaurant', label: `🆕 ${r.name} se registró`, time: r.created_at })
      })
      ;(recentApproved ?? []).forEach(r => {
        if (r.reviewed_at) {
          events.push({ type: 'approved', label: `✅ ${(r as { business_name: string }).business_name} aprobado`, time: r.reviewed_at })
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

  const maxPlanCount = Math.max(...planDistribution.map(p => p.count), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Panel de control</h1>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Vista global de MenuLife</p>
      </div>

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
        <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>⚠️ Alertas que requieren atención</h2>
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
              Todo en orden. No hay alertas pendientes.
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
                      {cfg.dot} {alert.text}
                    </p>
                    <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>
                      {alert.names.join(', ')}{alert.names.length < alert.names.length ? '' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(alert.link)}
                    className="flex items-center gap-1 text-xs font-medium flex-shrink-0 transition-opacity hover:opacity-70"
                    style={{ color: cfg.text }}
                  >
                    Ver <ChevronRight className="w-3 h-3" />
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
            <h2 className="text-sm font-semibold" style={{ color: TEXT }}>Actividad reciente</h2>
            <button onClick={() => navigate('/super-admin/negocios')}
              className="text-xs" style={{ color: ACCENT }}>
              Ver todos →
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
            <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>Sin actividad reciente</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: TEXT }}>{ev.label}</span>
                  <span className="text-xs flex-shrink-0" style={{ color: TEXT_MUTED }}>{timeSince(ev.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan distribution */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Distribución por plan</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : planDistribution.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>Sin datos</p>
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
