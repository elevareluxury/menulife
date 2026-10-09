// Contraste del sistema de diseño (docs/design/DESIGN_SYSTEM.md §3, §11), medido sobre las variables reales de
// src/design/tokens.css. El vidrio se compone sobre el peor caso del fondo:
//  - Universo: el pico de cada nebulosa (están en esquinas distintas: no se superponen en su punto más fuerte).
//  - Amanecer: cada tramo del cielo con el brillo del sol encima.
// Además se mide el vidrio sólido (reducir transparencia) y el texto de la acción principal sobre cada acento.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { QR_COLORS, THEME_BG, THEME_TEXT } from '../../src/design/themes'

const css = readFileSync(join(__dirname, '../../src/design/tokens.css'), 'utf8')

type RGBA = [number, number, number, number]

function parse(color: string): RGBA {
  const c = color.trim()
  const hex = /^#([0-9a-f]{6})$/i.exec(c)
  if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(c)
  if (rgba) {
    const [r, g, b, a = '1'] = rgba[1].split(',').map(s => s.trim())
    return [Number(r), Number(g), Number(b), Number(a)]
  }
  throw new Error(`Color no reconocido: ${color}`)
}

/** Variables declaradas en el primer bloque cuyo selector es exactamente `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`No está el bloque ${selector}`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const vars: Record<string, string> = {}
  for (const m of body.matchAll(/(--my-[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
  return vars
}

/** Acento de un tema: --my-accent y --my-on-accent del bloque `[theme][accent]`. */
function accent(theme: string, name: string): { accent: string; on: string } {
  const re = new RegExp(`\\[data-mycen-theme='${theme}'\\]\\[data-mycen-accent='${name}'\\][^{]*\\{([^}]*)\\}`)
  const body = re.exec(css)?.[1]
  if (!body) throw new Error(`No está el acento ${theme}/${name}`)
  return {
    accent: /--my-accent:\s*([^;]+);/.exec(body)![1],
    on: /--my-on-accent:\s*([^;]+);/.exec(body)![1],
  }
}

const over = (top: RGBA, bottom: RGBA): RGBA => {
  const a = top[3]
  return [0, 1, 2].map(i => top[i] * a + bottom[i] * (1 - a)).concat(1) as RGBA
}
const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (c: RGBA) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
const contrast = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** Colores de las capas del cielo (nebulosas, tramos y sol) leídos de --my-sky. */
function skyLayers(sky: string): RGBA[] {
  return [...sky.matchAll(/rgba\([^)]+\)|#[0-9a-f]{6}/gi)].map(m => parse(m[0]))
}

const THEMES = {
  universo: block("[data-mycen-theme='universo']"),
  amanecer: block("[data-mycen-theme='amanecer']"),
}

function worstBackgrounds(theme: keyof typeof THEMES): RGBA[] {
  const v = THEMES[theme]
  const layers = skyLayers(v['--my-sky'])
  if (theme === 'universo') {
    const base = parse(v['--my-bg'])
    const nebulas = layers.filter(c => c[3] < 1 && !(c[0] === 0 && c[1] === 0 && c[2] === 0))
    return [base, ...nebulas.map(n => over(n, base))]
  }
  const sun = layers.find(c => c[3] < 1)!
  const stops = layers.filter(c => c[3] === 1)
  return stops.flatMap(s => [s, over(sun, s)])
}

describe('sistema de diseño: valores para donde no hay CSS', () => {
  it('QR_COLORS coincide con --my-qr-bg / --my-qr-fg y tiene contraste alto para escanear', () => {
    const v = block('[data-mycen-theme]')
    expect(QR_COLORS.bg.toLowerCase()).toBe(v['--my-qr-bg'].toLowerCase())
    expect(QR_COLORS.fg.toLowerCase()).toBe(v['--my-qr-fg'].toLowerCase())
    expect(contrast(parse(QR_COLORS.fg), parse(QR_COLORS.bg))).toBeGreaterThanOrEqual(15)
  })
})

describe('sistema de diseño: contraste (AA)', () => {
  for (const theme of ['universo', 'amanecer'] as const) {
    const v = THEMES[theme]
    const glasses = {
      vidrio: parse(v['--my-glass']),
      'vidrio destacado': parse(v['--my-glass-strong']),
    }

    for (const [label, glass] of Object.entries(glasses)) {
      it(`${theme}: texto principal, secundario y metadatos sobre ${label} ≥ 4.5:1 en el peor fondo`, () => {
        for (const bg of worstBackgrounds(theme)) {
          const surface = over(glass, bg)
          for (const token of ['--my-text', '--my-muted', '--my-subtle']) {
            expect(contrast(parse(v[token]), surface), `${token} en ${theme}`).toBeGreaterThanOrEqual(4.5)
          }
        }
      })
    }

    it(`${theme}: el vidrio sólido (reducir transparencia) mantiene el contraste`, () => {
      for (const token of ['--my-glass-solid', '--my-glass-strong-solid']) {
        const surface = parse(v[token])
        for (const text of ['--my-text', '--my-muted', '--my-subtle']) {
          expect(contrast(parse(v[text]), surface), `${text} sobre ${token}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it(`${theme}: THEME_BG coincide con --my-bg`, () => {
      expect(THEME_BG[theme].toLowerCase()).toBe(v['--my-bg'].toLowerCase())
      expect(THEME_TEXT[theme].text.toLowerCase()).toBe(v['--my-text'].toLowerCase())
      expect(THEME_TEXT[theme].muted.toLowerCase()).toBe(v['--my-muted'].toLowerCase())
    })

    it(`${theme}: los estados (error, listo, sin publicar) se leen sobre el vidrio`, () => {
      for (const bg of worstBackgrounds(theme)) {
        const surface = over(parse(v['--my-glass']), bg)
        expect(contrast(parse(v['--my-danger']), surface), `--my-danger en ${theme}`).toBeGreaterThanOrEqual(4.5)
        for (const token of ['--my-ok', '--my-warn']) {
          expect(contrast(parse(v[token]), surface), `${token} en ${theme}`).toBeGreaterThanOrEqual(3)
        }
      }
    })

    it(`${theme}: los campos dejan leer el texto`, () => {
      for (const bg of worstBackgrounds(theme)) {
        const field = over(parse(v['--my-field']), over(parse(v['--my-glass']), bg))
        expect(contrast(parse(v['--my-text']), field)).toBeGreaterThanOrEqual(4.5)
      }
    })

    for (const name of ['plasma', 'ion', 'nebulosa', 'aurora']) {
      it(`${theme}/${name}: el texto de la acción principal se lee sobre el acento`, () => {
        const a = accent(theme, name)
        expect(contrast(parse(a.on), parse(a.accent))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
