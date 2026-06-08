import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip,
} from 'recharts'
import { TrendingUp, Package, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface InventorySummary {
  restaurant_id: string
  total_products: number
  low_stock: number
  out_of_stock: number
  inventory_value: number
}

interface ProductRanking {
  restaurant_id: string
  product_id: string
  product_name: string
  units_sold: number
  revenue: number
  cost_total: number
  profit: number
  margin_pct: number
}

interface Props {
  restaurantId: string
}

const MUTED  = 'rgba(255,255,255,0.45)'
const TEXT   = '#F5F7FA'
const CARD   = '#1a1a1a'
const BDR    = '1px solid rgba(255,255,255,0.08)'
const ACCENT = '#F4705A'

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d24', border: BDR, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: TEXT }}>
      <div style={{ color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value.toLocaleString('es-AR')} u.</div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: CARD, border: BDR }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(244,112,90,0.1)' }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: MUTED }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: TEXT }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: MUTED }}>{sub}</p>}
      </div>
    </div>
  )
}

export function ReportesTab({ restaurantId }: Props) {
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [ranking, setRanking] = useState<ProductRanking[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, rankingRes] = await Promise.all([
        db
          .from('view_inventory_summary')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .maybeSingle(),
        db
          .from('view_product_ranking')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('units_sold', { ascending: false })
          .limit(10),
      ])

      if (summaryRes.error) {
        // view might not exist — silently ignore and use fallback
        console.warn('view_inventory_summary not available:', summaryRes.error.message)
      } else {
        setSummary(summaryRes.data)
      }

      if (rankingRes.error) {
        console.warn('view_product_ranking not available:', rankingRes.error.message)
      } else {
        setRanking(rankingRes.data ?? [])
      }
    } catch (err) {
      toast.error('Error al cargar reportes')
      console.error(err)
    }
  }, [restaurantId])

  // Fallback: fetch summary from products table directly
  const fetchSummaryFallback = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('products')
        .select('stock_current, stock_min, price_sale, cost')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
      if (error) throw error

      const products = data ?? []
      const total = products.length
      const low = products.filter((p: { stock_current: number; stock_min: number }) =>
        p.stock_current > 0 && p.stock_current <= p.stock_min
      ).length
      const out = products.filter((p: { stock_current: number }) => p.stock_current === 0).length
      const value = products.reduce(
        (acc: number, p: { stock_current: number; cost: number }) => acc + (p.stock_current * p.cost),
        0
      )

      setSummary({
        restaurant_id: restaurantId,
        total_products: total,
        low_stock: low,
        out_of_stock: out,
        inventory_value: value,
      })
    } catch (err) {
      console.error('Fallback summary error', err)
    }
  }, [restaurantId])

  useEffect(() => {
    setLoading(true)
    fetchData()
      .then(() => {
        // If summary is still null after fetch (view doesn't exist), use fallback
      })
      .finally(() => setLoading(false))
  }, [fetchData])

  // If summary not loaded via view, try fallback
  useEffect(() => {
    if (!loading && summary === null) {
      fetchSummaryFallback()
    }
  }, [loading, summary, fetchSummaryFallback])

  const chartData = ranking.map(r => ({
    name: r.product_name.length > 16 ? r.product_name.slice(0, 14) + '…' : r.product_name,
    fullName: r.product_name,
    units: r.units_sold,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>Resumen de inventario</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Package className="w-6 h-6 text-[#F4705A]" />}
            label="Total productos"
            value={String(summary?.total_products ?? 0)}
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6 text-[#F4705A]" />}
            label="Valor del inventario"
            value={formatPrice(summary?.inventory_value ?? 0, 'ARS')}
            sub="Basado en costo × stock actual"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-amber-400" />}
            label="Stock bajo"
            value={String(summary?.low_stock ?? 0)}
            sub="Productos bajo el mínimo"
          />
          <StatCard
            icon={<Package className="w-6 h-6 text-red-400" />}
            label="Sin stock"
            value={String(summary?.out_of_stock ?? 0)}
            sub="Productos agotados"
          />
        </div>
      </section>

      {/* Top sellers chart */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>Más vendidos (Top 10)</p>
        {ranking.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: CARD, border: BDR }}
          >
            <p style={{ color: MUTED }}>No hay datos de ventas aún</p>
          </div>
        ) : (
          <div className="rounded-xl p-5" style={{ background: CARD, border: BDR }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32 }}>
                <XAxis
                  type="number"
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="units" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? ACCENT : `rgba(244,112,90,${Math.max(0.3, 1 - i * 0.07)})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Rentabilidad table */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: MUTED }}>Rentabilidad por producto</p>
        {ranking.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: CARD, border: BDR }}
          >
            <p style={{ color: MUTED }}>No hay datos de rentabilidad aún</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: BDR }}>
            {/* Header */}
            <div
              className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 px-4 py-3 text-xs font-medium"
              style={{ background: '#131519', color: MUTED, borderBottom: BDR }}
            >
              <span>Producto</span>
              <span className="text-right">Unidades</span>
              <span className="text-right">Ingresos</span>
              <span className="text-right">Costo total</span>
              <span className="text-right">Ganancia</span>
              <span className="text-right">Margen</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {ranking.map(r => (
                <div
                  key={r.product_id}
                  className="px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{ background: CARD }}
                >
                  {/* Mobile */}
                  <div className="md:hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: TEXT }}>{r.product_name}</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: r.margin_pct >= 30 ? '#22c55e' : r.margin_pct >= 10 ? '#f59e0b' : '#ef4444' }}
                      >
                        {r.margin_pct?.toFixed(1) ?? 0}%
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs" style={{ color: MUTED }}>
                      <span>{r.units_sold} u.</span>
                      <span>{formatPrice(r.revenue, 'ARS')}</span>
                      <span className="text-green-400">+{formatPrice(r.profit, 'ARS')}</span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-3 items-center">
                    <span className="text-sm font-medium truncate" style={{ color: TEXT }}>{r.product_name}</span>
                    <span className="text-sm text-right" style={{ color: MUTED }}>{r.units_sold.toLocaleString('es-AR')}</span>
                    <span className="text-sm text-right" style={{ color: TEXT }}>{formatPrice(r.revenue, 'ARS')}</span>
                    <span className="text-sm text-right" style={{ color: MUTED }}>{formatPrice(r.cost_total, 'ARS')}</span>
                    <span className="text-sm text-right font-medium text-green-400">{formatPrice(r.profit, 'ARS')}</span>
                    <span
                      className="text-sm text-right font-semibold"
                      style={{ color: r.margin_pct >= 30 ? '#22c55e' : r.margin_pct >= 10 ? '#f59e0b' : '#ef4444' }}
                    >
                      {r.margin_pct?.toFixed(1) ?? 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
