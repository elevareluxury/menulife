import type { ReactNode } from 'react'

export type ServiceBadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'purple'

const VARIANT_STYLES: Record<ServiceBadgeVariant, { color: string; background: string }> = {
  success: { color: '#22C55E', background: 'rgba(34,197,94,0.12)'    },
  warning: { color: '#F59E0B', background: 'rgba(245,158,11,0.12)'   },
  error:   { color: '#EF4444', background: 'rgba(239,68,68,0.12)'    },
  neutral: { color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' },
  info:    { color: '#3B82F6', background: 'rgba(59,130,246,0.12)'   },
  purple:  { color: '#8B5CF6', background: 'rgba(139,92,246,0.12)'   },
}

interface ServiceBadgeProps {
  variant?: ServiceBadgeVariant
  size?: 'xs' | 'sm'
  icon?: ReactNode
  children: ReactNode
}

export function ServiceBadge({
  variant = 'neutral',
  size = 'xs',
  icon,
  children,
}: ServiceBadgeProps) {
  const { color, background } = VARIANT_STYLES[variant]
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold rounded-full flex-shrink-0"
      style={{
        color,
        background,
        fontSize:  size === 'sm' ? '11px' : '10px',
        padding:   size === 'sm' ? '3px 9px' : '2px 7px',
      }}
    >
      {icon}
      {children}
    </span>
  )
}
