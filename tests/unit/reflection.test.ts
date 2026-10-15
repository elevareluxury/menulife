import { describe, expect, it } from 'vitest'
import { median, moodSplit, moodSummary, nearestMood, MOOD_MIN_DAYS } from '@/modules/life/lib/mood'
import { computeInsights, type InsightData } from '@/modules/life/lib/insights'
import { isWeekLastDay, nextWeekDate, summarizeWeek, weekHasWins, weekToReview } from '@/modules/life/lib/weeklyReview'
import { shiftDate } from '@/modules/life/lib/habitStreak'

// Ánimo del día y revisión semanal: sin datos suficientes o sin una diferencia clara, no se dice nada.

const TODAY = '2026-10-15'
const days = (n: number, from = TODAY) => Array.from({ length: n }, (_, i) => shiftDate(from, -i))
const base = (over: Partial<InsightData> = {}): InsightData => ({
  today: TODAY, mainCurrency: 'ARS', habits: [], habitLogs: [], expenses: [],
  goals: [], milestones: [], tasksDone: [], overdueTasks: 0, ...over,
})
const habit = { id: 'h1', name: 'Caminar', days: [0, 1, 2, 3, 4, 5, 6], created_at: '2026-08-01T12:00:00' }

describe('moodSummary / nearestMood', () => {
  it('sin días no hay resumen; con días, promedio y cuántas veces cada carita', () => {
    expect(moodSummary([])).toBeNull()
    const s = moodSummary([{ date: 'a', mood: 4 }, { date: 'b', mood: 5 }, { date: 'c', mood: 4 }, { date: 'd', mood: 9 }])
    expect(s).toEqual({ days: 3, avg: 13 / 3, counts: [0, 0, 0, 2, 1] })
    expect(nearestMood(13 / 3)).toBe(4)
    expect(nearestMood(0.2)).toBe(1)
  })
})

