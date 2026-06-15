import { useEffect } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Users, CreditCard,
  AlertCircle, CheckCircle2, Target, BarChart2, Lock,
} from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useAnalytics } from '../hooks/useAnalytics'
import { useTerminology } from '../hooks/useTerminology'
import type { ComparisonPeriod, KPIResult, TrendDirection } from '../analytics/analyticsTypes'
import { PERIOD_LABELS, formatAnalyticsValue } from '../analytics/analyticsTypes'

const PERIODS: ComparisonPeriod[] = ['today', 'week', 'month', 'year']

// ─── Trend badge ─────────────────────────────────────────────────────────────
function TrendBadge({ dir, pct }: { dir: TrendDirection; pct: number | null }) {
  if (dir === 'neutral' || pct === null) return (
    <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
      <Minus className="w-3 h-3" />—
    </span>
  )
  const up  = dir === 'up'
  return (
    <span
      className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: up ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: up ? '#22C55E' : '#EF4444' }}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct)}%
    </span>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KPICard({
  label, kpi, icon, color, sub,
}: {
  label: string
  kpi:   KPIResult
  icon:  React.ReactNode
  color: string
  sub?:  string
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div style={{ color }}>{icon}</div>
        <TrendBadge dir={kpi.trend_direction} pct={kpi.growth_pct} />
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-none">{kpi.formatted}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </p>
    </div>
  )
}

// ─── Metric row ───────────────────────────────────────────────────────────────
function MetricRow({ label, value, color, bar, total }: {
  label: string; value: number | string; color: string; bar?: number; total?: number
}) {
  const pct = bar !== undefined && total ? Math.min(100, Math.round((bar / total) * 100)) : bar
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span className="text-xs font-bold text-white">{value}</span>
      </div>
      {pct !== undefined && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
    </div>
  )
}

export function ServicesReportesPage() {
  const { restaurant }  = useRestaurant()
  const analytics       = useAnalytics(restaurant?.id)
  const { term }        = useTerminology()

  useEffect(() => {
    if (restaurant?.id) analytics.load('week')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const { health, performance, loading, period } = analytics

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white mb-1">Análisis</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Entendé tu negocio en tiempo real
        </p>
      </div>

      {/* Period selector */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => analytics.setPeriod(p)}
            className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: period === p ? '#F4705A' : 'transparent',
              color:      period === p ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── SALUD DEL NEGOCIO ─────────────────────────────────────────────── */}
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Salud del negocio
        </p>
        {loading ? (
          <div className="flex justify-center py-10">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : health ? (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <KPICard
              label="Ingresos"
              kpi={health.revenue_today}
              icon={<TrendingUp className="w-4 h-4" />}
              color="#22C55E"
              sub={`${health.sales_today.value} ventas`}
            />
            <KPICard
              label={`${term('customers')} Nuevos`}
              kpi={health.new_customers}
              icon={<Users className="w-4 h-4" />}
              color="#3B82F6"
            />
            <div
              className="col-span-2 rounded-2xl p-4"
              style={{
                background: health.pending_sales.value > 0
                  ? 'rgba(245,158,11,0.06)'
                  : '#13161C',
                border: health.pending_sales.value > 0
                  ? '1px solid rgba(245,158,11,0.15)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle
                    className="w-4 h-4"
                    style={{ color: health.pending_sales.value > 0 ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}
                  />
                  <span className="text-sm font-bold text-white">
                    {health.pending_sales.value > 0
                      ? `${health.pending_sales.value} cobros pendientes`
                      : 'Sin cobros pendientes'}
                  </span>
                </div>
                {health.pending_amount.value > 0 && (
                  <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                    {health.pending_amount.formatted}
                  </span>
                )}
              </div>
              {health.pending_sales.value === 0 && (
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Todos los cobros están al día
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── PERFORMANCE ───────────────────────────────────────────────────── */}
      {!loading && performance && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Performance
          </p>

          {/* Show Rate + Conversion */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div
              className="rounded-2xl p-4"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: '#22C55E' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Show Rate
                </span>
              </div>
              <p className="text-3xl font-black text-white leading-none mb-1">
                {performance.show_rate}<span className="text-base font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>%</span>
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {performance.show_rate >= 80 ? 'Excelente' : performance.show_rate >= 60 ? 'Aceptable' : 'A mejorar'}
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Conv. Presup.
                </span>
              </div>
              <p className="text-3xl font-black text-white leading-none mb-1">
                {performance.quote_conversion}<span className="text-base font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>%</span>
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {performance.quote_conversion >= 50 ? 'Muy buena' : performance.quote_conversion >= 25 ? 'Normal' : 'Oportunidad'}
              </p>
            </div>
          </div>

          {/* Recurring customers */}
          {performance.recurring_customers > 0 && (
            <div
              className="rounded-2xl p-4 mb-3 flex items-center justify-between"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: '#F4705A' }} />
                <span className="text-sm text-white">Clientes recurrentes</span>
              </div>
              <span className="text-lg font-bold text-white">{formatAnalyticsValue(performance.recurring_customers, 'number')}</span>
            </div>
          )}

          {/* Top servicios vendidos */}
          {performance.top_services.length > 0 && (
            <div
              className="rounded-2xl p-4 mb-3"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" style={{ color: '#F4705A' }} />
                <span className="text-sm font-bold text-white">Servicios más vendidos</span>
              </div>
              <div className="space-y-3">
                {performance.top_services.map((item, i) => (
                  <MetricRow
                    key={item.name}
                    label={item.name}
                    value={`${item.count}x`}
                    color={i === 0 ? '#F4705A' : i === 1 ? '#F59E0B' : '#3B82F6'}
                    bar={item.count}
                    total={performance.top_services[0]?.count || 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top reservas por servicio */}
          {performance.top_catalog.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4" style={{ color: '#3B82F6' }} />
                <span className="text-sm font-bold text-white">Servicios con más reservas</span>
              </div>
              <div className="space-y-3">
                {performance.top_catalog.map((item, i) => (
                  <MetricRow
                    key={item.name}
                    label={item.name}
                    value={`${item.count} reservas`}
                    color={i === 0 ? '#3B82F6' : i === 1 ? '#8B5CF6' : '#22C55E'}
                    bar={item.count}
                    total={performance.top_catalog[0]?.count || 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state for performance */}
          {performance.top_services.length === 0 && performance.top_catalog.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <BarChart2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Sin actividad en este período
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS AVANZADO (oculto — plan Pro) ────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Analytics avanzado
        </p>
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Blurred content preview */}
          <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
            <div className="space-y-3">
              {[
                'Revenue Trends',
                'Retención de clientes (30/60/90d)',
                'Funnel de cotizaciones',
                'Consumo de membresías',
                'Ocupación de recursos',
              ].map(label => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-white">{label}</span>
                  <div className="h-2 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(244,112,90,0.12)', border: '1px solid rgba(244,112,90,0.2)' }}
            >
              <Lock className="w-5 h-5" style={{ color: '#F4705A' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white mb-0.5">Analytics avanzado</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Disponible en plan Pro
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
