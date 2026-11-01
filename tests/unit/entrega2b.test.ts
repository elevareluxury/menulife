import { describe, expect, it } from 'vitest'
import { cleanBranches, coordsFromMapsUrl, distanceKm, formatDistance, sortByDistance } from '@/modules/profile/lib/branches'
import { avatarFor, isAvatarMoment } from '@/modules/profile/lib/avatarAlt'
import { LAZY_BRANDS, NETWORK_LABELS, networkFromUrl } from '@/modules/profile/lib/networks'
import { BRAND_ICON_PATHS } from '@/modules/profile/lib/brandIcons'

// Entrega 2b: sucursales con "Ver la más cerca", segunda foto de perfil e íconos de marca a pedido.

describe('sucursales', () => {
  it('saca las coordenadas de los links largos de Google y Apple Maps', () => {
    expect(coordsFromMapsUrl('https://www.google.com/maps/place/Cafe/@-34.6037,-58.3816,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-34.6035!4d-58.3812'))
      .toEqual({ lat: -34.6035, lng: -58.3812 })
    expect(coordsFromMapsUrl('https://www.google.com/maps/@40.4168,-3.7038,15z')).toEqual({ lat: 40.4168, lng: -3.7038 })
    expect(coordsFromMapsUrl('https://maps.google.com/?q=-31.4201,-64.1888')).toEqual({ lat: -31.4201, lng: -64.1888 })
    expect(coordsFromMapsUrl('https://maps.apple.com/?ll=48.8584,2.2945&q=Torre')).toEqual({ lat: 48.8584, lng: 2.2945 })
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/?api=1&query=-34.6%2C-58.4')).toEqual({ lat: -34.6, lng: -58.4 })
  })

  it('un link corto, una búsqueda por texto o coordenadas imposibles no dan coordenadas', () => {
    expect(coordsFromMapsUrl('https://maps.app.goo.gl/abc123')).toBeNull()
    expect(coordsFromMapsUrl('https://www.google.com/maps/search/?api=1&query=San%20Mart%C3%ADn%20123')).toBeNull()
    expect(coordsFromMapsUrl('https://www.google.com/maps/@95.1,10,15z')).toBeNull()
    expect(coordsFromMapsUrl('https://www.google.com/maps/@0,0,15z')).toBeNull()
    expect(coordsFromMapsUrl(null)).toBeNull()
  })

  it('ordena por cercanía y deja al final las que no tienen coordenadas, en el orden del dueño', () => {
    const places = [
      { id: 'sin', c: null },
      { id: 'lejos', c: { lat: -31.42, lng: -64.19 } }, // Córdoba
      { id: 'cerca', c: { lat: -34.60, lng: -58.38 } }, // Buenos Aires
      { id: 'sin2', c: null },
    ]
    const sorted = sortByDistance(places, p => p.c, { lat: -34.61, lng: -58.40 })
    expect(sorted.map(s => s.place.id)).toEqual(['cerca', 'lejos', 'sin', 'sin2'])
    expect(sorted[0].km).toBeLessThan(3)
    expect(sorted[2].km).toBeNull()
  })

  it('distancia y formato', () => {
    const km = distanceKm({ lat: -34.6037, lng: -58.3816 }, { lat: -31.4201, lng: -64.1888 })
    expect(km).toBeGreaterThan(640)
    expect(km).toBeLessThan(660)
    expect(formatDistance(0.34, 'es')).toBe('350 m')
    expect(formatDistance(1.24, 'es')).toBe('1,2 km')
    expect(formatDistance(18.4, 'en')).toBe('18 km')
  })

  it('limpia lo guardado: sin dirección ni link no entra, links peligrosos afuera, tope de 10', () => {
    const raw = [
      { name: 'Centro', address: 'Florida 100', maps_url: 'javascript:alert(1)' },
      { name: 'Vacía' },
      'texto',
      ...Array.from({ length: 12 }, (_, i) => ({ address: `Calle ${i}` })),
    ]
    const out = cleanBranches(raw)
    expect(out[0]).toEqual({ name: 'Centro', address: 'Florida 100', city: '', maps_url: '' })
    expect(out.some(b => b.name === 'Vacía')).toBe(false)
    expect(out.length).toBeLessThanOrEqual(10)
    expect(cleanBranches('nada')).toEqual([])
  })
})

describe('segunda foto de perfil', () => {
  const at = (h: number) => new Date(2026, 10, 1, h, 30)
  it('mañana = 5 a 12; noche = 20 a 5', () => {
    expect([4, 5, 11, 12].map(h => isAvatarMoment('amanecer', at(h)))).toEqual([false, true, true, false])
    expect([19, 20, 23, 0, 4, 5].map(h => isAvatarMoment('noche', at(h)))).toEqual([false, true, true, true, true, false])
  })

  it('usa la segunda en su momento y la de siempre el resto del día', () => {
    const theme = { avatar_alt: { url: 'https://cdn.example.com/noche.webp', when: 'noche' as const } }
    expect(avatarFor('https://cdn.example.com/dia.webp', theme, at(22))).toBe('https://cdn.example.com/noche.webp')
    expect(avatarFor('https://cdn.example.com/dia.webp', theme, at(15))).toBe('https://cdn.example.com/dia.webp')
    expect(avatarFor('https://cdn.example.com/dia.webp', null, at(22))).toBe('https://cdn.example.com/dia.webp')
  })

  it('una segunda foto inválida se ignora', () => {
    const bad = { avatar_alt: { url: 'javascript:alert(1)', when: 'noche' as const } }
    expect(avatarFor('https://cdn.example.com/dia.webp', bad, at(22))).toBe('https://cdn.example.com/dia.webp')
    const http = { avatar_alt: { url: 'http://cdn.example.com/x.webp', when: 'noche' as const } }
    expect(avatarFor(null, http, at(22))).toBeNull()
  })
})

describe('íconos de marca', () => {
  it('cada marca a pedido tiene su trazo y su nombre', () => {
    expect(LAZY_BRANDS.size).toBeGreaterThanOrEqual(30)
    expect(new Set(Object.keys(BRAND_ICON_PATHS))).toEqual(new Set(LAZY_BRANDS))
    for (const key of LAZY_BRANDS) {
      expect(BRAND_ICON_PATHS[key]).toMatch(/^[Mm]/)
      expect(NETWORK_LABELS[key]).toBeTruthy()
    }
  })

  it('reconoce la red por el dominio', () => {
    expect(networkFromUrl('https://music.youtube.com/channel/x')).toBe('youtubemusic')
    expect(networkFromUrl('https://youtube.com/@ana')).toBe('youtube')
    expect(networkFromUrl('https://open.spotify.com/artist/1')).toBe('spotify')
    expect(networkFromUrl('https://t.me/ana')).toBe('telegram')
    expect(networkFromUrl('https://link.mercadopago.com.ar/ana')).toBe('mercadopago')
    expect(networkFromUrl('https://bsky.app/profile/ana.bsky.social')).toBe('bluesky')
    expect(networkFromUrl('https://www.threads.net/@ana')).toBe('threads')
    expect(networkFromUrl('https://ana.substack.com')).toBe('substack')
    expect(networkFromUrl('https://ejemplo.com')).toBe('')
  })
})
