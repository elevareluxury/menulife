import type { AllowanceSummary } from '../../membership/membershipTypes'
import { ALLOWANCE_TYPE_CONFIG } from '../../membership/membershipTypes'

interface AllowanceBarProps {
  summary: AllowanceSummary
}

const FILLED   = '■'
const EMPTY    = '□'
const MAX_DOTS = 8

export function AllowanceBar({ summary }: AllowanceBarProps) {
  const { allowance, used, remaining, percentage } = summary
  const cfg       = ALLOWANCE_TYPE_CONFIG[allowance.allowance_type]
  const isUnlimited = allowance.allowance_type === 'unlimited' || allowance.allowance_limit === null
  const showDots    = !isUnlimited && allowance.allowance_limit! <= MAX_DOTS

  const usedColor = remaining === 0 ? '#EF4444' : percentage >= 75 ? '#F59E0B' : '#22C55E'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs flex-shrink-0">{cfg.emoji}</span>
          <span className="text-xs font-semibold text-white truncate">{allowance.label || cfg.label}</span>
        </div>
        <span
          className="text-xs font-bold flex-shrink-0"
          style={{ color: isUnlimited ? 'rgba(255,255,255,0.45)' : usedColor }}
        >
          {isUnlimited
            ? `${used} usados`
            : `${used}/${allowance.allowance_limit} ${allowance.unit}`
          }
        </span>
      </div>

      {!isUnlimited && (
        showDots ? (
          <div className="flex gap-0.5">
            {Array.from({ length: allowance.allowance_limit! }).map((_, i) => (
              <span
                key={i}
                className="text-sm leading-none"
                style={{ color: i < Math.floor(used) ? usedColor : 'rgba(255,255,255,0.15)', fontFamily: 'monospace' }}
              >
                {i < Math.floor(used) ? FILLED : EMPTY}
              </span>
            ))}
          </div>
        ) : (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%`, background: usedColor }}
            />
          </div>
        )
      )}
    </div>
  )
}
