import { Sparkles, ArrowRight } from 'lucide-react'
import { colors, font, radius, tint } from '../design-system'
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
        background: tint(colors.accent.default, 10),
        border: `1px solid ${tint(colors.accent.default, 35)}`,
        cursor: 'pointer', textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: colors.accent.default,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Sparkles size={18} color={colors.accent.on} />
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
      <ArrowRight size={18} style={{ color: colors.area.brain, flexShrink: 0 }} />
    </button>
  )
}
