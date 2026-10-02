import { shiftDate } from '../hooks/useHabits'
import { dayKey } from '../hooks/useToday'

// Insights: patrones calculados sólo con los datos reales del usuario.
// Cada insight exige un mínimo de datos; si no alcanza, no se muestra (nada de promedios ni relleno).

export interface InsightData {
  today: string                 // YYYY-MM-DD local
  mainCurrency: string
  habits: { id: string; name: string; days: number[]; created_at: string }[]
  habitLogs: { habit_id: string; completed_date: string }[]   // últimos 56 días
  expenses: { amount: number; currency: string; category: string; occurred_at: string }[] // desde el 1° del mes anterior
  goals: { id: string; name: string; created_at: string }[]   // en curso
  milestones: { goal_id: string; is_completed: boolean; completed_at: string | null }[]
  tasksDone: { completed_at: string }[]                       // últimos 14 días
  overdueTasks: number
}

export type Insight =
  | { kind: 'tasksOverdue'; n: number }
  | { kind: 'goalStalled'; goalId: string; name: string; days: number }
  | { kind: 'habitLow'; name: string; done: number; scheduled: number }
  | { kind: 'spendChange'; pct: number; now: number; prev: number; currency: string }
  | { kind: 'habitBestDay'; best: number; bestPct: number; worst: number; worstPct: number }
  | { kind: 'spendTop'; category: string; amount: number; pct: number; currency: string }
  | { kind: 'tasksWeek'; now: number; prev: number }
  | { kind: 'habitStrong'; name: string; pct: number }

const weekdayOf = (key: string) => new Date(`${key}T12:00:00`).getDay()
const pct = (a: number, b: number) => Math.round((a / b) * 100)

/** Días (YYYY-MM-DD) entre from y to inclusive. */
function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = shiftDate(d, 1)) out.push(d)
  return out
}

/** Días programados de un hábito en una ventana (desde que existe; hoy sólo cuenta si ya está hecho). */
export function scheduledRows(
  h: { days: number[]; created_at: string }, done: (date: string) => boolean, today: string, windowDays: number,
): { date: string; done: boolean }[] {
  const from = shiftDate(today, -(windowDays - 1))
  const created = dayKey(new Date(h.created_at))
  return daysBetween(created > from ? created : from, today)
    .filter(d => h.days.includes(weekdayOf(d)))
    .map(d => ({ date: d, done: done(d) }))
    .filter(r => r.date !== today || r.done)
}

function scheduledDays(data: InsightData, windowDays: number) {
  const logs = new Set(data.habitLogs.map(l => `${l.habit_id}|${l.completed_date}`))
  return data.habits.map(h => ({ habit: h, rows: scheduledRows(h, d => logs.has(`${h.id}|${d}`), data.today, windowDays) }))
}

