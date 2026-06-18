import { useNavigate } from 'react-router-dom'
import { Flame, Target, Wallet, CheckSquare } from 'lucide-react'
import { LifeCard, LifeSectionHeader, colors, font, radius } from '../../design-system'
import type { LifeData } from '../../hooks/useLifeData'

interface DailySummaryWidgetProps {
  data: Pick<LifeData, 'habitsCompletedToday' | 'habitsTotalToday' | 'activeGoalsCount' | 'monthIncome' | 'monthExpense' | 'pendingTasksCount'>
}

interface SummaryRow {
  icon: typeof Flame
  color: string
  label: string
  value: string
  to: string
}

function formatBalance(n: number): string {
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${Math.round(abs).toLocaleString('es')}`
}

export function DailySummaryWidget({ data }: DailySummaryWidgetProps) {
  const navigate = useNavigate()
  const balance = data.monthIncome - data.monthExpense

  const rows: SummaryRow[] = [
    {
      icon: Flame, color: colors.area.habits,
      label: 'Hábitos hoy',
      value: data.habitsTotalToday > 0
        ? `${data.habitsCompletedToday} / ${data.habitsTotalToday}`
        : 'Sin hábitos',
      to: '/life/habits',
    },
    {
      icon: Target, color: colors.area.goals,
      label: 'Metas activas',
      value: data.activeGoalsCount > 0 ? String(data.activeGoalsCount) : 'Sin metas',
      to: '/life/goals',
    },
    {
      icon: Wallet, color: colors.area.money,
      label: 'Balance del mes',
      value: data.monthIncome > 0 || data.monthExpense > 0 ? formatBalance(balance) : 'Sin datos',
      to: '/life/money',
    },
    {
      icon: CheckSquare, color: colors.accent.default,
      label: 'Tareas pendientes',
      value: data.pendingTasksCount > 0 ? String(data.pendingTasksCount) : '0',
      to: '/life/brain',
    },
  ]

  return (
    <LifeCard>
      <LifeSectionHeader title="Resumen de hoy" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {rows.map(({ icon: Icon, color, label, value, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '9px 10px', borderRadius: radius.sm,
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'background 0.15s', textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '9px', flexShrink: 0,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} style={{ color }} strokeWidth={2} />
            </div>
            <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 500, color: colors.text.secondary, flex: 1 }}>
              {label}
            </span>
            <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>
              {value}
            </span>
          </button>
        ))}
      </div>
    </LifeCard>
  )
}
