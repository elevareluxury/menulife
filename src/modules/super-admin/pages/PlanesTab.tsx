import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PLAN_COLORS, PLAN_LABELS, PLAN_PRICES, logAdminAction } from '../lib/adminActions'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 3600 * 1000))
}

interface TrialRest { id: string; name: string; trial_ends_at: string }
interface PlanChange {
  id: string
  restaurant_id: string
  old_plan: string
  new_plan: string
  changed_by: string
  reason: string | null
  created_at: string
  restaurant_name?: string
  admin_label?: string
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-2xl font-bold" style={{ color: color ?? TEXT }}>{value}</p>
      <p className="text-xs mt-1 mb-0.5" style={{ color: TEXT_MUTED }}>{label}</p>
      {sub && <p className="text-[11px]" style={{ color: ACCENT }}>{sub}</p>}
    </div>
  )
}

export function PlanesTab() {
  const [loading, setLoading] = useState(true)
  const [trialCount, setTrialCount] = useState(0)
  const [payingCount, setPayingCount] = useState(0)
  const [mrrByPlan, setMrrByPlan] = useState<Record<string, number>>({})
  const [trialsExpiring, setTrialsExpiring] = useState<TrialRest[]>([])
  const [planChanges, setPlanChanges] = useState<PlanChange[]>([])
  const [extending, setExtending] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const in7Days = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

      const [
        { count: trialC },
        { data: allActive },
        { data: expiring },
        { data: changes },
        { data: admins },
        { data: restNames },
      ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
        supabase.from('restaurants').select('plan, subscription_status').eq('is_active', true),
        supabase.from('restaurants')
          .select('id, name, trial_ends_at')
          .eq('subscription_status', 'trial')
          .lte('trial_ends_at', in7Days)
          .order('trial_ends_at', { ascending: true }),
        supabase.from('plan_changes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('super_admins').select('user_id, email'),
        supabase.from('restaurants').select('id, name'),
      ])

      setTrialCount(trialC ?? 0)

      const active = (allActive ?? []) as { plan: string; subscription_status: string }[]
      const paying = active.filter(r => r.subscription_status !== 'trial')
      setPayingCount(paying.length)

      const mrr: Record<string, number> = {}
      paying.forEach(r => { mrr[r.plan] = (mrr[r.plan] ?? 0) + (PLAN_PRICES[r.plan] ?? 0) })
      setMrrByPlan(mrr)

      setTrialsExpiring((expiring ?? []) as TrialRest[])

      const adminMap = Object.fromEntries((admins ?? []).map(a => [a.user_id, a.email as string]))
      const restMap  = Object.fromEntries((restNames ?? []).map(r => [r.id, r.name as string]))

      setPlanChanges(
        ((changes ?? []) as PlanChange[]).map(c => ({
          ...c,
          restaurant_name: restMap[c.restaurant_id] ?? '—',
          admin_label:     adminMap[c.changed_by] ? adminMap[c.changed_by].split('@')[0] : '—',
        }))
      )
    } catch (e) {
      console.error(e)
      toast.error('Error cargando datos de planes')
    } finally {
      setLoading(false)
    }
  }

  const totalMRR = Object.values(mrrByPlan).reduce((s, v) => s + v, 0)

  async function extendTrial(restaurantId: string, name: string, days: number) {
    setExtending(restaurantId)
    try {
      const { data: rest } = await supabase
        .from('restaurants')
        .select('trial_ends_at')
        .eq('id', restaurantId)
        .single()

      const base = rest?.trial_ends_at ? new Date(rest.trial_ends_at) : new Date()
      const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 24 * 3600 * 1000)

      const { error } = await supabase
        .from('restaurants')
        .update({ trial_ends_at: newEnd.toISOString() })
        .eq('id', restaurantId)

      if (error) throw error

      await logAdminAction('extend_trial', 'restaurant', restaurantId, { days, new_end: newEnd.toISOString() })
      toast.success(`✅ Trial extendido ${days} días para ${name}`)

      setTrialsExpiring(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, trial_ends_at: newEnd.toISOString() } : r)
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al extender')
    } finally {
      setExtending(null)
    }
  }

  const PlanBadge = ({ plan }: { plan: string }) => (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: `${PLAN_COLORS[plan] ?? '#888'}20`, color: PLAN_COLORS[plan] ?? '#888' }}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Planes y facturación</h1>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>MRR, trials y cambios de plan</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-24 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
          ))
        ) : (
          <>
            <StatCard label="En trial"       value={trialCount}  sub="negocios activos" color="#F59E0B" />
            <StatCard label="Pagando"        value={payingCount} sub="negocios activos" color="#10B981" />
            <StatCard label="MRR estimado"   value={`$${totalMRR}`} sub="por mes"      color={ACCENT}  />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Trials expiring */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Trials por vencer / vencidos</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : trialsExpiring.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: TEXT_MUTED }}>
              ✅ Sin trials por vencer en los próximos 7 días
            </p>
          ) : (
            <div className="space-y-2">
              {trialsExpiring.map(r => {
                const days = daysUntil(r.trial_ends_at)
                const expired = days < 0
                const soon = days >= 0 && days <= 3
                return (
                  <div key={r.id}
                    className="flex items-center justify-between gap-3 rounded-xl p-3"
                    style={{
                      backgroundColor: expired ? '#EF444408' : soon ? '#F59E0B08' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${expired ? '#EF444430' : soon ? '#F59E0B30' : BORDER}`,
                    }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: TEXT }}>{r.name}</p>
                      <p className="text-xs" style={{ color: expired ? '#EF4444' : soon ? '#F59E0B' : TEXT_MUTED }}>
                        {expired
                          ? `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                          : days === 0 ? 'Vence hoy'
                          : `Vence en ${days} día${days !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {(['7', '14'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => extendTrial(r.id, r.name, Number(d))}
                          disabled={extending === r.id}
                          className="px-2 py-1 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                          style={{
                            backgroundColor: d === '7' ? '#3B82F618' : '#10B98118',
                            color: d === '7' ? '#3B82F6' : '#10B981',
                            border: `1px solid ${d === '7' ? '#3B82F633' : '#10B98133'}`,
                          }}
                        >
                          +{d}d
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MRR breakdown */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>MRR por plan</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : Object.keys(mrrByPlan).length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: TEXT_MUTED }}>
              Sin negocios pagando aún
            </p>
          ) : (
            <div className="space-y-3">
              {(['menu', 'pro', 'total'] as const).map(plan => {
                const mrr = mrrByPlan[plan] ?? 0
                if (!mrr) return null
                const count = Math.round(mrr / PLAN_PRICES[plan])
                return (
                  <div key={plan}
                    className="flex items-center justify-between rounded-xl p-3"
                    style={{ backgroundColor: `${PLAN_COLORS[plan]}10`, border: `1px solid ${PLAN_COLORS[plan]}25` }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: PLAN_COLORS[plan] }}>{PLAN_LABELS[plan]}</p>
                      <p className="text-xs" style={{ color: TEXT_MUTED }}>
                        {count} negocio{count !== 1 ? 's' : ''} × ${PLAN_PRICES[plan]}/mes
                      </p>
                    </div>
                    <p className="text-base font-bold" style={{ color: TEXT }}>${mrr}</p>
                  </div>
                )
              })}
              <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                <span className="text-sm font-semibold" style={{ color: TEXT }}>Total MRR</span>
                <span className="text-lg font-bold" style={{ color: ACCENT }}>${totalMRR}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan changes history */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Historial de cambios de plan</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 rounded-xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : planChanges.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: TEXT_MUTED }}>
            Sin cambios de plan registrados aún
          </p>
        ) : (
          <div className="space-y-1">
            {planChanges.map(c => (
              <div key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 px-1"
                style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate" style={{ color: TEXT }}>
                    {c.restaurant_name}
                  </span>
                  <PlanBadge plan={c.old_plan} />
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>→</span>
                  <PlanBadge plan={c.new_plan} />
                </div>
                <div className="text-right flex-shrink-0">
                  {c.admin_label && (
                    <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                      por {c.admin_label}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                    {new Date(c.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
