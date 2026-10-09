// Life OS con el sistema de diseño (V1 · etapa 12): contraste AA de los colores propios de Life OS en los dos temas.
//  - Los colores de cada área (src/modules/life/life.css) se usan como texto: ≥ 4.5:1 sobre el fondo, el vidrio y el
//    vidrio sólido del tema (y sobre los tramos del cielo de Amanecer con el vidrio encima).
//  - Los colores que elige la persona (lifePalette) pasan por ink(): en Amanecer se mezclan con el texto. Como ícono o
//    borde necesitan ≥ 3:1, y como texto chico (rachas, porcentajes) ≥ 4.5:1 — se pide 4.5 a todos menos al gris "Otros".
//  - El tilde y el texto sobre un color de área lleno usan --my-on-accent: ≥ 4.5:1.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, LIFE_COLORS } from '../../src/modules/life/lib/lifePalette'

const tokens = readFileSync(join(__dirname, '../../src/design/tokens.css'), 'utf8')
const life = readFileSync(join(__dirname, '../../src/modules/life/life.css'), 'utf8')

type RGB = [number, number, number]

function hex(c: string): RGB {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) throw new Error(`Color no reconocido: ${c}`)
  return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) as RGB
}
function rgba(c: string): [RGB, number] {
  const m = /^rgba\(([^)]+)\)$/i.exec(c.trim())
  if (!m) throw new Error(`Color no reconocido: ${c}`)
  const [r, g, b, a] = m[1].split(',').map(s => Number(s.trim()))
  return [[r, g, b], a]
}
const mix = (a: RGB, b: RGB, wa: number): RGB => [0, 1, 2].map(i => a[i] * wa + b[i] * (1 - wa)) as RGB
const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (c: RGB) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Variables de un bloque `[data-mycen-theme='x'] {` (el primero que aparece) en un CSS. */
function vars(css: string, theme: string): Record<string, string> {
  const start = css.indexOf(`[data-mycen-theme='${theme}'] {`)
  if (start < 0) throw new Error(`No está el bloque ${theme}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}
function onAccent(theme: string): RGB {
  const re = new RegExp(`\\[data-mycen-theme='${theme}'\\], \\[data-mycen-theme='${theme}'\\] \\[data-mycen-accent='plasma'\\][^{]*\\{([^}]*)\\}`)
  const body = re.exec(tokens)?.[1]
  if (!body) throw new Error(`No está el acento por defecto de ${theme}`)
  return hex(/--my-on-accent:\s*([^;]+);/.exec(body)![1])
}

const AREAS = ['--life-money', '--life-goals', '--life-habits', '--life-brain'] as const

for (const theme of ['universo', 'amanecer'] as const) {
  const t = vars(tokens, theme)
  const l = vars(life, theme)
  const bg = hex(t['--my-bg'])
  const text = hex(t['--my-text'])
  const [glassRgb, glassA] = rgba(t['--my-glass'])
  const [strongRgb, strongA] = rgba(t['--my-glass-strong'])
  // Fondos donde va el texto: el fondo, el vidrio (normal y fuerte) sobre el fondo y el vidrio sólido.
  // En Amanecer, además, los tramos más oscuros del cielo (los de "Mi día") con el vidrio encima.
  const skyStops = theme === 'amanecer' ? ['#E9E3F7', '#F6DDD6'].map(hex) : []
  const surfaces: [string, RGB][] = [
    ['fondo', bg],
    ['vidrio', mix(glassRgb, bg, glassA)],
    ['vidrio fuerte', mix(strongRgb, bg, strongA)],
    ['vidrio sólido', hex(t['--my-glass-strong-solid'])],
    ...skyStops.map((s, i): [string, RGB] => [`cielo ${i + 1} + vidrio`, mix(glassRgb, s, glassA)]),
  ]
  const inkPct = Number(/^(\d+)%$/.exec(l['--life-ink'])?.[1]) / 100
  const ink = (c: string) => mix(hex(c), text, inkPct)

  describe(`Life OS · ${theme}`, () => {
    it('declara los colores de las cuatro áreas y la mezcla de ink', () => {
      for (const a of AREAS) expect(l[a], a).toMatch(/^#[0-9A-F]{6}$/i)
      expect(inkPct).toBeGreaterThan(0)
      expect(inkPct).toBeLessThanOrEqual(1)
    })

    for (const a of AREAS) {
      it(`${a} se lee como texto (≥ 4.5:1) en todas las superficies`, () => {
        for (const [name, s] of surfaces) expect(contrast(hex(l[a]), s), `${a} sobre ${name}`).toBeGreaterThanOrEqual(4.5)
      })
      it(`el tilde sobre ${a} lleno (--my-on-accent) llega a 4.5:1`, () => {
        expect(contrast(onAccent(theme), hex(l[a]))).toBeGreaterThanOrEqual(4.5)
      })
    }

    it('los colores que elige la persona, pasados por ink(), se leen sobre el fondo y el vidrio', () => {
      const all = [...new Set([...LIFE_COLORS, ...Object.values(CATEGORY_COLORS)])]
      for (const c of all) {
        const min = c.toUpperCase() === '#6B7280' ? 3 : 4.5
        for (const [name, s] of surfaces) expect(contrast(ink(c), s), `${c} sobre ${name}`).toBeGreaterThanOrEqual(min)
        // El tilde sobre un hábito o una meta completados (fondo ink(color), ícono --my-on-accent)
        expect(contrast(onAccent(theme), ink(c)), `tilde sobre ${c}`).toBeGreaterThanOrEqual(3)
      }
    })
  })
}
