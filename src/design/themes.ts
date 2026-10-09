// Temas y acentos del sistema de diseño (§3). Los valores viven en tokens.css; acá sólo los nombres.
export const MYCEN_THEMES = ['universo', 'amanecer'] as const
export type MycenTheme = (typeof MYCEN_THEMES)[number]

export const MYCEN_ACCENTS = ['plasma', 'ion', 'nebulosa', 'aurora'] as const
export type MycenAccent = (typeof MYCEN_ACCENTS)[number]

/** Valores de cada acento por tema (los mismos de tokens.css; un test verifica que coincidan). Sirven donde no hay
 *  CSS: la imagen al compartir (api/og), el QR y la conversión de colores libres de antes. */
export const ACCENT_COLORS: Record<MycenAccent, Record<MycenTheme, { accent: string; onAccent: string }>> = {
  plasma:   { universo: { accent: '#FF7A59', onAccent: '#05060F' }, amanecer: { accent: '#C8431F', onAccent: '#FFFFFF' } },
  ion:      { universo: { accent: '#7DD3FC', onAccent: '#05060F' }, amanecer: { accent: '#1D6FA5', onAccent: '#FFFFFF' } },
  nebulosa: { universo: { accent: '#C4B5FD', onAccent: '#05060F' }, amanecer: { accent: '#6D4AD1', onAccent: '#FFFFFF' } },
  aurora:   { universo: { accent: '#5EEAD4', onAccent: '#05060F' }, amanecer: { accent: '#0F7C6E', onAccent: '#FFFFFF' } },
}

/** Segundo color de la huella por tema (--my-secondary) */
export const SECONDARY_COLORS: Record<MycenTheme, string> = { universo: '#7DD3FC', amanecer: '#5B3FD1' }

/** Fondo de cada tema (--my-bg; un test verifica que coincidan): pinta html y body detrás de la app */
export const THEME_BG: Record<MycenTheme, string> = { universo: '#04050D', amanecer: '#FBF4EE' }

/** Texto principal y secundario de cada tema (--my-text / --my-muted; un test verifica que coincidan): para la imagen
 *  al compartir (api/og), donde no hay CSS */
export const THEME_TEXT: Record<MycenTheme, { text: string; muted: string }> = {
  universo: { text: '#EEF0FF', muted: '#B7BCD6' },
  amanecer: { text: '#1A1530', muted: '#4E4866' },
}

/** QR: siempre oscuro sobre claro (--my-qr-bg / --my-qr-fg; un test verifica que coincidan) */
export const QR_COLORS = { bg: '#FFFFFF', fg: '#04050D' } as const
