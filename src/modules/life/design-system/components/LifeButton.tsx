import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { colors, font, radius, shadow } from '../tokens'

interface LifeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const sizeStyles = {
  sm: { padding: '7px 16px', fontSize: '12px' },
  md: { padding: '10px 22px', fontSize: '14px' },
  lg: { padding: '14px 28px', fontSize: '15px' },
} as const

export function LifeButton({ variant = 'primary', size = 'md', children, style, ...rest }: LifeButtonProps) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    borderRadius: radius.full,
    fontFamily: font, fontWeight: 700, letterSpacing: '0.01em',
    cursor: 'pointer', border: 'none',
    transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
    ...sizeStyles[size],
  }

  const variantStyles = {
    primary: {
      background: `linear-gradient(135deg, ${colors.accent.default} 0%, #E05A45 100%)`,
      color: '#fff',
      boxShadow: shadow.coralGlow,
    },
    secondary: {
      background: colors.surface.elevated,
      color: colors.text.secondary,
      border: `1px solid ${colors.border.medium}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.accent.default,
    },
  }

  return (
    <button
      {...rest}
      style={{
        ...base,
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = '' }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = '' }}
    >
      {children}
    </button>
  )
}
