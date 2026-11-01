import { describe, expect, it } from 'vitest'
import { moduleSize, packSpans, sizeOptions, sizeSpan } from '@/modules/profile/lib/moduleSize'
import type { ProfileModule } from '@/modules/profile/lib/profileTypes'

const mod = (type: string, content: Record<string, unknown> = {}, config: Record<string, unknown> = {}) =>
  ({ type, content, config }) as Pick<ProfileModule, 'type' | 'content' | 'config'>

const SPOTIFY = 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

describe('tamaños de los módulos', () => {
  it('ofrece sólo lo que le queda bien a cada tipo', () => {
    expect(sizeOptions(mod('link'), false)).toEqual(['square', 'wide'])
    expect(sizeOptions(mod('link'), true)).toEqual(['square', 'wide', 'featured'])
    expect(sizeOptions(mod('contact_form'), false)).toEqual(['wide'])
    expect(sizeOptions(mod('media', { url: SPOTIFY }), false)).toEqual(['square', 'bar', 'wide'])
    expect(sizeOptions(mod('media', { url: YOUTUBE }), false)).toEqual(['square', 'wide', 'vertical'])
    expect(sizeOptions(mod('media', { url: 'https://soundcloud.com/a/b' }), false)).not.toContain('bar')
  })

  it('sin elegir: todo ancho fuera de Bento; en Bento, el tamaño de siempre de cada tipo', () => {
    expect(moduleSize(mod('link'), false)).toBe('wide')
    expect(moduleSize(mod('image'), false)).toBe('wide')
    expect(moduleSize(mod('link'), true)).toBe('square')
    expect(moduleSize(mod('image'), true)).toBe('featured')
    expect(moduleSize(mod('hours'), true)).toBe('wide')
    expect(moduleSize(mod('media', { url: YOUTUBE }), true)).toBe('featured')
    expect(moduleSize(mod('media', { url: SPOTIFY }), true)).toBe('wide')
  })

  it('respeta lo elegido sólo si el tipo lo admite', () => {
    expect(moduleSize(mod('image', {}, { size: 'square' }), false)).toBe('square')
    expect(moduleSize(mod('contact_form', {}, { size: 'square' }), false)).toBe('wide')
    // "Destacado" es de Bento: en otra estructura vuelve a lo de siempre
    expect(moduleSize(mod('image', {}, { size: 'featured' }), false)).toBe('wide')
    expect(moduleSize(mod('media', { url: SPOTIFY }, { size: 'bar' }), false)).toBe('bar')
    expect(moduleSize(mod('media', { url: YOUTUBE }, { size: 'bar' }), false)).toBe('wide')
    expect(moduleSize(mod('link', {}, { size: 'enorme' }), true)).toBe('square')
  })

  it('columnas por tamaño', () => {
    expect(sizeSpan('square', 2)).toBe(1)
    expect(sizeSpan('wide', 2)).toBe(2)
    expect(sizeSpan('featured', 2)).toBe(2)
    expect(sizeSpan('wide', 4)).toBe(2)
    expect(sizeSpan('bar', 4)).toBe(4)
    expect(sizeSpan('featured', 4)).toBe(4)
    expect(sizeSpan('vertical', 4)).toBe(1)
  })

  it('en el orden del dueño, sin huecos en el medio: lo último de una fila incompleta se estira; la última fila no', () => {
    expect(packSpans(['square', 'square', 'wide'], 2)).toEqual([1, 1, 2])
    expect(packSpans(['square', 'wide', 'square'], 2)).toEqual([2, 2, 1])
    expect(packSpans(['wide', 'wide', 'wide'], 2)).toEqual([2, 2, 2])
    expect(packSpans(['square', 'square', 'wide'], 4)).toEqual([1, 1, 2])
    expect(packSpans(['square', 'wide', 'featured'], 4)).toEqual([1, 3, 4])
    expect(packSpans(['wide', 'square'], 4)).toEqual([2, 1])
    expect(packSpans(['square', 'square', 'square'], 4)).toEqual([1, 1, 1])
    expect(packSpans(['wide', 'square'], 2)).toEqual([2, 1])
    expect(packSpans([], 4)).toEqual([])
  })
})
