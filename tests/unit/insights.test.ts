import { describe, expect, it } from 'vitest'
import { computeInsights, type InsightData } from '@/modules/life/lib/insights'

// Regla del proyecto: no inventar métricas. Sin datos suficientes, no hay insight.

const base = (over: Partial<InsightData> = {}): InsightData => ({
  today: '2026-10-15', mainCurrency: 'ARS', habits: [], habitLogs: [], expenses: [],
  goals: [], milestones: [], tasksDone: [], overdueTasks: 0, ...over,
})
const expense = (day: string, amount: number, currency = 'ARS', category = 'Comida') =>
  ({ amount, currency, category, occurred_at: `${day}T15:00:00` })

describe('computeInsights', () => {
  it('sin datos no devuelve nada', () => {
    expect(computeInsights(base())).toEqual([])
  })

  it('compara el gasto del mes con el mismo tramo del mes pasado, sólo en la moneda principal', () => {
    const out = computeInsights(base({
      expenses: [
        expense('2026-10-03', 300), expense('2026-10-10', 300),
        expense('2026-09-05', 400),
        expense('2026-09-20', 9999),           // después del día 15 del mes pasado: no cuenta
        expense('2026-10-04', 5000, 'USD'),    // otra moneda: nunca se suma
      ],
    }))
    expect(out.find(i => i.kind === 'spendChange')).toMatchObject({ pct: 50, now: 600, prev: 400, currency: 'ARS' })
  })

  it('no muestra la categoría principal con menos de 3 gastos', () => {
    const out = computeInsights(base({ expenses: [expense('2026-10-03', 300), expense('2026-10-04', 100)] }))
    expect(out.some(i => i.kind === 'spendTop')).toBe(false)
  })

  it('vencidas: sólo desde 3', () => {
    expect(computeInsights(base({ overdueTasks: 2 })).some(i => i.kind === 'tasksOverdue')).toBe(false)
    expect(computeInsights(base({ overdueTasks: 3 }))[0]).toEqual({ kind: 'tasksOverdue', n: 3 })
  })
})

describe('hábitos de "X veces por semana"', () => {
  it('se miden por semana, no como si fueran diarios', () => {
    // Lunes, miércoles y viernes durante el último mes: cumple 3 por semana
    const days: string[] = []
    for (let d = new Date(2026, 8, 16, 12); d <= new Date(2026, 9, 15, 12); d.setDate(d.getDate() + 1)) {
      if ([1, 3, 5].includes(d.getDay())) days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    const out = computeInsights(base({
      habits: [{ id: 'h', name: 'Correr', days: [0, 1, 2, 3, 4, 5, 6], times: 3, created_at: '2026-08-01T12:00:00' }],
      habitLogs: days.map(completed_date => ({ habit_id: 'h', completed_date })),
    }))
    expect(out.some(i => i.kind === 'habitLow')).toBe(false)
    expect(out.find(i => i.kind === 'habitStrong')).toEqual({ kind: 'habitStrong', name: 'Correr', pct: 93 })
    expect(out.some(i => i.kind === 'habitBestDay')).toBe(false)
  })
})
