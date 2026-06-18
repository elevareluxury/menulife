import type { LucideIcon } from 'lucide-react'
import { colors, font, radius } from '../tokens'

interface LifeEmptyStateProps {
  icon: LucideIcon
  iconColor?: string
  title: string
  subtitle: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function LifeEmptyState({
  icon: Icon,
  iconColor = colors.accent.default,
  title,
  subtitle,
  action,
}: LifeEmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: '24px 16px 8px', gap: '10px',
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: radius.md,
        background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '4px',
      }}>
        <Icon size={22} style={{ color: iconColor, opacity: 0.7 }} strokeWidth={1.8} />
      </div>
      <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.secondary, margin: 0 }}>
        {title}
      </p>
      <p style={{ fontFamily: font, fontSize: '12px', fontWeight: 500, color: colors.text.tertiary, margin: 0, lineHeight: 1.5 }}>
        {subtitle}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '6px',
            padding: '8px 18px',
            borderRadius: radius.full,
            background: colors.accent.soft,
            border: `1px solid ${colors.accent.soft}`,
            color: colors.accent.default,
            fontFamily: font, fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,112,90,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = colors.accent.soft }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
