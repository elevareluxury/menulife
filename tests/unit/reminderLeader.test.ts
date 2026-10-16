import { describe, expect, it } from 'vitest'
import { canTakeLease, parseLease, staleMarkKeys } from '@/modules/life/lib/reminderLeader'

describe('alquiler de la pestaña líder', () => {
  it('lee sólo alquileres bien formados', () => {
    expect(parseLease(null)).toBeNull()
    expect(parseLease('no json')).toBeNull()
    expect(parseLease('{"id":1,"until":2}')).toBeNull()
    expect(parseLease('{"id":"a"}')).toBeNull()
    expect(parseLease('{"id":"a","until":5}')).toEqual({ id: 'a', until: 5 })
  })

  it('se toma libre, vencido o propio; no el de otra pestaña vigente', () => {
    expect(canTakeLease(null, 'yo', 100)).toBe(true)
    expect(canTakeLease({ id: 'otra', until: 100 }, 'yo', 100)).toBe(true)
    expect(canTakeLease({ id: 'otra', until: 99 }, 'yo', 100)).toBe(true)
    expect(canTakeLease({ id: 'yo', until: 500 }, 'yo', 100)).toBe(true)
    expect(canTakeLease({ id: 'otra', until: 101 }, 'yo', 100)).toBe(false)
  })
})

describe('limpieza de marcas "ya avisé"', () => {
  const P = 'life-habit-reminded:'
  it('borra las de días anteriores al corte y las ilegibles, sólo con su prefijo', () => {
    const keys = [
      `${P}h1:2026-10-08`, `${P}h1:2026-10-09`, `${P}h2:2026-10-16`, `${P}h3:ayer`, `${P}h4`,
      'otra-cosa:2020-01-01', 'mycen_journal_lock:x',
    ]
    expect(staleMarkKeys(keys, P, '2026-10-09')).toEqual([`${P}h1:2026-10-08`, `${P}h3:ayer`, `${P}h4`])
  })
  it('sin claves viejas no borra nada', () => {
    expect(staleMarkKeys([`${P}h1:2026-10-16`], P, '2026-10-09')).toEqual([])
  })
})
