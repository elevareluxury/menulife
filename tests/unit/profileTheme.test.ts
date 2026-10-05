import { describe, expect, it } from 'vitest'
import {
  AA, BACKGROUNDS, CARD_STYLES, CORNERS, QUIET, contrast, contrastReport, resolveMode, themePalette, themeVars,
} from '@/modules/profile/lib/profileTheme'

const vars = (theme: Parameters<typeof themeVars>[0], prefersLight = false) => themeVars(theme, prefersLight) as Record<string, string>

// Acentos de Studio + una barrida de colores (6×6×6 = 216, como la paleta "web safe") + extremos
const PRESETS = [QUIET.ivory, QUIET.obsidian, '#F4705A', '#F59E0B', '#22C55E', '#3B82F6', '#A78BFA', '#EC4899']
const STEPS = ['00', '33', '66', '99', 'CC', 'FF']
const SWEEP = STEPS.flatMap(r => STEPS.flatMap(g => STEPS.map(b => `#${r}${g}${b}`)))
const ACCENTS = [...PRESETS, ...SWEEP, '#808080', '#777777', '#7F7F7F', undefined]

describe('themeVars', () => {
  it('usa el acento cuando tiene contraste suficiente', () => {
    expect(vars({ mode: 'dark', accent: '#F4705A' })['--p-accent']).toBe('#F4705A')
  })

  it('cae al color de texto si el acento no se lee sobre el fondo', () => {
    expect(vars({ mode: 'dark', accent: '#151715' })['--p-accent']).toBe(QUIET.ivory)
    expect(vars({ mode: 'light', accent: '#F5F5F0' })['--p-accent']).toBe(QUIET.obsidian)
  })

  it('oscuro por defecto con los tokens de Mycen (sin cambios para los perfiles existentes)', () => {
    const v = vars(undefined)
    expect(v['--p-bg']).toBe(QUIET.obsidian)
    expect(v['--p-text']).toBe(QUIET.ivory)
    expect(v['--p-surface']).toBe(QUIET.graphite)
    expect(v['--p-card-bg']).toBe(QUIET.graphite)
    expect(v['--p-rs']).toBe('1')
    expect(v['--p-bg-image']).toBe('none')
    expect(v['--p-muted']).toBe(QUIET.mist)
    expect(vars({ mode: 'light' })['--p-muted']).toBe('#5C5E57')
  })

  it('automático sigue al dispositivo', () => {
    expect(resolveMode({ mode: 'auto' }, true)).toBe('light')
    expect(resolveMode({ mode: 'auto' }, false)).toBe('dark')
    expect(vars({ mode: 'auto' }, true)['--p-bg']).toBe(QUIET.ivory)
    expect(resolveMode({ mode: 'dark' }, true)).toBe('dark')
  })

  it('valores desconocidos caen a los de siempre', () => {
    const v = vars({ corners: 'x' as never, background: 'x' as never, card_style: 'x' as never })
    expect(v['--p-rs']).toBe('1')
    expect(v['--p-bg-image']).toBe('none')
    expect(v['--p-card-bg']).toBe(QUIET.graphite)
  })
})

describe('contraste (WCAG AA) en todas las combinaciones', () => {
  it('texto, texto secundario, acento y texto sobre el acento siempre se leen', () => {
    const failures: string[] = []
    for (const mode of ['dark', 'light'] as const) {
      for (const background of BACKGROUNDS) {
        for (const card_style of CARD_STYLES) {
          for (const corners of CORNERS) {
            for (const accent of ACCENTS) {
              const p = themePalette({ mode, background, card_style, corners, accent }, mode)
              for (const c of contrastReport(p)) {
                if (!c.ok) failures.push(`${mode}/${background}/${card_style}/${accent}: ${c.key} ${c.ratio}`)
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('el acento para texto chico llega a 4.5:1 sobre el fondo y las tarjetas', () => {
    for (const mode of ['dark', 'light'] as const) {
      for (const background of BACKGROUNDS) {
        for (const card_style of CARD_STYLES) {
          for (const accent of ACCENTS) {
            const p = themePalette({ mode, background, card_style, accent }, mode)
            expect(contrast(p.accentText, p.bgWorst)).toBeGreaterThanOrEqual(AA.text)
            expect(contrast(p.accentText, p.cardBg)).toBeGreaterThanOrEqual(AA.text)
          }
        }
      }
    }
  })

  it('avisa cuando el acento elegido se reemplazó', () => {
    expect(themePalette({ accent: '#151715' }, 'dark').accentReplaced).toBe(true)
    expect(themePalette({ accent: '#F4705A' }, 'dark').accentReplaced).toBe(false)
    expect(themePalette({}, 'dark').accentReplaced).toBe(false)
  })
})
