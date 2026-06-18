// Design System tokens for Life OS — "Ambient Luxury Interface"
// Single source of truth: import from here, never hardcode values in components.

export const colors = {
  bg: '#0F1115',
  surface: {
    base:     '#13161C',
    elevated: '#1A1E26',
    high:     '#1E2330',
  },
  border: {
    subtle: 'rgba(255,255,255,0.06)',
    medium: 'rgba(255,255,255,0.10)',
    glass:  'rgba(255,255,255,0.07)',
  },
  accent: {
    default: '#F4705A',
    soft:    'rgba(244,112,90,0.12)',
    muted:   'rgba(244,112,90,0.05)',
    glow:    'rgba(244,112,90,0.28)',
  },
  area: {
    money:  '#22C55E',
    goals:  '#3B82F6',
    habits: '#F59E0B',
    brain:  '#8B5CF6',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error:   '#EF4444',
    info:    '#3B82F6',
  },
  text: {
    primary:    '#F5F7FA',
    secondary:  'rgba(255,255,255,0.55)',
    tertiary:   'rgba(255,255,255,0.30)',
    quaternary: 'rgba(255,255,255,0.14)',
  },
} as const

export const font = 'var(--font-jakarta)'

export const radius = {
  sm:   '12px',
  md:   '16px',
  lg:   '20px',
  xl:   '24px',
  '2xl': '28px',
  full: '9999px',
} as const

export const shadow = {
  card:      '0 2px 16px rgba(0,0,0,0.32)',
  elevated:  '0 8px 32px rgba(0,0,0,0.52)',
  coralGlow: '0 4px 24px rgba(244,112,90,0.28)',
  innerTop:  'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const
