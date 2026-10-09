import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HUELLA_VARIANTS, generateHuella, huellaSeed, huellaToSvg } from '@/lib/huella'

// La huella Mycen (sistema de diseño §8): determinista, distinta por persona y segura para meter en un SVG.

describe('huella', () => {
  it('el código es copia exacta del diseño (las huellas tienen que coincidir con los mockups)', () => {
    const root = join(__dirname, '..', '..')
    expect(readFileSync(join(root, 'src/lib/huella/huella.ts'), 'utf8'))
      .toBe(readFileSync(join(root, 'docs/design/huella.ts'), 'utf8'))
  })

  it('misma semilla y estilo → resultado idéntico', () => {
    for (const v of HUELLA_VARIANTS) {
      expect(generateHuella('perfil-1:', v)).toEqual(generateHuella('perfil-1:', v))
    }
  })

  it('semillas distintas → trazos distintos, en los cuatro estilos', () => {
    for (const v of HUELLA_VARIANTS) {
      const a = generateHuella('perfil-1:', v).strokes.map(s => s.d).join()
      const b = generateHuella('perfil-2:', v).strokes.map(s => s.d).join()
      const c = generateHuella('perfil-1:x', v).strokes.map(s => s.d).join()
      expect(a).not.toBe(b)
      expect(a).not.toBe(c)
    }
  })

  it('cada estilo devuelve entre 1 y 16 trazos', () => {
    for (const v of HUELLA_VARIANTS) {
      for (let i = 0; i < 50; i++) {
        const n = generateHuella(`seed-${i}`, v).strokes.length
        expect(n).toBeGreaterThanOrEqual(1)
        expect(n).toBeLessThanOrEqual(16)
      }
    }
  })

  it('la semilla es el id del perfil + la sal (nunca el nombre)', () => {
    expect(huellaSeed({ id: 'abc' })).toBe('abc:')
    expect(huellaSeed({ id: 'abc', huella_salt: null })).toBe('abc:')
    expect(huellaSeed({ id: 'abc', huella_salt: 'k9' })).toBe('abc:k9')
    const ana = { id: 'abc', huella_salt: 'k9', display_name: 'Ana' }
    const renamed = { ...ana, display_name: 'Otra' }
    expect(huellaSeed(ana)).toBe(huellaSeed(renamed))
  })

  it('huellaToSvg produce un SVG válido', () => {
    for (const v of HUELLA_VARIANTS) {
      const svg = huellaToSvg(generateHuella('perfil-1:', v), { colorA: '#FF7A59', colorB: '#7DD3FC', size: 120, background: '#04050D' })
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="120" height="120"')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      const opened = (svg.match(/<(svg|defs|linearGradient)\b/g) ?? []).length
      const closed = (svg.match(/<\/(svg|defs|linearGradient)>/g) ?? []).length
      expect(opened).toBe(closed)
      expect(svg).toContain('stop-color="#FF7A59"')
      expect(svg).toContain('<rect width="200" height="200" fill="#04050D"/>')
      // Sólo números y comandos de path en los trazos
      for (const m of svg.matchAll(/ d="([^"]*)"/g)) expect(m[1]).toMatch(/^[MLAZl0-9 .-]+$/)
    }
  })

  it('huellaToSvg no deja pasar caracteres peligrosos en los colores', () => {
    const h = generateHuella('perfil-1:', 'orbitas')
    const evil = [
      '"/><script>alert(1)</script>',
      "red' onload='alert(1)",
      'url(javascript:alert(1))',
      '#fff;}</style><img src=x onerror=alert(1)>',
      'red&quot; onmouseover=&quot;x',
    ]
    for (const color of evil) {
      const svg = huellaToSvg(h, { colorA: color, colorB: color, background: color })
      expect(svg).not.toMatch(/<script|<img|<style|onload=|onerror=|onmouseover=|javascript:/i)
      // Los atributos de color no pueden cerrarse ni abrir etiquetas
      for (const m of svg.matchAll(/(?:stop-color|fill)="([^"]*)"/g)) expect(m[1]).not.toMatch(/[<>"'&;:]/)
    }
  })

  it('rendimiento: 200 huellas en menos de 1 segundo', () => {
    const start = performance.now()
    for (let i = 0; i < 200; i++) {
      const h = generateHuella(`perfil-${i}:`, HUELLA_VARIANTS[i % 4])
      huellaToSvg(h, { colorA: '#FF7A59', colorB: '#7DD3FC' })
    }
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
