// Momentos amables de Life OS (V1 · etapa 12): bienvenida al volver, nuevos comienzos y progreso del mes.
import { beforeEach, describe, expect, it } from 'vitest'
import {
  daysBetween, dismissFresh, dismissWelcome, freshDismissed, freshStartOf, isReturning, monthHabitDays, registerVisit,
} from '../../src/modules/life/lib/kindMoments'

describe('daysBetween / isReturning', () => {
  it('cuenta días locales, también entre meses', () => {
    expect(daysBetween('2026-10-01', '2026-10-04')).toBe(3)
    expect(daysBetween('2026-09-29', '2026-10-02')).toBe(3)
  })
  it('da la bienvenida desde 3 días sin entrar (no la primera vez)', () => {
    expect(isReturning(null, '2026-10-09')).toBe(false)
    expect(isReturning('2026-10-07', '2026-10-09')).toBe(false)
    expect(isReturning('2026-10-06', '2026-10-09')).toBe(true)
  })
})

describe('freshStartOf', () => {
  it('el 1 del mes gana; si no, el primer día de la semana de la persona', () => {
    expect(freshStartOf('2026-11-01', 1)).toBe('month')       // domingo 1
    expect(freshStartOf('2026-10-12', 1)).toBe('week')        // lunes
    expect(freshStartOf('2026-10-11', 0)).toBe('week')        // domingo con semana desde el domingo
    expect(freshStartOf('2026-10-11', 1)).toBeNull()
    expect(freshStartOf('2026-10-09', 1)).toBeNull()          // viernes
  })
})

describe('monthHabitDays', () => {
  it('compara con el mismo tramo del mes pasado', () => {
    const dates = ['2026-10-01', '2026-10-03', '2026-10-05', '2026-09-02', '2026-09-20']
    expect(monthHabitDays(dates, '2026-10-09')).toEqual({ days: 3, more: 2 })   // el 20/9 no cuenta
  })
  it('si fue menos que el mes pasado, no compara en contra', () => {
    const dates = ['2026-10-01', '2026-09-01', '2026-09-02', '2026-09-03']
    expect(monthHabitDays(dates, '2026-10-09')).toEqual({ days: 1, more: 0 })
  })
  it('enero mira diciembre del año anterior', () => {
    expect(monthHabitDays(['2027-01-02', '2026-12-31'], '2027-01-05')).toEqual({ days: 1, more: 1 })
  })
})

describe('registerVisit', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => store.clear(), key: () => null, length: 0,
    } as Storage
  })

  it('la primera vez no da la bienvenida', () => {
    expect(registerVisit('u', '2026-10-09')).toBe(false)
  })
  it('después de 3 días sí, todo ese día, hasta que se cierra', () => {
    registerVisit('u', '2026-10-01')
    expect(registerVisit('u', '2026-10-05')).toBe(true)
    expect(registerVisit('u', '2026-10-05')).toBe(true)
    dismissWelcome('u')
    expect(registerVisit('u', '2026-10-05')).toBe(false)
    expect(registerVisit('u', '2026-10-06')).toBe(false)
  })
  it('nuevos comienzos se cierra una vez por fecha', () => {
    expect(freshDismissed('u', '2026-10-12')).toBe(false)
    dismissFresh('u', '2026-10-12')
    expect(freshDismissed('u', '2026-10-12')).toBe(true)
    expect(freshDismissed('u', '2026-10-19')).toBe(false)
  })
})
