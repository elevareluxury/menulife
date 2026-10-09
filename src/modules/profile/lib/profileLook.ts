// Aspecto del perfil (V1 · etapa 03): estructura, tema Universo / Amanecer, acento de la paleta, estilo de huella
// y portada. Lee también los valores de antes (modo dark/light/auto y un color libre), con la misma regla que la
// migración 20261015000001_v1_profile_look.sql: las versiones ya publicadas no se tocan y se interpretan acá.
// Imports relativos (sin @/): también la usa la función Edge de api/og/[slug].tsx.
import type { CSSProperties } from 'react'
import { MYCEN_ACCENTS, MYCEN_THEMES, type MycenAccent, type MycenTheme } from '../../../design/themes'
import { HUELLA_VARIANTS, type HuellaVariant } from '../../../lib/huella'
import type { ProfileTheme } from './profileTypes'

export const PROFILE_LAYOUTS = ['credencial', 'portada', 'editorial', 'bento', 'clasica'] as const
export type ProfileLayout = typeof PROFILE_LAYOUTS[number]

export interface ProfileCover { type: 'huella' | 'imagen'; url?: string }

export interface ProfileLook {
  layout: ProfileLayout
  mode: MycenTheme
  accent: MycenAccent
  huellaVariant: HuellaVariant
  cover: ProfileCover
}

const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => (list as readonly unknown[]).includes(v)

/** Tonos de la paleta (Universo): el color libre de antes va al más cercano. */
const ACCENT_HUES: [MycenAccent, number][] = [['plasma', 12], ['aurora', 171], ['ion', 199], ['nebulosa', 252]]

/** Acento de la paleta más cercano a un color #RRGGBB (por tono; los grises quedan en Plasma). */
export function nearestAccent(hex: string | null | undefined): MycenAccent {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? '')
  if (!m) return 'plasma'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d === 0 || d / (1 - Math.abs(mx + mn - 1)) < 0.15) return 'plasma'
  let h = mx === r ? 60 * ((g - b) / d + 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)
  h = h - 360 * Math.floor(h / 360)
  let best: MycenAccent = 'plasma', min = Infinity
  for (const [name, hue] of ACCENT_HUES) {
    const dist = Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue))
    if (dist < min) { min = dist; best = name }
  }
  return best
}

/** Aspecto del perfil, con los valores por defecto y la lectura de los de antes. */
export function profileLook(theme: ProfileTheme | null | undefined): ProfileLook {
  const t = theme ?? {}
  const mode: MycenTheme = oneOf(MYCEN_THEMES, t.mode) ? t.mode : t.mode === 'light' ? 'amanecer' : 'universo'
  const accent: MycenAccent = oneOf(MYCEN_ACCENTS, t.accent) ? t.accent : nearestAccent(t.accent)
  const url = typeof t.cover?.url === 'string' && /^https:\/\//i.test(t.cover.url) ? t.cover.url : undefined
  return {
    layout: oneOf(PROFILE_LAYOUTS, t.layout) ? t.layout : 'clasica',
    mode,
    accent,
    huellaVariant: oneOf(HUELLA_VARIANTS, t.huella_variant) ? t.huella_variant : 'orbitas',
    cover: t.cover?.type === 'imagen' && url ? { type: 'imagen', url } : { type: 'huella' },
  }
}

/**
 * Las variables de los módulos (--p-*) apuntan al sistema de diseño (--my-*), que define el tema y el acento puestos
 * con data-mycen-theme / data-mycen-accent en la raíz del perfil. Así cada módulo toma el nuevo aspecto sin cambiar.
 */
export function lookVars(look: ProfileLook): CSSProperties {
  return {
    '--p-bg': 'var(--my-bg)',
    '--p-bg-image': 'none',
    '--p-surface': 'var(--my-glass-strong)',
    '--p-surface-2': 'var(--my-glass)',
    '--p-card-bg': 'var(--my-glass)',
    '--p-card-border': 'var(--my-border)',
    '--p-text': 'var(--my-text)',
    '--p-muted': 'var(--my-muted)',
    '--p-border': 'var(--my-border)',
    '--p-accent': 'var(--my-accent)',
    '--p-on-accent': 'var(--my-on-accent)',
    // Texto chico del color del acento: en Amanecer no siempre llega a 4.5:1 sobre el vidrio, va el color de texto
    '--p-accent-text': look.mode === 'universo' ? 'var(--my-accent)' : 'var(--my-text)',
    // Tarjetas de 24 px (sistema de diseño §5): los módulos usan 20 px × --p-rs
    '--p-rs': '1.2',
    '--p-title-font': 'var(--my-font-display)',
    '--p-body-font': 'var(--my-font-ui)',
    colorScheme: look.mode === 'universo' ? 'dark' : 'light',
  } as CSSProperties
}

/** Color de fondo de la página (para el body, sin bordes blancos al hacer scroll) */
export const LOOK_PAGE_BG: Record<MycenTheme, string> = { universo: '#04050D', amanecer: '#FBF4EE' }
