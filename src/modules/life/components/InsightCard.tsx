import { useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarDays, ChevronRight, Flame, ListChecks, PieChart, Target, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { LifeDict } from '@/i18n/app/life'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { formatMoney } from '@/lib/currencies'
import { colors, font, radius } from '../design-system'
import type { Insight } from '../lib/insights'

interface View { title: string; text: string; icon: LucideIcon; color: string; route: string }

const weekdayName = (w: number, locale: string) => new Date(2024, 0, 7 + w).toLocaleDateString(locale, { weekday: 'long' })

/** Texto, ícono y destino de cada insight (los números ya vienen calculados). */
function insightView(i: Insight, t: LifeDict, locale: string): View {
  const it = t.insights.items
  switch (i.kind) {
    case 'tasksOverdue':
      return { ...it.tasksOverdue, text: it.tasksOverdue.text(i.n), icon: AlertCircle, color: colors.semantic.error, route: '/life/brain?vista=tareas' }
    case 'goalStalled':
      return { ...it.goalStalled, text: it.goalStalled.text(i.name, i.days), icon: Target, color: colors.area.goals, route: '/life/goals' }
    case 'habitLow':
      return { ...it.habitLow, text: it.habitLow.text(i.name, i.done, i.scheduled), icon: Flame, color: colors.area.habits, route: '/life/habits' }
    case 'spendChange': {
      const fmt = (n: number) => formatMoney(n, i.currency, locale)
      const up = i.pct > 0
      const item = up ? it.spendUp : it.spendDown
      return { title: item.title, text: item.text(Math.abs(i.pct), fmt(i.now), fmt(i.prev)), icon: up ? TrendingUp : TrendingDown, color: up ? colors.semantic.error : colors.semantic.success, route: '/life/money' }
    }
    case 'habitBestDay':
      return { ...it.habitBestDay, text: it.habitBestDay.text(weekdayName(i.best, locale), i.bestPct, weekdayName(i.worst, locale), i.worstPct), icon: CalendarDays, color: colors.area.habits, route: '/life/habits' }
    case 'spendTop':
      return { ...it.spendTop, text: it.spendTop.text(t.categories[i.category] ?? i.category, i.pct, formatMoney(i.amount, i.currency, locale)), icon: PieChart, color: colors.area.money, route: '/life/money' }
    case 'tasksWeek':
      return { ...it.tasksWeek, text: it.tasksWeek.text(i.now, i.prev), icon: ListChecks, color: colors.area.brain, route: '/life/brain?vista=tareas' }
    case 'habitStrong':
      return { ...it.habitStrong, text: it.habitStrong.text(i.name, i.pct), icon: Flame, color: colors.semantic.success, route: '/life/habits' }
  }
}

export function InsightCard({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const t = useLifeT()
  const navigate = useNavigate()
  const locale = langLocale(useAppLang(s => s.lang))
  const v = insightView(insight, t, locale)
  const Icon = v.icon
  return (
    <button type="button" onClick={() => navigate(v.route)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'start', cursor: 'pointer',
        padding: compact ? '4px 0' : '14px', borderRadius: radius.xl,
        background: compact ? 'transparent' : colors.surface.base,
        border: compact ? 'none' : `1px solid ${colors.border.subtle}`,
      }}>
      <span aria-hidden="true" style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: `${v.color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: v.color }} strokeWidth={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary }}>{v.title}</span>
        <span style={{ display: 'block', fontFamily: font, fontSize: '13px', color: colors.text.secondary, marginTop: 2, lineHeight: 1.5 }}>{v.text}</span>
      </span>
      <ChevronRight size={15} className="flip-rtl" aria-hidden="true" style={{ color: colors.text.tertiary, flexShrink: 0, marginTop: 9 }} />
    </button>
  )
}
