import { describe, expect, it } from 'vitest'
import { calculateStreak, doneInWeek, frequencyOf, isDone, isScheduledOn, shiftDate } from '../../src/modules/life/lib/habitStreak'

// Rachas que perdonan (V1 · etapa 10). 2026-10-09 es viernes.
const TODAY = '2026-10-09'
const daily = { type: 'daily' as const, days: [0, 1, 2, 3, 4, 5, 6] }
const back = (...n: number[]) => new Set(n.map(i => shiftDate(TODAY, -i)))

describe('días programados', () => {
  it('cuenta los días seguidos; hoy sin hacer no corta', () => {
    expect(calculateStreak(back(0, 1, 2), daily, TODAY)).toBe(3)
    expect(calculateStreak(back(1, 2, 3), daily, TODAY)).toBe(3)
    expect(calculateStreak(new Set(), daily, TODAY)).toBe(0)
  })

  it('un día perdido no corta la racha ni suma', () => {
    // hecho hoy, ayer no, antes 3 días
    expect(calculateStreak(back(0, 2, 3, 4), daily, TODAY)).toBe(4)
    // perdido ayer y hoy sin hacer todavía
    expect(calculateStreak(back(2, 3), daily, TODAY)).toBe(2)
    // días perdidos sueltos y alternados
    expect(calculateStreak(back(0, 2, 4, 6), daily, TODAY)).toBe(4)
  })

  it('dos días programados seguidos sin cumplir la cortan', () => {
    expect(calculateStreak(back(0, 3, 4, 5), daily, TODAY)).toBe(1)
    expect(calculateStreak(back(3, 4), daily, TODAY)).toBe(0)
  })

  it('los días que no tocan no cuentan como perdidos', () => {
    // Lunes, miércoles y viernes. Hoy viernes; hecho mié 7 y lun 5; mar/jue no tocan
    const mwf = { type: 'weekly' as const, days: [1, 3, 5] }
    expect(calculateStreak(new Set(['2026-10-07', '2026-10-05']), mwf, TODAY)).toBe(2)
    // falta el mié 7 (uno perdido): sigue; faltan mié 7 y lun 5: se corta
    expect(calculateStreak(new Set(['2026-10-09', '2026-10-05', '2026-10-02']), mwf, TODAY)).toBe(3)
    expect(calculateStreak(new Set(['2026-10-09', '2026-10-02']), mwf, TODAY)).toBe(1)
    // dos perdidos programados con días que no tocan en el medio también cortan
    expect(calculateStreak(new Set(['2026-10-02', '2026-09-30']), mwf, TODAY)).toBe(0)
  })

  it('un registro en un día que no toca suma', () => {
    const weekdaysOnly = { type: 'weekly' as const, days: [1, 2, 3, 4, 5] }
    expect(calculateStreak(new Set(['2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']), weekdaysOnly, TODAY)).toBe(6)
  })
})

describe('X veces por semana', () => {
  const three = { type: 'times_per_week' as const, times: 3 }
  // Semanas de lunes a domingo: esta semana = 5 al 11 de octubre
  it('cuenta semanas cumplidas; esta semana sin cumplir todavía no corta', () => {
    const done = new Set(['2026-09-29', '2026-09-30', '2026-10-01', '2026-09-22', '2026-09-24', '2026-09-26'])
    expect(calculateStreak(done, three, TODAY, 1)).toBe(2)
    done.add('2026-10-05'); done.add('2026-10-06'); done.add('2026-10-09')
    expect(calculateStreak(done, three, TODAY, 1)).toBe(3)
  })

  it('una semana sin cumplir no corta; dos seguidas sí', () => {
    // cumplió semana del 21/9 y la del 7/9; la del 14/9 no
    const okWeek = (mon: string) => [0, 1, 2].map(i => shiftDate(mon, i))
    const done = new Set([...okWeek('2026-09-28'), ...okWeek('2026-09-14')])
    expect(calculateStreak(done, three, TODAY, 1)).toBe(2)
    const gap2 = new Set([...okWeek('2026-09-28'), ...okWeek('2026-09-07')])
    expect(calculateStreak(gap2, three, TODAY, 1)).toBe(1)
  })

  it('respeta el inicio de semana (domingo)', () => {
    // Semana dom 4 – sáb 10: tres días cumplidos
    const done = new Set(['2026-10-04', '2026-10-05', '2026-10-06'])
    expect(doneInWeek(done, TODAY, 0)).toBe(3)
    expect(doneInWeek(done, TODAY, 1)).toBe(2)
  })
})

describe('cantidad y frecuencia', () => {
  it('con meta, se cumple al llegar; sin meta, con cualquier registro', () => {
    expect(isDone(undefined, 8)).toBe(false)
    expect(isDone(5, 8)).toBe(false)
    expect(isDone(8, 8)).toBe(true)
    expect(isDone(1, null)).toBe(true)
  })

  it('lee los hábitos de antes y los nuevos', () => {
    expect(frequencyOf({ type: 'daily', days: [] })).toEqual(daily)
    expect(frequencyOf(null)).toEqual(daily)
    expect(frequencyOf({ type: 'weekly', days: [1, 3] })).toEqual({ type: 'weekly', days: [1, 3] })
    expect(frequencyOf({ type: 'times_per_week', times: 3 })).toEqual({ type: 'times_per_week', times: 3 })
    expect(frequencyOf({ type: 'times_per_week', times: 9 })).toEqual(daily)
    expect(isScheduledOn({ type: 'times_per_week', times: 2 }, TODAY)).toBe(true)
    expect(isScheduledOn({ type: 'weekly', days: [1] }, TODAY)).toBe(false)
  })
})
