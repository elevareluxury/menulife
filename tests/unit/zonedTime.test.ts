import { afterEach, describe, expect, it } from 'vitest'
import {
  calendarKey, dateKeyOf, deviceTimeZone, isValidTimeZone, lifeDayOf, lifeNow, lifeTimeZone, lifeToday, monthKeyOf,
  msUntilNextMidnight, noonOfLocalDayISO, nowInZone, resolveTimeZone, sameTimeZone, setAccountTimeZone,
  startOfLocalDayISO, todayKey, zonedParts, zonedTimeToDate,
} from '../../src/modules/life/lib/zonedTime'
import { monthCurve, monthRange, inMonth } from '../../src/modules/life/lib/moneyInsights'
import { localDayOf } from '../../src/modules/life/lib/moneyFuture'
import { monthOf } from '../../src/modules/life/lib/budgets'

// Life OS usa la zona horaria de la cuenta (user_settings.timezone) para "hoy", los meses y las horas.

const BA = 'America/Argentina/Buenos_Aires'   // UTC−3, sin horario de verano
const NY = 'America/New_York'
const MAD = 'Europe/Madrid'
const KIRI = 'Pacific/Kiritimati'              // UTC+14

afterEach(() => setAccountTimeZone(null))

describe('validación y zona de respaldo', () => {
  it('reconoce zonas IANA y rechaza lo demás', () => {
    expect(isValidTimeZone(BA)).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('Marte/Olimpo')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
    expect(isValidTimeZone(null)).toBe(false)
  })
  it('una zona inválida o vacía usa la del dispositivo', () => {
    expect(resolveTimeZone('Marte/Olimpo')).toBe(deviceTimeZone())
    expect(resolveTimeZone(null)).toBe(deviceTimeZone())
    expect(resolveTimeZone(KIRI)).toBe(KIRI)
  })
  it('sin zona elegida (o inválida), Life OS sigue al dispositivo', () => {
    expect(lifeTimeZone()).toBe(deviceTimeZone())
    setAccountTimeZone('Marte/Olimpo')
    expect(lifeTimeZone()).toBe(deviceTimeZone())
    setAccountTimeZone(KIRI)
    expect(lifeTimeZone()).toBe(KIRI)
    setAccountTimeZone(null)
    expect(lifeTimeZone()).toBe(deviceTimeZone())
  })
  it('compara alias de la misma zona', () => {
    expect(sameTimeZone(BA, BA)).toBe(true)
    expect(sameTimeZone('America/Buenos_Aires', BA)).toBe(true)
    expect(sameTimeZone(BA, NY)).toBe(false)
  })
})

describe('día y hora de un instante', () => {
  it('UTC−3: las 01:30 UTC todavía son el día anterior en Buenos Aires', () => {
    const at = new Date('2026-10-16T01:30:00Z')
    expect(dateKeyOf(at, BA)).toBe('2026-10-15')
    expect(dateKeyOf(at, 'UTC')).toBe('2026-10-16')
    expect(zonedParts(at, BA)).toMatchObject({ year: 2026, month: 10, day: 15, hour: 22, minute: 30, weekday: 4 })
  })
  it('UTC+14: Kiritimati ya está en el día siguiente', () => {
    const at = new Date('2026-10-15T12:00:00Z')
    expect(todayKey(KIRI, at)).toBe('2026-10-16')
    expect(todayKey(BA, at)).toBe('2026-10-15')
  })
  it('cambio de mes y de año', () => {
    const newYear = new Date('2027-01-01T02:00:00Z')
    expect(dateKeyOf(newYear, BA)).toBe('2026-12-31')
    expect(monthKeyOf(newYear, BA)).toBe('2026-12')
    expect(monthKeyOf(newYear, MAD)).toBe('2027-01')
    expect(monthKeyOf('2026-10-31T23:30:00-03:00', BA)).toBe('2026-10')
    expect(monthKeyOf('2026-10-31T23:30:00-03:00', MAD)).toBe('2026-11')
  })
  it('una fecha sola (lo que guarda un fijo) queda igual en cualquier zona', () => {
    expect(dateKeyOf('2026-10-05', KIRI)).toBe('2026-10-05')
    expect(dateKeyOf('2026-10-05', BA)).toBe('2026-10-05')
  })
  it('las funciones de Life OS usan la zona de la cuenta', () => {
    const at = new Date('2026-10-16T01:30:00Z')
    setAccountTimeZone(BA)
    expect(lifeToday(at)).toBe('2026-10-15')
    expect(lifeDayOf(at)).toBe('2026-10-15')
    expect(localDayOf(at.toISOString())).toBe('2026-10-15')
    expect(monthOf('2026-11-01T01:00:00Z')).toBe('2026-10')
    setAccountTimeZone(KIRI)
    expect(lifeToday(at)).toBe('2026-10-16')
    expect(monthOf('2026-10-31T12:00:00Z')).toBe('2026-11')
  })
})

