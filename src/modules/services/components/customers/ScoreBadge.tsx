import { TIER_CONFIG } from '../../score/scoreConfig'
import type { CustomerScore } from '../../score/scoreConfig'

interface ScoreBadgeProps {
  score: CustomerScore
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const cfg = TIER_CONFIG[score.tier]
  const isSmall = size === 'sm'

  return (
    <span
      className="inline-flex items-center gap-1 font-bold rounded-full flex-shrink-0"
      style={{
        background:  cfg.bg,
        color:       cfg.color,
        fontSize:    isSmall ? '10px' : '12px',
        padding:     isSmall ? '2px 8px' : '4px 10px',
      }}
    >
      {cfg.emoji} {cfg.label}
    </span>
  )
}