describe('moodSplit', () => {
  const split = (n: number, good: number) => days(n).map((d, i) => ({ date: d, mood: i < good ? 5 : 2 }))
  it('pide 14 días con ánimo', () => {
    const list = split(MOOD_MIN_DAYS - 1, 6)
    expect(moodSplit(list, d => list.slice(0, 6).some(x => x.date === d))).toBeNull()
  })
  it('pide 5 días de cada lado', () => {
    const list = split(20, 4)
    expect(moodSplit(list, d => list.slice(0, 4).some(x => x.date === d))).toBeNull()
  })
  it('pide medio punto de diferencia', () => {
    const list = days(20).map((d, i) => ({ date: d, mood: i < 10 ? 4 : (i % 2 ? 4 : 3) })) // 4 contra 3,5 → 0,5
    expect(moodSplit(list, d => list.slice(0, 10).some(x => x.date === d))).not.toBeNull()
    const close = days(20).map((d, i) => ({ date: d, mood: i < 10 ? 4 : (i % 4 ? 4 : 3) }))
    expect(moodSplit(close, d => close.slice(0, 10).some(x => x.date === d))).toBeNull()
  })
  it('mediana', () => {
    expect(median([])).toBe(0)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('insights de ánimo', () => {
  // 20 días con ánimo: los 10 con hábito, 4,5; los otros, 2,5
  const moodDays = days(20)
  const withHabit = moodDays.slice(0, 10)
  const moods = moodDays.map((d, i) => ({ date: d, mood: i < 10 ? (i % 2 ? 5 : 4) : (i % 2 ? 3 : 2) }))

  it('hábitos: sólo con 14 días o más y sólo si el ánimo fue más alto', () => {
    const out = computeInsights(base({ habits: [habit], habitLogs: withHabit.map(d => ({ habit_id: 'h1', completed_date: d })), moods }))
    expect(out.find(i => i.kind === 'moodHabits')).toEqual({ kind: 'moodHabits', withAvg: 4.5, withoutAvg: 2.5, days: 20 })

    const few = computeInsights(base({ habits: [habit], habitLogs: withHabit.map(d => ({ habit_id: 'h1', completed_date: d })), moods: moods.slice(0, 13) }))
    expect(few.some(i => i.kind === 'moodHabits')).toBe(false)

    // Al revés (más bajo los días con hábito): no se muestra
    const lower = computeInsights(base({ habits: [habit], habitLogs: moodDays.slice(10).map(d => ({ habit_id: 'h1', completed_date: d })), moods }))
    expect(lower.some(i => i.kind === 'moodHabits')).toBe(false)
  })

  it('hábitos: sin hábitos no se compara (y los días antes del primero no cuentan)', () => {
    expect(computeInsights(base({ moods })).some(i => i.kind === 'moodHabits')).toBe(false)
    const newHabit = { ...habit, created_at: `${shiftDate(TODAY, -9)}T12:00:00` } // sólo 10 días con ánimo desde que existe
    const out = computeInsights(base({ habits: [newHabit], habitLogs: withHabit.map(d => ({ habit_id: 'h1', completed_date: d })), moods }))
    expect(out.some(i => i.kind === 'moodHabits')).toBe(false)
  })

  it('gastos: los días por encima de la mediana contra el resto, en la moneda principal y en las dos direcciones', () => {
    const spend = (list: string[], currency = 'ARS') => list.map(d => ({ amount: 5000, currency, category: 'Comida', occurred_at: `${d}T15:00:00` }))
    const lower = computeInsights(base({ moods, expenses: spend(moodDays.slice(10)) }))
    expect(lower.find(i => i.kind === 'moodSpend')).toEqual({ kind: 'moodSpend', higher: false, withAvg: 2.5, withoutAvg: 4.5, days: 20 })
    const higher = computeInsights(base({ moods, expenses: spend(withHabit) }))
    expect(higher.find(i => i.kind === 'moodSpend')).toMatchObject({ higher: true })
    // Otra moneda: no cuenta
    expect(computeInsights(base({ moods, expenses: spend(moodDays.slice(10), 'USD') })).some(i => i.kind === 'moodSpend')).toBe(false)
    // Sin ánimo, nada
    expect(computeInsights(base({ expenses: spend(moodDays.slice(10)) })).some(i => i.kind === 'moodSpend')).toBe(false)
  })
})

describe('revisión semanal', () => {
  it('la tarjeta aparece el último día de la semana según week_start', () => {
    expect(isWeekLastDay('2026-10-18', 1)).toBe(true)   // domingo, semana desde el lunes
    expect(isWeekLastDay('2026-10-17', 1)).toBe(false)
    expect(isWeekLastDay('2026-10-17', 0)).toBe(true)   // sábado, semana desde el domingo
  })

  it('"cuando quieras": la semana en curso, salvo en sus dos primeros días (la anterior)', () => {
    expect(weekToReview('2026-10-15', 1)).toBe('2026-10-12')
    expect(weekToReview('2026-10-12', 1)).toBe('2026-10-05')
    expect(weekToReview('2026-10-13', 1)).toBe('2026-10-05')
    expect(weekToReview('2026-10-11', 0)).toBe('2026-10-04')
  })

  it('lo de la semana que viene va al primer día de la siguiente, nunca antes de hoy', () => {
    expect(nextWeekDate('2026-10-12', '2026-10-18')).toBe('2026-10-19')
    expect(nextWeekDate('2026-10-05', '2026-10-15')).toBe('2026-10-15')
  })

  it('resume sólo los días de esa semana', () => {
    const s = summarizeWeek('2026-10-12', {
      tasksCompletedOn: ['2026-10-12', '2026-10-18', '2026-10-19', '2026-10-11'],
      habitDoneOn: ['2026-10-13', '2026-10-13', '2026-10-20'],
      moods: [{ date: '2026-10-14', mood: 4 }, { date: '2026-10-11', mood: 1 }],
    })
    expect(s).toEqual({ tasksDone: 2, habitsDone: 2, mood: { days: 1, avg: 4, counts: [0, 0, 0, 1, 0] } })
    expect(weekHasWins(s)).toBe(true)
    expect(weekHasWins(summarizeWeek('2026-10-12', { tasksCompletedOn: [], habitDoneOn: [], moods: [] }))).toBe(false)
  })
})
