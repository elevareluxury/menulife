import { useMemo } from 'react'
import type { ServiceBooking, ServiceBlock } from '../../types/booking'
import { BOOKING_STATUS_CONFIG } from '../../types/booking'
import {
  getLocalDateStr, addDays, startOfMonthInTz, startOfWeekInTz, daysInMonth,
} from '../../utils/timezone'

interface MonthViewProps {
  date: Date
  bookings: ServiceBooking[]
  blocks: ServiceBlock[]
  timezone: string
  selectedId?: string | null
  onBookingClick: (b: ServiceBooking) => void
  onDayClick: (day: Date) => void
}

export function MonthView({
  date,
  bookings,
  blocks,
  timezone,
  selectedId,
  onBookingClick,
  onDayClick,
}: MonthViewProps) {
  const now = new Date()
  const todayStr = getLocalDateStr(now, timezone)

  const { calendarDays } = useMemo(() => {
    const monthStart = startOfMonthInTz(date, timezone)
    const firstMonday = startOfWeekInTz(monthStart, timezone)
    const days = daysInMonth(date, timezone)
    const totalDays = Math.ceil((days + (firstMonday < monthStart ? (monthStart.getTime() - firstMonday.getTime()) / 86_400_000 : 0)) / 7) * 7
    const calendarDays = Array.from({ length: Math.max(35, totalDays) }, (_, i) => addDays(firstMonday, i))
    return { monthStart, calendarDays }
  }, [date, timezone])

  const monthStr = getLocalDateStr(date, timezone).slice(0, 7)

  function getDayItems(day: Date) {
    const dayStr = getLocalDateStr(day, timezone)
    const dayBookings = bookings.filter(b => getLocalDateStr(b.starts_at, timezone) === dayStr)
    const dayBlocks   = blocks.filter(b => getLocalDateStr(b.starts_at, timezone) === dayStr)
    return { dayBookings, dayBlocks }
  }

  const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="flex-1 flex flex-col select-none overflow-hidden" style={{ background: '#0F1115' }}>
      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {d}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {calendarDays.map((day, i) => {
          const dayStr     = getLocalDateStr(day, timezone)
          const isThisMonth = dayStr.slice(0, 7) === monthStr
          const isToday     = dayStr === todayStr
          const dayNum      = parseInt(dayStr.slice(8, 10), 10)
          const { dayBookings, dayBlocks } = getDayItems(day)

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className="relative flex flex-col items-start p-1.5 text-left transition-colors duration-150"
              style={{
                borderRight: (i + 1) % 7 === 0 ? undefined : '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                minHeight: '90px',
                background: isToday ? 'rgba(244,112,90,0.04)' : 'transparent',
              }}
            >
              {/* Day number */}
              <span
                className="w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold mb-1 flex-shrink-0"
                style={{
                  background: isToday ? '#F4705A' : 'transparent',
                  color: isToday ? '#fff' : isThisMonth ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                }}
              >
                {dayNum}
              </span>

              {/* Bookings pills */}
              <div className="w-full space-y-0.5 overflow-hidden">
                {dayBlocks.slice(0, 1).map(block => (
                  <div
                    key={block.id}
                    className="w-full px-1.5 py-0.5 rounded text-[10px] font-medium truncate"
                    style={{ background: `${block.color}20`, color: block.color }}
                  >
                    {block.title}
                  </div>
                ))}
                {dayBookings.slice(0, 3).map(b => {
                  const color = b.catalog?.color ?? BOOKING_STATUS_CONFIG[b.status].color
                  const label = b.client_name ?? b.catalog?.name ?? 'Reserva'
                  return (
                    <button
                      key={b.id}
                      onClick={e => { e.stopPropagation(); onBookingClick(b) }}
                      className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-left transition-all"
                      style={{
                        background: b.id === selectedId ? `${color}30` : `${color}15`,
                        color,
                        border: b.id === selectedId ? `1px solid ${color}60` : undefined,
                      }}
                    >
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="truncate">{label}</span>
                    </button>
                  )
                })}
                {dayBookings.length > 3 && (
                  <p className="text-[10px] px-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    +{dayBookings.length - 3} más
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
