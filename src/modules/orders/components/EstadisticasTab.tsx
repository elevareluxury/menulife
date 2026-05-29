import { useState, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer, Cell,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { DateRangePicker } from './DateRangePicker'
import { DeliveryStatsSection } from './DeliveryStatsSection'
import { useOrderAnalytics } from '../hooks/useOrderAnalytics'
import { formatPrice } from '@/lib/utils'

type StatsSubTab = 'general' | 'delivery'

interface EstadisticasTabProps {
  restaurantId: string
  restaurantSlug: string
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function delta(curr: number, prev: number): { pct: number; up: boolean } {
  if (prev === 0) return { pct: 0, up: true }
  const pct = Math.round(((curr - prev) / prev) * 100)
  return { pct: Math.abs(pct), up: pct >= 0 }
}

function KpiCard({ label, value, sub, curr, prev }: {
  label: string; value: string; sub?: string; curr: number; prev: number
}) {
  const d = delta(curr, prev)
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      {prev > 0 && (
        <div className={`text-xs font-medium mt-1 ${d.up ? 'text-emerald-600' : 'text-red-500'}`}>
          {d.up ? '↑' : '↓'} {d.pct}% vs período ant.
        </div>
      )}
    </Card>
  )
}

function ProgressBar({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-800 font-medium truncate flex-1 mr-2">{label}</span>
        <span className="text-gray-500 text-xs shrink-0">{sub}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#FF6B7A] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="text-white font-semibold">{formatPrice(payload[0].value, 'ARS')}</div>
      {payload[1] && <div className="text-gray-400">{payload[1].value} pedidos</div>}
    </div>
  )
}

function exportCSV(restaurantSlug: string, desde: Date, hasta: Date, data: ReturnType<typeof useOrderAnalytics>['analytics']) {
  const rows: string[][] = [
    ['Fecha', 'Total', 'Pedidos'],
    ...data.salesByDay.map(d => [d.date, d.total.toString(), d.count.toString()]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `estadisticas-${restaurantSlug}-${desde.toISOString().slice(0, 10)}-${hasta.toISOString().slice(0, 10)}.csv`
  link.click()
}

export function EstadisticasTab({ restaurantId, restaurantSlug }: EstadisticasTabProps) {
  const now = startOfDay(new Date())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [subTab, setSubTab] = useState<StatsSubTab>('general')
  const [desde, setDesde] = useState(monthStart)
  const [hasta, setHasta] = useState(now)
  const exportRef = useRef(false)

  const { analytics: a, loading } = useOrderAnalytics(restaurantId, desde, hasta)

  const maxItem = a.topItems[0]?.count ?? 1
  const maxTable = a.byTable[0]?.avg ?? 1
  const peakHour = a.byHour.reduce((p, h) => h.count > p.count ? h : p, { hour: 0, count: 0 })

  return (
    <div className="space-y-6">
      {/* Sub-tab toggle */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {([
          { id: 'general' as StatsSubTab, label: '📊 General' },
          { id: 'delivery' as StatsSubTab, label: '🛵 Delivery' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'delivery' ? (
        <DeliveryStatsSection restaurantId={restaurantId} />
      ) : (
        <>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <DateRangePicker
          desde={desde}
          hasta={hasta}
          onChange={(d, h) => { setDesde(d); setHasta(h) }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { exportRef.current = true; exportCSV(restaurantSlug, desde, hasta, a) }}
        >
          Exportar CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : a.current.count === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium text-gray-600">Sin pedidos en este período</p>
            <p className="text-sm text-gray-400 mt-1">Probá con otro rango de fechas</p>
          </div>
        </Card>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="💰 Ventas"
              value={formatPrice(a.current.total, 'ARS')}
              curr={a.current.total}
              prev={a.previous.total}
            />
            <KpiCard
              label="📋 Pedidos"
              value={a.current.count.toString()}
              curr={a.current.count}
              prev={a.previous.count}
            />
            <KpiCard
              label="🎫 Ticket prom."
              value={a.current.count > 0 ? formatPrice(a.current.avgTicket, 'ARS') : '—'}
              curr={a.current.avgTicket}
              prev={a.previous.avgTicket}
            />
            <KpiCard
              label="⏱️ Tiempo prom."
              value={a.current.avgMinutes > 0 ? `${a.current.avgMinutes} min` : '—'}
              curr={0}
              prev={0}
            />
          </div>

          {/* Sales by day chart */}
          {a.salesByDay.length > 1 && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-4">Ventas por día</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={a.salesByDay} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coralGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#FF6B7A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF6B7A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`}
                  />
                  <Tooltip content={<PriceTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#FF6B7A"
                    strokeWidth={2.5}
                    fill="url(#coralGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#FF6B7A' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top items */}
            {a.topItems.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-gray-900 mb-4">🏆 Platos más pedidos</h3>
                <div className="space-y-3">
                  {a.topItems.map((item, i) => (
                    <ProgressBar
                      key={item.name}
                      value={item.count}
                      max={maxItem}
                      label={`${i + 1}. ${item.name}`}
                      sub={`${item.count} · ${item.pct}%`}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* By table */}
            {a.byTable.length > 0 && (
              <Card>
                <h3 className="text-base font-semibold text-gray-900 mb-4">🪑 Ticket prom. por mesa</h3>
                <div className="space-y-3">
                  {a.byTable.slice(0, 6).map(t => (
                    <ProgressBar
                      key={t.table}
                      value={t.avg}
                      max={maxTable}
                      label={`Mesa ${t.table}`}
                      sub={`${formatPrice(t.avg, 'ARS')} · ${t.count} ped.`}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* By hour */}
          {a.byHour.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Pedidos por hora</h3>
              <p className="text-xs text-gray-400 mb-4">
                Hora pico: {peakHour.hour}:00 ({peakHour.count} pedidos)
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={a.byHour} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={h => `${h}h`}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`${v} pedidos`, '']}
                    labelFormatter={l => `${l}:00 hs`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {a.byHour.map(entry => (
                      <Cell
                        key={entry.hour}
                        fill={entry.hour === peakHour.hour ? '#FF6B7A' : '#E5E7EB'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}

        </>
      )}
    </div>
  )
}