export function computeInsights(data: InsightData): Insight[] {
  const out: Insight[] = []
  const { today } = data

  // Tareas vencidas (3 o más)
  if (data.overdueTasks >= 3) out.push({ kind: 'tasksOverdue', n: data.overdueTasks })

  // Metas con pasos pendientes y sin pasos completados en 14 días o más
  for (const g of data.goals) {
    const ms = data.milestones.filter(m => m.goal_id === g.id)
    if (!ms.some(m => !m.is_completed)) continue
    const last = ms.map(m => m.completed_at).filter((x): x is string => !!x).sort().pop() ?? g.created_at
    const days = Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date(`${dayKey(new Date(last))}T12:00:00`).getTime()) / 86_400_000)
    if (days >= 14) out.push({ kind: 'goalStalled', goalId: g.id, name: g.name, days })
  }

  // Hábitos: últimos 30 días (al menos 8 días programados)
  const last30 = scheduledDays(data, 30).filter(x => x.rows.length >= 8)
    .map(x => ({ name: x.habit.name, done: x.rows.filter(r => r.done).length, scheduled: x.rows.length }))
  const low = last30.filter(x => x.done / x.scheduled < 0.5).sort((a, b) => a.done / a.scheduled - b.done / b.scheduled)[0]
  if (low) out.push({ kind: 'habitLow', ...low })

  // Gastos del mes hasta hoy vs. el mismo tramo del mes pasado (moneda principal)
  const [y, m, d] = today.split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const prevFirst = new Date(y, m - 2, 1)
  const prevLastDay = new Date(y, m - 1, 0).getDate()
  const prevStart = dayKey(prevFirst)
  const prevEnd = dayKey(new Date(y, m - 2, Math.min(d, prevLastDay)))
  const main = data.expenses.filter(e => e.currency === data.mainCurrency)
  const inRange = (e: { occurred_at: string }, a: string, b: string) => { const k = dayKey(new Date(e.occurred_at)); return k >= a && k <= b }
  const nowList = main.filter(e => inRange(e, monthStart, today))
  const nowTotal = nowList.reduce((s, e) => s + e.amount, 0)
  const prevTotal = main.filter(e => inRange(e, prevStart, prevEnd)).reduce((s, e) => s + e.amount, 0)
  if (nowTotal > 0 && prevTotal > 0) {
    const change = Math.round(((nowTotal - prevTotal) / prevTotal) * 100)
    if (Math.abs(change) >= 10) out.push({ kind: 'spendChange', pct: change, now: nowTotal, prev: prevTotal, currency: data.mainCurrency })
  }

  // Mejor y peor día de la semana para los hábitos (últimas 8 semanas)
  const byDay = new Map<number, { done: number; total: number }>()
  for (const x of scheduledDays(data, 56)) {
    for (const r of x.rows) {
      const w = weekdayOf(r.date)
      const cur = byDay.get(w) ?? { done: 0, total: 0 }
      cur.total++; if (r.done) cur.done++
      byDay.set(w, cur)
    }
  }
  const days = [...byDay.entries()].filter(([, v]) => v.total >= 4)
  const total = days.reduce((s, [, v]) => s + v.total, 0)
  if (days.length >= 3 && total >= 20) {
    const ranked = days.map(([w, v]) => ({ w, rate: v.done / v.total })).sort((a, b) => b.rate - a.rate)
    const best = ranked[0], worst = ranked[ranked.length - 1]
    if (best.rate - worst.rate >= 0.2) {
      out.push({ kind: 'habitBestDay', best: best.w, bestPct: Math.round(best.rate * 100), worst: worst.w, worstPct: Math.round(worst.rate * 100) })
    }
  }

  // Categoría con más gasto este mes (al menos 3 gastos)
  if (nowList.length >= 3 && nowTotal > 0) {
    const byCat = new Map<string, number>()
    nowList.forEach(e => byCat.set(e.category || 'Otros', (byCat.get(e.category || 'Otros') ?? 0) + e.amount))
    const [category, amount] = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
    out.push({ kind: 'spendTop', category, amount, pct: pct(amount, nowTotal), currency: data.mainCurrency })
  }

  // Tareas completadas: últimos 7 días vs. los 7 anteriores
  const weekAgo = shiftDate(today, -6)
  const twoWeeksAgo = shiftDate(today, -13)
  const doneKeys = data.tasksDone.map(t => dayKey(new Date(t.completed_at)))
  const nowTasks = doneKeys.filter(k => k >= weekAgo && k <= today).length
  const prevTasks = doneKeys.filter(k => k >= twoWeeksAgo && k < weekAgo).length
  if (nowTasks + prevTasks >= 3) out.push({ kind: 'tasksWeek', now: nowTasks, prev: prevTasks })

  // El hábito más constante (90 % o más)
  const strong = last30.filter(x => x.done / x.scheduled >= 0.9).sort((a, b) => b.done / b.scheduled - a.done / a.scheduled)[0]
  if (strong) out.push({ kind: 'habitStrong', name: strong.name, pct: pct(strong.done, strong.scheduled) })

  return out
}
