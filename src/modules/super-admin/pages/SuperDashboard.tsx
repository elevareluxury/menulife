import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, ClipboardList, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

const PLAN_COLORS: Record<string, string> = {
  menu:  '#F59E0B',
  pro:   '#3B82F6',
  total: '#10B981',
}

interface KPI {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: string
}

function timeSince(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function KPICard({ kpi }: { kpi: KPI }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}18` }}>
          <div style={{ color: kpi.color }}>{kpi.icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: TEXT }}>{kpi.value}</p>
      <p className="text-xs font-medium mb-1" style={{ color: TEXT_MUTED }}>{kpi.label}</p>
      <p className="text-[11px]" style={{ color: kpi.color }}>{kpi.sub}</p>
    </div>
  )
}

export function SuperDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<KPI[]>([])
  const [recentRestaurants, setRecentRestaurants] = useState<{ id: string; name: string; created_at: string; plan: string }[]>([])
  const [planDistribution, setPlanDistribution] = useState<{ plan: string; count: number }[]>([])
  const [trialExpiring, setTrialExpiring] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        const now = new Date().toISOString()

        const [
          { count: total },
          { count: pending },
          { count: active },
          { data: recentRaw },
          { data: allPlans },
          { data: monthOrders },
          { count: trialSoon },
        ] = await Promise.all([
          supabase.from('restaurants').select('*', { count: 'exact', head: true }),
          supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('restaurants').select('id, name, created_at, plan').order('created_at', { ascending: false }).limit(5),
          supabase.from('restaurants').select('plan'),
          supabase.from('orders').select('total').gte('created_at', startOfMonth),
          supabase.from('restaurants').select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'trial')
            .lte('trial_ends_at', threeDaysFromNow)
            .gte('trial_ends_at', now),
        ])

        const revenue = (monthOrders ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0)

        setKpis([
          {
            label: 'Negocios registrados',
            value: String(total ?? 0),
            sub: `${active ?? 0} activos`,
            icon: <Store className="w-4 h-4" />,
            color: '#3B82F6',
          },
          {
            label: 'Solicitudes pendientes',
            value: String(pending ?? 0),
            sub: (pending ?? 0) > 0 ? 'Requieren revisión' : 'Todo al día',
            icon: <ClipboardList className="w-4 h-4" />,
            color: (pending ?? 0) > 0 ? ACCENT : '#10B981',
          },
          {
            label: 'Negocios activos',
            value: String(active ?? 0),
            sub: `${trialSoon ?? 0} trial vence pronto`,
            icon: <CheckCircle className="w-4 h-4" />,
            color: '#10B981',
          },
          {
            label: 'Revenue este mes',
            value: `$${revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
            sub: 'Todos los negocios',
            icon: <TrendingUp className="w-4 h-4" />,
            color: '#F59E0B',
          },
        ])

        setRecentRestaurants(
          ((recentRaw ?? []) as { id: string; name: string; created_at: string; plan: string }[])
        )
        setTrialExpiring(trialSoon ?? 0)

        const planCount = ((allPlans ?? []) as { plan: string }[]).reduce<Record<string, number>>((acc, r) => {
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
    load()
  }, [])

  const maxPlanCount = Math.max(...planDistribution.map(p => p.count), 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Panel de control</h1>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Vista global de MenuLife</p>
      </div>

      {/* KPI grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map(kpi => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: TEXT }}>Actividad reciente</h2>
            <button onClick={() => navigate('/super-admin/negocios')} className="text-xs" style={{ color: ACCENT }}>
              Ver todos →
            </button>
          </div>

          {trialExpiring > 0 && (
            <div className="flex items-center gap-3 rounded-xl p-3 mb-3"
              style={{ backgroundColor: '#F59E0B18', border: '1px solid #F59E0B33' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <p className="text-xs" style={{ color: '#F59E0B' }}>
                {trialExpiring} negocio{trialExpiring > 1 ? 's' : ''} con trial venciendo en 3 días
              </p>
            </div>
          )}

          <div className="space-y-3">
            {recentRestaurants.length === 0 && !loading ? (
              <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>Sin actividad</p>
            ) : (
              recentRestaurants.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        backgroundColor: `${PLAN_COLORS[r.plan] ?? '#888'}22`,
                        color: PLAN_COLORS[r.plan] ?? '#888',
                      }}
                    >
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate" style={{ color: TEXT }}>{r.name}</span>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: TEXT_MUTED }}>{timeSince(r.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Distribución por plan</h2>
          {planDistribution.length === 0 && !loading ? (
            <p className="text-sm py-6 text-center" style={{ color: TEXT_MUTED }}>Sin datos</p>
          ) : (
            <div className="space-y-4">
              {planDistribution.map(({ plan, count }) => (
                <div key={plan}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium capitalize" style={{ color: PLAN_COLORS[plan] ?? TEXT_MUTED }}>{plan}</span>
                    <span style={{ color: TEXT_MUTED }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxPlanCount) * 100}%`, backgroundColor: PLAN_COLORS[plan] ?? TEXT_MUTED }}
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
