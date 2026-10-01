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

const FONTS: Record<string, string> = {
  syne:            "'Syne', 'Geist', sans-serif",
  playfair:        "'Playfair Display', Georgia, serif",
  'space-grotesk': "'Space Grotesk', 'Geist', sans-serif",
  bebas:           "'Bebas Neue', 'Geist', sans-serif",
  'dm-sans':       "'DM Sans', 'Geist', sans-serif",
  inter:           "'Inter', 'Geist', sans-serif",
  geist:           "'Geist', 'Inter', sans-serif",
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
    '--p-body-font': "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  } as CSSProperties
}
