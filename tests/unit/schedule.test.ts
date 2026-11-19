import { describe, expect, it } from 'vitest'
import { hoursStatus, isOpenNow } from '../../src/modules/profile/lib/schedule'
import type { WeekSchedule } from '../../src/modules/profile/lib/profileTypes'

// Horario del módulo: "Abierto ahora · cierra a las…" / "Cerrado · abre…" con la hora del negocio, sin inventar nada.

const TZ = 'UTC'
const weekdays = { open: '09:00', close: '18:00' }
const OFFICE: WeekSchedule = {
  monday: weekdays, tuesday: weekdays, wednesday: weekdays, thursday: weekdays, friday: weekdays,
  saturday: { closed: true }, sunday: { closed: true },
}
// 2026-11-16 es lunes
const at = (day: number, hhmm: string) => new Date(`2026-11-${String(16 + day).padStart(2, '0')}T${hhmm}:00Z`)

describe('hoursStatus', () => {
  it('abierto: dice a qué hora cierra', () => {
    expect(hoursStatus(OFFICE, TZ, at(0, '10:30'))).toMatchObject({ open: true, at: '18:00' })
  })

  it('antes de abrir: abre hoy', () => {
    expect(hoursStatus(OFFICE, TZ, at(1, '07:00'))).toMatchObject({ open: false, at: '09:00', inDays: 0, day: 'tuesday' })
  })

  it('después de cerrar: abre mañana', () => {
    expect(hoursStatus(OFFICE, TZ, at(2, '19:00'))).toMatchObject({ open: false, at: '09:00', inDays: 1, day: 'thursday' })
  })

  it('viernes a la noche: abre el lunes (salta el fin de semana)', () => {
    expect(hoursStatus(OFFICE, TZ, at(4, '20:00'))).toMatchObject({ open: false, inDays: 3, day: 'monday' })
  })

  it('horario que pasa la medianoche: a la madrugada sigue abierto y cierra con el horario de ayer', () => {
    const bar: WeekSchedule = { ...OFFICE, friday: { open: '20:00', close: '03:00' } }
    expect(isOpenNow(bar, TZ, at(5, '01:30'))).toBe(true)
    expect(hoursStatus(bar, TZ, at(5, '01:30'))).toMatchObject({ open: true, at: '03:00' })
    expect(hoursStatus(bar, TZ, at(4, '22:00'))).toMatchObject({ open: true, at: '03:00' })
  })

  it('sin datos o siempre cerrado: null (no se inventa)', () => {
    expect(hoursStatus(null, TZ)).toBeNull()
    expect(hoursStatus({}, TZ)).toBeNull()
    const closed = Object.fromEntries(Object.keys(OFFICE).map(d => [d, { closed: true }])) as WeekSchedule
    expect(hoursStatus(closed, TZ)).toBeNull()
  })
})
