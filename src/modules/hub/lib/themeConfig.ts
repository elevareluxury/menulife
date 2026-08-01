export type HubTheme = 'dark' | 'light' | 'warm' | 'blue'

/** Mirrors the internal C object used throughout HubPublicPage */
export interface HubC {
  bg:   string
  bg2:  string
  sur:  string
  sur2: string
  bdr:  string
  bdr2: string
  acc:  string
  acc2: string
  grn:  string
  red:  string
  t1:   string
  t2:   string
  t3:   string
  t4:   string
  card: string
  isDark: boolean
}

export interface ThemeMeta {
  id:              HubTheme
  label:           string
  description:     string
  previewGradient: string
  defaultAccent:   string
  fontTitleFamily: string
  fontTitleWeight: number
  fontBodyFamily:  string
}

/**
 * NULL_C = exact current production values.
 * Used when theme is null/undefined — guarantees zero visual regression
 * for existing users who never changed their theme.
 */
export const NULL_C: HubC = {
  bg:   '#06080F',
  bg2:  '#0A0D16',
  sur:  'rgba(255,255,255,0.04)',
  sur2: 'rgba(255,255,255,0.07)',
  bdr:  'rgba(255,255,255,0.08)',
  bdr2: 'rgba(255,255,255,0.16)',
  acc:  '#F59E0B',
  acc2: '#FCD34D',
  grn:  '#10B981',
  red:  '#EF4444',
  t1:   '#F8F9FA',
  t2:   'rgba(248,249,250,0.60)',
  t3:   'rgba(248,249,250,0.32)',
  t4:   'rgba(248,249,250,0.14)',
  card: '#111318',
  isDark: true,
}

type ThemeBuilder = (accent?: string | null) => HubC

const THEME_BUILDERS: Record<HubTheme, ThemeBuilder> = {
  dark: (accent) => {
    const a = accent || '#F4705A'
    return {
      bg: '#0A0A0A', bg2: '#111111',
      sur: 'rgba(255,255,255,0.06)', sur2: 'rgba(255,255,255,0.09)',
      bdr: 'rgba(255,255,255,0.1)',  bdr2: 'rgba(255,255,255,0.2)',
      acc: a, acc2: a,
      grn: '#10B981', red: '#EF4444',
      t1: '#FFFFFF',
      t2: 'rgba(255,255,255,0.6)',
      t3: 'rgba(255,255,255,0.35)',
      t4: 'rgba(255,255,255,0.15)',
      card: 'rgba(255,255,255,0.04)',
      isDark: true,
    }
  },
  light: (accent) => {
    const a = accent || '#1A1A1A'
    return {
      bg: '#FAFAFA', bg2: '#F2F2F2',
      sur: '#FFFFFF', sur2: '#F5F5F5',
      bdr: '#E5E5E5', bdr2: '#CCCCCC',
      acc: a, acc2: '#444444',
      grn: '#059669', red: '#DC2626',
      t1: '#1A1A1A',
      t2: 'rgba(26,26,26,0.6)',
      t3: 'rgba(26,26,26,0.4)',
      t4: 'rgba(26,26,26,0.2)',
      card: '#FFFFFF',
      isDark: false,
    }
  },
  warm: (accent) => {
    const a = accent || '#8B6914'
    return {
      bg: '#F5F0E8', bg2: '#EDE7D8',
      sur: '#FFFFFF', sur2: '#F8F4EC',
      bdr: '#D4C5A9', bdr2: '#B8A880',
      acc: a, acc2: '#A07A20',
      grn: '#2D6A4F', red: '#C1121F',
      t1: '#2C2416',
      t2: 'rgba(44,36,22,0.65)',
      t3: 'rgba(44,36,22,0.45)',
      t4: 'rgba(44,36,22,0.25)',
      card: '#FFFFFF',
      isDark: false,
    }
  },
  blue: (accent) => {
    const a = accent || '#60B4D8'
    return {
      bg: '#0D1B2A', bg2: '#0A1520',
      sur: 'rgba(96,180,216,0.08)', sur2: 'rgba(96,180,216,0.12)',
      bdr: 'rgba(96,180,216,0.2)',  bdr2: 'rgba(96,180,216,0.35)',
      acc: a, acc2: '#7BC1DE',
      grn: '#10B981', red: '#EF4444',
      t1: '#E8F4F8',
      t2: 'rgba(232,244,248,0.65)',
      t3: 'rgba(232,244,248,0.4)',
      t4: 'rgba(232,244,248,0.2)',
      card: 'rgba(96,180,216,0.06)',
      isDark: true,
    }
  },
}

/**
 * Returns the HubC palette for the given theme.
 * theme = null/undefined → NULL_C (exact current production look, zero regression).
 */
export function buildHubC(
  theme: string | null | undefined,
  accentColor?: string | null,
): HubC {
  if (!theme || !(theme in THEME_BUILDERS)) return NULL_C
  return THEME_BUILDERS[theme as HubTheme](accentColor)
}

export function isValidTheme(t: string | null | undefined): t is HubTheme {
  return t === 'dark' || t === 'light' || t === 'warm' || t === 'blue'
}

export const THEME_META: Record<HubTheme, ThemeMeta> = {
  dark: {
    id: 'dark',
    label: 'Oscuro Premium',
    description: 'Elegante, moderno',
    previewGradient: 'linear-gradient(135deg, #0A0A0A 0%, #F4705A 100%)',
    defaultAccent: '#F4705A',
    fontTitleFamily: "'Syne', system-ui, sans-serif",
    fontTitleWeight: 800,
    fontBodyFamily: "'DM Sans', system-ui, sans-serif",
  },
  light: {
    id: 'light',
    label: 'Claro Minimal',
    description: 'Limpio, tipográfico',
    previewGradient: 'linear-gradient(135deg, #FAFAFA 0%, #1A1A1A 100%)',
    defaultAccent: '#1A1A1A',
    fontTitleFamily: "'Inter', system-ui, sans-serif",
    fontTitleWeight: 600,
    fontBodyFamily: "'Inter', system-ui, sans-serif",
  },
  warm: {
    id: 'warm',
    label: 'Neutro Cálido',
    description: 'Sofisticado, atemporal',
    previewGradient: 'linear-gradient(135deg, #F5F0E8 0%, #8B6914 100%)',
    defaultAccent: '#8B6914',
    fontTitleFamily: "'Playfair Display', Georgia, serif",
    fontTitleWeight: 700,
    fontBodyFamily: "'Source Sans 3', system-ui, sans-serif",
  },
  blue: {
    id: 'blue',
    label: 'Oscuro Azul',
    description: 'Profundo, sereno',
    previewGradient: 'linear-gradient(135deg, #0D1B2A 0%, #60B4D8 100%)',
    defaultAccent: '#60B4D8',
    fontTitleFamily: "'Space Grotesk', system-ui, sans-serif",
    fontTitleWeight: 700,
    fontBodyFamily: "'DM Sans', system-ui, sans-serif",
  },
}

/** Body font family per theme (fallback to DM Sans for null/undefined) */
export function getBodyFont(theme: string | null | undefined): string {
  if (isValidTheme(theme)) return THEME_META[theme].fontBodyFamily
  return "'DM Sans', system-ui, sans-serif"
}
