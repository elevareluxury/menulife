import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'

export interface SummaryData {
  sales: { amount: number; comparison: number }
  activeOrders: { count: number; new: number }
  activeTables: { current: number; total: number }
  avgTime: { minutes: number }
}

interface StatCardProps {
  icon: string
  label: string
  value: ReactNode
  subtext: ReactNode
  delay?: number
}

function StatCard({ icon, label, value, subtext, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-2xl bg-surface-3 p-4 flex flex-col justify-between cursor-default select-none"
      style={{
        border: '1px solid var(--border-subtle)',
        minHeight: 120,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Línea decorativa superior */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--border-strong) 50%, transparent 100%)',
        }}
      />

      {/* Header de la card */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest leading-none">
          {label}
        </span>
        <span className="text-base leading-none" style={{ opacity: 0.35 }}>
          {icon}
        </span>
      </div>

      {/* Valor principal */}
      <div>
        <div className="text-[1.75rem] font-bold text-ink-1 leading-none text-number tracking-tight">
          {value}
        </div>
        <div className="mt-1.5 text-[11px] leading-snug">{subtext}</div>
      </div>
    </motion.div>
  )
}

export function SummaryCards({ data }: { data: SummaryData }) {
  const { sales, activeOrders, activeTables, avgTime } = data
  const occupancyPct = Math.round((activeTables.current / activeTables.total) * 100)
  const salesUp = sales.comparison >= 0

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Ventas del día */}
        <StatCard
          icon="💰"
          label="Ventas del día"
          delay={0}
          value={<span className="text-ink-1">{formatPrice(sales.amount)}</span>}
          subtext={
            <span className={cn('flex items-center gap-1 font-semibold', salesUp ? 'text-ok' : 'text-danger')}>
              {salesUp
                ? <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
                : <TrendingDown className="w-3 h-3" strokeWidth={2.5} />
              }
              {salesUp ? '+' : ''}{sales.comparison}% vs ayer
            </span>
          }
        />

        {/* Pedidos activos */}
        <StatCard
          icon="🍽️"
          label="Pedidos activos"
          delay={0.06}
          value={<span className="text-ink-1">{activeOrders.count}</span>}
          subtext={
            activeOrders.new > 0 ? (
              <span className="flex items-center gap-1.5 font-semibold text-brand">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-brand inline-block flex-shrink-0"
                  style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
                />
                {activeOrders.new} nuevos
              </span>
            ) : (
              <span className="text-ink-3">Sin nuevos</span>
            )
          }
        />

        {/* Mesas activas */}
        <StatCard
          icon="🪑"
          label="Mesas activas"
          delay={0.12}
          value={
            <span className="text-ink-1">
              {activeTables.current}
              <span className="text-ink-3 text-[1rem] font-semibold">/{activeTables.total}</span>
            </span>
          }
          subtext={
            <div>
              <span className="text-ink-3">{occupancyPct}% ocupación</span>
              <div
                className="mt-1.5 h-[3px] rounded-full overflow-hidden"
                style={{ background: 'var(--border-default)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${occupancyPct}%`,
                    background: occupancyPct > 80
                      ? '#FF6B7A'
                      : occupancyPct > 50
                      ? '#F59E0B'
                      : '#10B981',
                  }}
                />
              </div>
            </div>
          }
        />

        {/* Tiempo promedio */}
        <StatCard
          icon="⏱️"
          label="Tiempo promedio"
          delay={0.18}
          value={<span className="text-ink-1">{avgTime.minutes} min</span>}
          subtext={<span className="text-ink-3">Cocina + atención</span>}
        />
      </div>
    </section>
  )
}
