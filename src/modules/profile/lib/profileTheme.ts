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

/** Opciones de Apariencia (Identity Fase 9). Siempre dentro del sistema: ningún valor libre salvo el acento. */
export const CORNERS = ['sharp', 'soft', 'round'] as const
export const BACKGROUNDS = ['plain', 'glow', 'tint'] as const
export const CARD_STYLES = ['filled', 'outline', 'flat'] as const
export type CornerStyle = typeof CORNERS[number]
export type BackgroundStyle = typeof BACKGROUNDS[number]
export type CardStyle = typeof CARD_STYLES[number]
export type ResolvedMode = 'dark' | 'light'

/** Umbrales WCAG 2.1 AA */
export const AA = { text: 4.5, ui: 3 } as const

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

// ── Color ───────────────────────────────────────────────────────────────────

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(c: Rgb): string {
  return '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** a mezclado con b en la proporción t (0 = a, 1 = b) */
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)!, y = hexToRgb(b)!
  return rgbToHex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t) as Rgb)
}

/** Primer color entre `from` y `to` (de a 5 %) que cumple `ok`; si ninguno, `to`. */
function towards(from: string, to: string, ok: (c: string) => boolean): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = t === 0 ? from : mix(from, to, t)
    if (ok(c)) return c
  }
  return to
}

