import { describe, expect, it } from 'vitest'
import { eventHref, eventIsPast, localToday, posterRatio, readEvents, upcomingEvents, EVENTS_MAX } from '@/modules/profile/lib/events'

// Módulo "Eventos" (ticketera para productoras): lo que la página vuelve a validar y qué se muestra.

describe('readEvents', () => {
  it('valida lo guardado: id, fechas, horas, links y largos', () => {
    const [e] = readEvents([{
      id: 'ab12cd', title: '  Noche Universo  ', date: '2026-11-14', time: '23:30', venue: 'Niceto', tag: 'Techno · +18',
      description: 'Line up completo', url: 'tickets.example.com/u', image_url: 'https://cdn.example.com/f.jpg',
      en: { title: 'Universe Night' },
    }])
    expect(e).toEqual({
      id: 'ab12cd', title: 'Noche Universo', date: '2026-11-14', time: '23:30', venue: 'Niceto', tag: 'Techno · +18',
      description: 'Line up completo', url: 'https://tickets.example.com/u', image_url: 'https://cdn.example.com/f.jpg',
      en: { title: 'Universe Night', description: undefined },
    })
  })

  it('descarta lo que no sirve o engaña', () => {
    const out = readEvents([
      { id: 'x', title: 'id corto' },
      { id: 'AB12CD', title: 'mayúsculas' },
      { id: 'ok1234' },
      { id: 'ok1234', title: 'sin portada ni título no; este sí' },
      { id: 'ok1234', title: 'repetido' },
      { id: 'zz9999', title: 'Datos malos', date: '14/11/2026', time: '25:00', url: 'javascript:alert(1)', image_url: 'http://inseguro.com/a.jpg' },
      null, 'texto',
    ])
    expect(out.map(e => e.title)).toEqual(['sin portada ni título no; este sí', 'Datos malos'])
    expect(out[1]).toEqual({ id: 'zz9999', title: 'Datos malos' })
    expect(readEvents('nada')).toEqual([])
  })

  it('corta en el máximo y recorta los textos largos', () => {
    const many = Array.from({ length: EVENTS_MAX + 5 }, (_, i) => ({ id: `ev${String(i).padStart(4, '0')}`, title: 'x'.repeat(200) }))
    const out = readEvents(many)
    expect(out).toHaveLength(EVENTS_MAX)
    expect(out[0].title).toHaveLength(80)
  })
})

describe('eventos pasados', () => {
  it('se oculta lo que ya pasó; el mismo día sigue y sin fecha nunca se oculta', () => {
    const today = '2026-11-14'
    expect(eventIsPast({ date: '2026-11-13' }, today)).toBe(true)
    expect(eventIsPast({ date: '2026-11-14' }, today)).toBe(false)
    expect(eventIsPast({}, today)).toBe(false)
    const list = [{ id: 'aaaa', date: '2026-11-01' }, { id: 'bbbb', date: '2026-12-01' }, { id: 'cccc' }]
    expect(upcomingEvents(list, today).map(e => e.id)).toEqual(['bbbb', 'cccc'])
  })

  it('hoy es la fecha local de quien mira', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('ficha y portada', () => {
  it('el link de la ficha conserva los demás parámetros', () => {
    expect(eventHref('https://mycen.id/prod?src=qr', 'ab12cd')).toBe('/prod?src=qr&evento=ab12cd')
    expect(eventHref('https://mycen.id/prod?src=qr&evento=ab12cd', null)).toBe('/prod?src=qr')
  })

  it('la proporción del flyer va de 9:16 a 1:1', () => {
    expect(posterRatio(1080, 1920)).toBeCloseTo(0.5625)
    expect(posterRatio(1080, 1350)).toBeCloseTo(0.8)
    expect(posterRatio(1920, 1080)).toBe(1)
    expect(posterRatio(1080, 4000)).toBe(0.5625)
    expect(posterRatio(0, 0)).toBe(0.8)
  })
})
