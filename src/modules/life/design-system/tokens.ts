// Life OS con el sistema de diseño de Mycen (V1 · etapa 12). Una sola fuente: estos tokens apuntan a las variables de
// src/design/tokens.css (Universo / Amanecer según el celular; LifeShell pone data-mycen-theme en <html>) y a las de
// life.css (colores de cada área, ajustados por tema para que el texto llegue a AA). Nada de colores sueltos.

/** Mezcla un color con transparencia (sirve con variables CSS, donde no se puede sumar "22" al final de un hex). */
export const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`

/** Color elegido por la persona (hábito, meta, categoría) listo para usar sobre el fondo del tema: se mezcla con el
 *  color del texto (--life-ink en life.css): en Amanecer se oscurece y en Universo se aclara un poco, para que se lea. */
export const ink = (color: string) => `color-mix(in srgb, ${color} var(--life-ink), var(--my-text))`

export const colors = {
  bg: 'var(--my-bg)',
  surface: {
    base:     'var(--my-glass)',
    elevated: 'var(--my-glass-strong-solid)',
    high:     'var(--my-glass-strong)',
  },
  border: {
    subtle: 'var(--my-track)',
    medium: 'color-mix(in srgb, var(--my-text) 22%, transparent)',
    glass:  'var(--my-border)',
  },
  accent: {
    default: 'var(--my-accent)',
    /** Acento para texto e íconos (sobre el vidrio o un fondo teñido con el acento): un poco mezclado con el texto
     *  del tema para llegar a AA en los dos */
    ink:     'color-mix(in srgb, var(--my-accent) 75%, var(--my-text))',
    on:      'var(--my-on-accent)',
    soft:    'color-mix(in srgb, var(--my-accent) 14%, transparent)',
    muted:   'color-mix(in srgb, var(--my-accent) 6%, transparent)',
    glow:    'var(--my-glow)',
  },
  area: {
    money:  'var(--life-money)',
    goals:  'var(--life-goals)',
    habits: 'var(--life-habits)',
    brain:  'var(--life-brain)',
  },
  semantic: {
    success: 'var(--my-ok)',
    warning: 'var(--my-warn)',
    error:   'var(--my-danger)',
    info:    'var(--life-goals)',
  },
  text: {
    primary:    'var(--my-text)',
    secondary:  'var(--my-muted)',
    tertiary:   'var(--my-subtle)',
    quaternary: 'color-mix(in srgb, var(--my-text) 18%, transparent)',
  },
} as const

export const font = 'var(--my-font-ui)'
export const fontDisplay = 'var(--my-font-display)'

export const radius = {
  sm:   '12px',
  md:   'var(--my-r-field)',
  lg:   '20px',
  xl:   'var(--my-r-card)',
  '2xl': 'var(--my-r-hero)',
  full: 'var(--my-r-pill)',
} as const

export const shadow = {
  card:      'var(--my-inset-top)',
  elevated:  'var(--my-shadow-float)',
  coralGlow: '0 8px 24px -10px var(--my-glow)',
  innerTop:  'var(--my-inset-top)',
} as const