function luminance([r, g, b]: Rgb): number {
  const c = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Contraste WCAG entre dos colores #RRGGBB (1 a 21) */
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(hexToRgb(a)!), luminance(hexToRgb(b)!)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// ── Tema ────────────────────────────────────────────────────────────────────

/** 'auto' sigue al dispositivo del visitante */
export function resolveMode(theme: ProfileTheme | undefined, prefersLight: boolean): ResolvedMode {
  if (theme?.mode === 'light') return 'light'
  if (theme?.mode === 'auto') return prefersLight ? 'light' : 'dark'
  return 'dark'
}

const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  (list as readonly string[]).includes(v as string) ? v as T : fallback

/** Cuánto acento se mezcla en el fondo (en el punto más intenso del brillo) */
const BG_MIX: Record<BackgroundStyle, number> = { plain: 0, glow: 0.16, tint: 0.07 }
const RADIUS_SCALE: Record<CornerStyle, number> = { sharp: 0.35, soft: 1, round: 1.45 }

export interface ThemePalette {
  mode: ResolvedMode
  /** Fondo base y el punto del fondo más parecido al acento (brillo/teñido): ahí se mide el contraste */
  bg: string
  bgWorst: string
  surface: string
  /** Fondo real de las tarjetas (con "borde" son transparentes: se ven sobre el fondo) */
  cardBg: string
  text: string
  muted: string
  /** Acento para botones, bordes y detalles (≥ 3:1 con el fondo y con texto encima legible) */
  accent: string
  onAccent: string
  /** Acento para texto chico (≥ 4.5:1); si no alcanza, el color de texto */
  accentText: string
  /** El acento elegido no alcanzó el contraste y se reemplazó */
  accentReplaced: boolean
}

export function themePalette(theme: ProfileTheme | undefined, mode: ResolvedMode): ThemePalette {
  const light = mode === 'light'
  const background = pick(theme?.background, BACKGROUNDS, 'plain')
  const cards = pick(theme?.card_style, CARD_STYLES, 'filled')
  const base = light ? QUIET.ivory : QUIET.obsidian
  const baseSurface = light ? '#FFFFFF' : QUIET.graphite
  const text = light ? QUIET.obsidian : QUIET.ivory
  const mutedBase = light ? '#5C5E57' : QUIET.mist

  const wanted = hexToRgb(theme?.accent ?? '') ? rgbToHex(hexToRgb(theme!.accent!)!) : null
  // Fondo y tarjetas según el color con el que se tiñen (brillo/teñido)
  const surfaces = (tint: string) => {
    const bg = background === 'tint' ? mix(base, tint, BG_MIX.tint) : base
    const bgWorst = mix(base, tint, BG_MIX[background])
    const surface = background === 'tint' ? mix(baseSurface, tint, 0.05) : baseSurface
    return { bg, bgWorst, surface, cardBg: cards === 'outline' ? bgWorst : surface }
  }

  const bestOn = (c: string) => (contrast(QUIET.obsidian, c) >= contrast(QUIET.ivory, c) ? QUIET.obsidian : QUIET.ivory)
  const usable = (c: string) => contrast(c, surfaces(c).bgWorst) >= AA.ui && contrast(bestOn(c), c) >= AA.text
  // Si el acento no alcanza, se usa el color de texto (y el fondo se tiñe con ese, no con el elegido)
  const accent = wanted && usable(wanted) ? wanted : text
  const { bg, bgWorst, surface, cardBg } = surfaces(accent)
  const accentText = Math.min(contrast(accent, bgWorst), contrast(accent, cardBg)) >= AA.text ? accent : text
  // El texto secundario se acerca al principal sólo lo necesario para llegar a 4.5:1 (con brillo o teñido)
  const muted = towards(mutedBase, text, c => Math.min(contrast(c, bgWorst), contrast(c, cardBg)) >= AA.text)

  return {
    mode, bg, bgWorst, surface, cardBg, text, muted,
    accent, onAccent: bestOn(accent), accentText,
    accentReplaced: !!wanted && accent !== wanted,
  }
}

export interface ContrastCheck { key: 'text' | 'muted' | 'accent' | 'onAccent'; ratio: number; min: number; ok: boolean }

/** Contraste de cada par que usa la página, en el peor caso (fondo con brillo/teñido y tarjetas). */
export function contrastReport(p: ThemePalette): ContrastCheck[] {
  const worst = (fg: string) => Math.min(contrast(fg, p.bgWorst), contrast(fg, p.cardBg))
  const rows: [ContrastCheck['key'], number, number][] = [
    ['text', worst(p.text), AA.text],
    ['muted', worst(p.muted), AA.text],
    ['accent', contrast(p.accent, p.bgWorst), AA.ui],
    ['onAccent', contrast(p.onAccent, p.accent), AA.text],
  ]
  return rows.map(([key, ratio, min]) => ({ key, ratio: Math.round(ratio * 10) / 10, min, ok: ratio >= min }))
}

/**
 * Variables CSS del perfil. `prefersLight` = el dispositivo pide modo claro (sólo importa en 'auto').
 * El acento elegido por el dueño sólo se usa si mantiene contraste legible (ver themePalette).
 */
export function themeVars(theme: ProfileTheme | undefined, prefersLight = false): CSSProperties {
  const p = themePalette(theme, resolveMode(theme, prefersLight))
  const light = p.mode === 'light'
  const background = pick(theme?.background, BACKGROUNDS, 'plain')
  const cards = pick(theme?.card_style, CARD_STYLES, 'filled')
  const corners = pick(theme?.corners, CORNERS, 'soft')
  const border = light ? 'rgba(17,19,17,0.10)' : 'rgba(241,240,233,0.09)'
  const strongBorder = light ? 'rgba(17,19,17,0.22)' : 'rgba(241,240,233,0.20)'
  const [ar, ag, ab] = hexToRgb(p.accent)!

  return {
    '--p-bg': p.bg,
    '--p-bg-image': background === 'glow'
      ? `radial-gradient(120% 55% at 50% 0%, rgba(${ar},${ag},${ab},${BG_MIX.glow}) 0%, rgba(${ar},${ag},${ab},0) 70%)`
      : 'none',
    '--p-surface': p.surface,
    '--p-surface-2': light ? 'rgba(17,19,17,0.04)' : 'rgba(241,240,233,0.05)',
    '--p-card-bg': cards === 'outline' ? 'transparent' : p.surface,
    '--p-card-border': cards === 'flat' ? 'transparent' : cards === 'outline' ? strongBorder : border,
    '--p-text': p.text,
    '--p-muted': p.muted,
    '--p-border': border,
    '--p-accent': p.accent,
    '--p-on-accent': p.onAccent,
    '--p-accent-text': p.accentText,
    '--p-rs': String(RADIUS_SCALE[corners]),
    '--p-title-font': FONTS[theme?.title_font ?? ''] ?? FONTS.geist,
    '--p-body-font': "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorScheme: p.mode,
  } as CSSProperties
}
