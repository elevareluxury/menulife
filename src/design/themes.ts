// Temas y acentos del sistema de diseño (§3). Los valores viven en tokens.css; acá sólo los nombres.
export const MYCEN_THEMES = ['universo', 'amanecer'] as const
export type MycenTheme = (typeof MYCEN_THEMES)[number]

export const MYCEN_ACCENTS = ['plasma', 'ion', 'nebulosa', 'aurora'] as const
export type MycenAccent = (typeof MYCEN_ACCENTS)[number]
