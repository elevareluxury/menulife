import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { colors, font } from '../tokens'

interface LifeSectionHeaderProps {
  title: string
  action?: {
    label: string
    to?: string
    onClick?: () => void
  }
}

export function LifeSectionHeader({ title, action }: LifeSectionHeaderProps) {
  const navigate = useNavigate()

  function handleAction() {
    if (action?.to) navigate(action.to)
    else action?.onClick?.()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '14px',
    }}>
      <p style={{
        fontFamily: font,
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: colors.text.tertiary,
        margin: 0,
      }}>
        {title}
      </p>
      {action && (
        <button
          onClick={handleAction}
          style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            fontFamily: font,
            fontSize: '11px',
            fontWeight: 600,
            color: colors.accent.default,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            opacity: 0.85,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.85' }}
        >
          {action.label}
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
