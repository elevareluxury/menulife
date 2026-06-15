import { BOOKING_STATUS_CONFIG, type BookingStatus } from '../../types/booking'

interface StatusBadgeProps {
  status: BookingStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = BOOKING_STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold rounded-full"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 7px' : '3px 9px',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}