describe('instante de una hora de pared', () => {
  it('Buenos Aires: comienzo del día y mediodía', () => {
    expect(startOfLocalDayISO('2026-10-15', BA)).toBe('2026-10-15T03:00:00.000Z')
    expect(noonOfLocalDayISO('2026-10-15', BA)).toBe('2026-10-15T15:00:00.000Z')
  })
  it('Kiritimati (UTC+14): el día empieza el día anterior en UTC', () => {
    expect(startOfLocalDayISO('2026-01-01', KIRI)).toBe('2025-12-31T10:00:00.000Z')
  })
  it('Nueva York con el cambio de horario (8 de marzo y 1 de noviembre de 2026)', () => {
    expect(startOfLocalDayISO('2026-03-07', NY)).toBe('2026-03-07T05:00:00.000Z')   // EST
    expect(startOfLocalDayISO('2026-03-09', NY)).toBe('2026-03-09T04:00:00.000Z')   // EDT
    // 02:30 no existe el 8 de marzo: pasa a la primera hora que sí (03:30 EDT)
    expect(zonedTimeToDate('2026-03-08', '02:30', NY).toISOString()).toBe('2026-03-08T07:30:00.000Z')
    expect(zonedTimeToDate('2026-03-08', '09:00', NY).toISOString()).toBe('2026-03-08T13:00:00.000Z')
    // 01:30 pasa dos veces el 1 de noviembre: se toma la primera (EDT)
    expect(zonedTimeToDate('2026-11-01', '01:30', NY).toISOString()).toBe('2026-11-01T05:30:00.000Z')
    expect(zonedTimeToDate('2026-11-01', '09:00', NY).toISOString()).toBe('2026-11-01T14:00:00.000Z')
  })
  it('Madrid con el cambio de horario (29 de marzo y 25 de octubre de 2026)', () => {
    expect(startOfLocalDayISO('2026-03-29', MAD)).toBe('2026-03-28T23:00:00.000Z')
    expect(zonedTimeToDate('2026-03-29', '12:00', MAD).toISOString()).toBe('2026-03-29T10:00:00.000Z')
    expect(startOfLocalDayISO('2026-10-25', MAD)).toBe('2026-10-24T22:00:00.000Z')
    expect(zonedTimeToDate('2026-10-25', '12:00', MAD).toISOString()).toBe('2026-10-25T11:00:00.000Z')
  })
  it('el comienzo del día cae siempre en ese día de la zona', () => {
    for (const tz of [BA, NY, MAD, KIRI, 'America/Santiago', 'Asia/Kolkata', 'Australia/Lord_Howe']) {
      for (const key of ['2026-01-01', '2026-03-08', '2026-03-29', '2026-04-05', '2026-09-06', '2026-10-04', '2026-11-01', '2026-12-31']) {
        const start = new Date(startOfLocalDayISO(key, tz))
        expect(dateKeyOf(start, tz)).toBe(key)
        expect(dateKeyOf(new Date(start.getTime() - 1), tz) < key).toBe(true)
      }
    }
  })
})

describe('reloj de pared y medianoche', () => {
  it('nowInZone devuelve la fecha y hora de la zona en los campos locales', () => {
    const wall = nowInZone(KIRI, new Date('2026-12-31T11:15:00Z'))
    expect(calendarKey(wall)).toBe('2027-01-01')
    expect(wall.getHours()).toBe(1)
    expect(wall.getMinutes()).toBe(15)
    setAccountTimeZone(BA)
    expect(lifeNow(new Date('2026-10-16T01:30:00Z')).getHours()).toBe(22)
  })
  it('cuenta hasta la medianoche de la zona (también el día del cambio de horario)', () => {
    expect(msUntilNextMidnight(BA, new Date('2026-10-15T23:00:00-03:00'))).toBe(3_600_000)
    // Nueva York, 7 de marzo a las 23:00 EST: la medianoche del 8 llega en 1 h
    expect(msUntilNextMidnight(NY, new Date('2026-03-07T23:00:00-05:00'))).toBe(3_600_000)
    // 8 de marzo a las 00:30 EST: el día tiene 23 h, faltan 22 h 30 min
    expect(msUntilNextMidnight(NY, new Date('2026-03-08T00:30:00-05:00'))).toBe(22.5 * 3_600_000)
  })
})

describe('Dinero con la zona de la cuenta', () => {
  it('monthRange da los bordes del mes en la zona', () => {
    expect(monthRange('2026-10', BA)).toEqual(['2026-10-01T03:00:00.000Z', '2026-11-01T03:00:00.000Z'])
    expect(monthRange('2026-12', KIRI)).toEqual(['2026-11-30T10:00:00.000Z', '2026-12-31T10:00:00.000Z'])
  })
  it('inMonth y monthCurve leen el día en la zona', () => {
    const tx = { type: 'expense' as const, amount: 10, category: 'Otros', description: null, currency: 'ARS', occurred_at: '2026-11-01T01:00:00Z' }
    expect(inMonth(tx.occurred_at, '2026-10', BA)).toBe(true)
    expect(inMonth(tx.occurred_at, '2026-11', MAD)).toBe(true)
    const curve = monthCurve([tx], '2026-10', new Date(2026, 10, 15), BA)
    expect(curve).toHaveLength(31)
    expect(curve[30]).toBe(-10)
    expect(curve[29]).toBe(0)
  })
})
