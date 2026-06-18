import type { ReactNode, CSSProperties, MouseEventHandler } from 'react'
import { colors, radius, shadow } from '../tokens'

interface LifeCardProps {
  children: ReactNode
  variant?: 'default' | 'glass' | 'elevated'
  onClick?: MouseEventHandler<HTMLDivElement>
  padding?: string
  style?: CSSProperties
}

const variantStyles: Record<NonNullable<LifeCardProps['variant']>, CSSProperties> = {
  default: {
    background: colors.surface.base,
    border: `1px solid ${colors.border.subtle}`,
  },
  glass: {
    background: 'rgba(19,22,28,0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border.glass}`,
    boxShadow: shadow.innerTop,
  },
  elevated: {
    background: colors.surface.elevated,
    border: `1px solid ${colors.border.medium}`,
    boxShadow: shadow.elevated,
  },
}

export function LifeCard({
  children,
  variant = 'default',
  onClick,
  padding = '18px',
  style,
}: LifeCardProps) {
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>) } : undefined}
      style={{
        borderRadius: radius.xl,
        padding,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, background 0.15s ease',
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.transform = 'translateY(-1px)' } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.transform = '' } : undefined}
    >
      {children}
    </div>
  )
}
