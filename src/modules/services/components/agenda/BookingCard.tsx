import { cn } from '@/lib/utils'
import { BOOKING_STATUS_CONFIG, type ServiceBooking } from '../../types/booking'
import { formatLocalTime } from '../../utils/timezone'

interface BookingCardProps {
  booking: ServiceBooking
  timezone: string
  isSelected?: boolean
  compact?: boolean
  style?: React.CSSProperties
  onClick: (booking: ServiceBooking) => void
}

export function BookingCard({
  booking,
  timezone,
  isSelected = false,
  compact = false,
  style,
  onClick,
}: BookingCardProps) {
  const cfg   = BOOKING_STATUS_CONFIG[booking.status]
  const color = booking.catalog?.color ?? cfg.color
  const label = booking.title ?? booking.client_name ?? 'Sin nombre'
  const startStr = formatLocalTime(booking.starts_at, timezone)
  const endStr   = formatLocalTime(booking.ends_at, timezone)
  const service  = booking.catalog?.name

  return (
    <button
      onClick={() => onClick(booking)}
      className={cn(
        'w-full text-left rounded-lg overflow-hidden transition-all duration-150',
        isSelected ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-transparent' : 'hover:brightness-110',
      )}
      style={{
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
        ...style,
      }}
    >
      <div className={cn('px-2', compact ? 'py-0.5' : 'py-1.5')}>
        <p
          className="font-semibold leading-tight truncate"
          style={{ fontSize: compact ? '11px' : '12px', color: '#fff' }}
        >
          {label}
        </p>
        {!compact && service && (
          <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {service}
          </p>
        )}
        {!compact && (
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {startStr} – {endStr}
          </p>
        )}
      </div>
    </button>
  )
}
