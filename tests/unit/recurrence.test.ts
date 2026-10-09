import { describe, expect, it } from 'vitest'
import { isValidRecurrence, nextOccurrence, upcomingOccurrences } from '../../src/modules/life/lib/recurrence'

// Tareas que se repiten (V1 · etapa 09): fechas locales, fin de mes y años bisiestos.
describe('nextOccurrence', () => {
  it('diario y cada N días', () => {
    expect(nextOccurrence('2026-10-09', { freq: 'daily' })).toBe('2026-10-10')
    expect(nextOccurrence('2026-12-31', { freq: 'daily' })).toBe('2027-01-01')
    expect(nextOccurrence('2026-10-09', { freq: 'interval', interval: 3 })).toBe('2026-10-12')
    expect(nextOccurrence('2026-02-27', { freq: 'interval', interval: 2 })).toBe('2026-03-01')
  })

  it('ciertos días de la semana (2026-10-09 es viernes)', () => {
    const weekdays = { freq: 'weekly' as const, weekdays: [1, 2, 3, 4, 5] }
    expect(nextOccurrence('2026-10-09', weekdays)).toBe('2026-10-12') // viernes → lunes
    expect(nextOccurrence('2026-10-12', weekdays)).toBe('2026-10-13')
    expect(nextOccurrence('2026-10-09', { freq: 'weekly', weekdays: [5] })).toBe('2026-10-16')
    expect(nextOccurrence('2026-10-07', { freq: 'weekly', weekdays: [1, 5] })).toBe('2026-10-09')
    // Cada 2 semanas, lunes y jueves: el jueves de la misma semana, después salta una semana
    expect(nextOccurrence('2026-10-05', { freq: 'weekly', interval: 2, weekdays: [1, 4] })).toBe('2026-10-08')
    expect(nextOccurrence('2026-10-08', { freq: 'weekly', interval: 2, weekdays: [1, 4] })).toBe('2026-10-19')
  })

  it('mensual: si el día no existe en el mes, el último', () => {
    expect(nextOccurrence('2026-10-15', { freq: 'monthly', monthday: 15 })).toBe('2026-11-15')
    expect(nextOccurrence('2026-01-31', { freq: 'monthly', monthday: 31 })).toBe('2026-02-28')
    expect(nextOccurrence('2028-01-31', { freq: 'monthly', monthday: 31 })).toBe('2028-02-29') // bisiesto
    expect(nextOccurrence('2026-02-28', { freq: 'monthly', monthday: 31 })).toBe('2026-03-31')
    expect(nextOccurrence('2026-12-10', { freq: 'monthly', monthday: 10 })).toBe('2027-01-10')
    expect(nextOccurrence('2026-08-31', { freq: 'monthly', monthday: 31 })).toBe('2026-09-30')
  })

  it('cada día 29 de febrero en años bisiestos y no bisiestos (mensual 29)', () => {
    expect(nextOccurrence('2027-01-29', { freq: 'monthly', monthday: 29 })).toBe('2027-02-28')
    expect(nextOccurrence('2024-01-29', { freq: 'monthly', monthday: 29 })).toBe('2024-02-29')
    expect(nextOccurrence('2100-01-29', { freq: 'monthly', monthday: 29 })).toBe('2100-02-28') // 2100 no es bisiesto
  })

  it('completada atrasada: salta las fechas que ya pasaron', () => {
    expect(nextOccurrence('2026-10-01', { freq: 'daily' }, '2026-10-09')).toBe('2026-10-09')
    expect(nextOccurrence('2026-09-01', { freq: 'weekly', weekdays: [2] }, '2026-10-09')).toBe('2026-10-13')
    expect(nextOccurrence('2026-10-09', { freq: 'daily' }, '2026-10-09')).toBe('2026-10-10')
  })

  it('próximas ocurrencias para el calendario', () => {
    expect(upcomingOccurrences('2026-10-09', { freq: 'weekly', weekdays: [5] }, '2026-10-31'))
      .toEqual(['2026-10-16', '2026-10-23', '2026-10-30'])
  })
})

describe('isValidRecurrence', () => {
  it('acepta las formas válidas y rechaza el resto', () => {
    expect(isValidRecurrence({ freq: 'daily' })).toBe(true)
    expect(isValidRecurrence({ freq: 'weekly', weekdays: [1, 3] })).toBe(true)
    expect(isValidRecurrence({ freq: 'monthly', monthday: 31 })).toBe(true)
    expect(isValidRecurrence({ freq: 'interval', interval: 10 })).toBe(true)
    expect(isValidRecurrence({ freq: 'weekly', weekdays: [] })).toBe(false)
    expect(isValidRecurrence({ freq: 'weekly', weekdays: [7] })).toBe(false)
    expect(isValidRecurrence({ freq: 'monthly', monthday: 32 })).toBe(false)
    expect(isValidRecurrence({ freq: 'interval', interval: 0 })).toBe(false)
    expect(isValidRecurrence({ freq: 'yearly' })).toBe(false)
    expect(isValidRecurrence(null)).toBe(false)
  })
})

describe('selector de repetición', () => {
  // 2026-10-09 es viernes
  it('cada opción guarda la repetición esperada y se reconoce al volver a abrir', async () => {
    const { recurrenceFor, repeatChoiceOf, customOf } = await import('../../src/modules/life/lib/recurrence')
    const custom = { every: 3, unit: 'days' as const, weekdays: [] }
    expect(recurrenceFor('weekly', '2026-10-09', custom)).toEqual({ freq: 'weekly', weekdays: [5] })
    expect(recurrenceFor('monthly', '2026-10-09', custom)).toEqual({ freq: 'monthly', monthday: 9 })
    expect(recurrenceFor('custom', '2026-10-09', custom)).toEqual({ freq: 'interval', interval: 3 })
    expect(recurrenceFor('custom', '2026-10-09', { every: 2, unit: 'weeks', weekdays: [4, 1] })).toEqual({ freq: 'weekly', interval: 2, weekdays: [1, 4] })
    for (const c of ['none', 'daily', 'weekdays', 'weekly', 'monthly'] as const) {
      expect(repeatChoiceOf(recurrenceFor(c, '2026-10-09', custom), '2026-10-09')).toBe(c)
    }
    expect(repeatChoiceOf({ freq: 'interval', interval: 3 }, '2026-10-09')).toBe('custom')
    // Si cambia la fecha, la semanal de otro día pasa a "Personalizado" (no se pierde)
    expect(repeatChoiceOf({ freq: 'weekly', weekdays: [1] }, '2026-10-09')).toBe('custom')
    expect(customOf({ freq: 'weekly', interval: 2, weekdays: [1, 4] }, '2026-10-09')).toEqual({ every: 2, unit: 'weeks', weekdays: [1, 4] })
  })
})
