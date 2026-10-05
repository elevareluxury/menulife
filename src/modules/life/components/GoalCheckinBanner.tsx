import { Sparkles, ArrowRight } from 'lucide-react'
import { colors, font, radius } from '../design-system'
import { isCheckinDay } from '../hooks/useGoalCheckins'

interface Props {
  pendingCount: number
  onCheckIn: () => void
}

export function GoalCheckinBanner({ pendingCount, onCheckIn }: Props) {
  if (!isCheckinDay() || pendingCount === 0) return null

  const label = pendingCount === 1
    ? '1 meta pendiente de check-in'
    : `${pendingCount} metas pendientes de check-in`

  return (
    <button
      onClick={onCheckIn}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', margin: '0 0 16px',
        borderRadius: radius.xl, width: '100%',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(129,140,248,0.10) 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
        cursor: 'pointer', textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={18} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: font, fontSize: 14, fontWeight: 700,
          color: colors.text.primary, margin: 0,
        }}>
          Es momento de tu check-in semanal
        </p>
        <p style={{
          fontFamily: font, fontSize: 12,
          color: colors.text.tertiary, margin: '2px 0 0',
        }}>
          {label}
        </p>
      </div>
      <ArrowRight size={18} style={{ color: '#818CF8', flexShrink: 0 }} />
    </button>
  )
}
