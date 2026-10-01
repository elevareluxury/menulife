import type { CSSProperties } from 'react'
import type { ProfileTheme } from './profileTypes'

// MYCEN · Quiet Future — paleta base (Etapa 2, Parte VII)
export const QUIET = {
  obsidian: '#111311',
  graphite: '#20221F',
  slate:    '#353832',
  mist:     '#B9B9AE',
  ivory:    '#F1F0E9',
} as const

/** Tipografías del nombre del perfil (curadas). Las claves viejas se mantienen como alias. */
const FONTS: Record<string, string> = {
  geist:           "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
  instrument:      "'Instrument Serif', Georgia, serif",
  'space-grotesk': "'Space Grotesk', 'Geist', sans-serif",
  playfair:        "'Playfair Display', Georgia, serif",
  bebas:           "'Bebas Neue', 'Geist', sans-serif",
  // Alias de perfiles importados del Hub
  syne:            "'Geist', sans-serif",
  'dm-sans':       "'Geist', sans-serif",
  inter:           "'Geist', sans-serif",
}

/** Fuentes que no vienen en la carga global: se piden a Google Fonts sólo si el perfil las usa. */
const ON_DEMAND: Record<string, string> = {
  'space-grotesk': 'Space+Grotesk:wght@600;700',
  playfair: 'Playfair+Display:wght@700',
  bebas: 'Bebas+Neue',
}

export function ensureProfileFont(titleFont: string | undefined) {
  const family = titleFont ? ON_DEMAND[titleFont] : undefined
  if (!family || typeof document === 'undefined') return
  const id = `mp-font-${titleFont}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
  document.head.appendChild(link)
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: [number, number, number]): number {
  const c = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/**
 * Variables CSS del perfil. El acento elegido por el dueño sólo se usa si
 * mantiene contraste legible; si no, se cae al marfil del sistema.
 */
export function themeVars(theme: ProfileTheme | undefined): CSSProperties {
  const light = theme?.mode === 'light'
  const bg = light ? QUIET.ivory : QUIET.obsidian
  const surface = light ? '#FFFFFF' : QUIET.graphite
  const text = light ? QUIET.obsidian : QUIET.ivory
  const muted = light ? '#5C5E57' : QUIET.mist
  const border = light ? 'rgba(17,19,17,0.10)' : 'rgba(241,240,233,0.09)'

  const bgRgb = hexToRgb(bg)!
  const accentRgb = hexToRgb(theme?.accent ?? '')
  const accent = accentRgb && contrast(accentRgb, bgRgb) >= 3 ? theme!.accent! : text
  const onAccent = hexToRgb(accent) && luminance(hexToRgb(accent)!) > 0.45 ? QUIET.obsidian : QUIET.ivory

  return {
    '--p-bg': bg,
    '--p-surface': surface,
    '--p-surface-2': light ? 'rgba(17,19,17,0.04)' : 'rgba(241,240,233,0.05)',
    '--p-text': text,
    '--p-muted': muted,
    '--p-border': border,
    '--p-accent': accent,
    '--p-on-accent': onAccent,
    '--p-title-font': FONTS[theme?.title_font ?? ''] ?? FONTS.geist,
    '--p-body-font': "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  } as CSSProperties
}
