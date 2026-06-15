import { useMemo, useRef, useEffect } from 'react'
import { BookingCard } from './BookingCard'
import type { ServiceBooking, ServiceBlock } from '../../types/booking'
import { getLocalHourMinute, getLocalDateStr, isSameLocalDay } from '../../utils/timezone'

const HOUR_START  = 8
const HOUR_END    = 22
const HOUR_HEIGHT = 64  // px per hour → ~1.07px per minute

interface Layout { col: number; totalCols: number }

function computeLayout(bookings: ServiceBooking[]): Map<string, Layout> {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  )
  const columns: string[][] = []
  const assigned = new Map<string, number>()

  for (const b of sorted) {
    const startMs = new Date(b.starts_at).getTime()
    let col = columns.findIndex(col => {
      const lastId = col[col.length - 1]
      if (!lastId) return true
      const last = sorted.find(x => x.id === lastId)!
      return new Date(last.ends_at).getTime() <= startMs
    })
    if (col === -1) { col = columns.length; columns.push([]) }
    columns[col].push(b.id)
    assigned.set(b.id, col)
  }

  const result = new Map<string, Layout>()
  for (const b of sorted) {
    const startMs = new Date(b.starts_at).getTime()
    const endMs   = new Date(b.ends_at).getTime()
    let maxCol = assigned.get(b.id)!
    for (const other of sorted) {
      if (other.id === b.id) continue
      const os = new Date(other.starts_at).getTime()
      const oe = new Date(other.ends_at).getTime()
      if (os < endMs && oe > startMs) maxCol = Math.max(maxCol, assigned.get(other.id)!)
    }
    result.set(b.id, { col: assigned.get(b.id)!, totalCols: maxCol + 1 })
  }
  return result
}

interface DayViewProps {
  date: Date
  bookings: ServiceBooking[]
  blocks: ServiceBlock[]
  timezone: string
  selectedId?: string | null
  onBookingClick: (b: ServiceBooking) => void
  onSlotClick: (date: Date, hour: number, minute: number) => void
}

export function DayView({
  date,
  bookings,
  blocks,
  timezone,
  selectedId,
  onBookingClick,
  onSlotClick,
}: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  // Filter to this day
  const todayStr = getLocalDateStr(date, timezone)
  const dayBookings = bookings.filter(b => getLocalDateStr(b.starts_at, timezone) === todayStr)
  const dayBlocks   = blocks.filter(b =>
    isSameLocalDay(b.starts_at, date, timezone) ||
    isSameLocalDay(b.ends_at,   date, timezone) ||
    (new Date(b.starts_at) <= date && new Date(b.ends_at) >= date),
  )

  const layout = useMemo(() => computeLayout(dayBookings), [dayBookings])

  // Scroll to current hour on mount
  useEffect(() => {
    const { hour } = getLocalHourMinute(new Date(), timezone)
    const scrollTo = Math.max(0, (hour - HOUR_START - 1) * HOUR_HEIGHT)
    containerRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' })
  }, [timezone])

  function bookingTop(b: ServiceBooking) {
    const { hour, minute } = getLocalHourMinute(b.starts_at, timezone)
    return ((hour - HOUR_START) * 60 + minute) * (HOUR_HEIGHT / 60)
  }

  function bookingHeight(b: ServiceBooking) {
    return Math.max(28, b.duration_minutes * (HOUR_HEIGHT / 60))
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop ?? 0)
    const minutesFromStart = (y / HOUR_HEIGHT) * 60
    const roundedMinutes   = Math.round(minutesFromStart / 30) * 30
    const hour   = HOUR_START + Math.floor(roundedMinutes / 60)
    const minute = roundedMinutes % 60
    onSlotClick(date, Math.min(hour, HOUR_END - 1), minute)
  }

  // Current time indicator
  const now = new Date()
  const { hour: nowHour, minute: nowMin } = getLocalHourMinute(now, timezone)
  const isToday  = getLocalDateStr(now, timezone) === todayStr
  const nowTop   = ((nowHour - HOUR_START) * 60 + nowMin) * (HOUR_HEIGHT / 60)
  const showNow  = isToday && nowHour >= HOUR_START && nowHour < HOUR_END

  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto select-none" style={{ background: '#0F1115' }}>
      <div className="flex" style={{ minHeight: totalHeight }}>

        {/* Time axis */}
        <div className="w-14 flex-shrink-0 relative" style={{ background: '#13161C', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-2"
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {String(h).padStart(2, '0')}
              </span>
            </div>
          ))}
          {showNow && (
            <div
              className="absolute w-2 h-2 rounded-full -right-1 z-10"
              style={{ top: nowTop - 4, background: '#EF4444' }}
            />
          )}
        </div>

        {/* Grid + bookings */}
        <div className="flex-1 relative cursor-pointer" style={{ height: totalHeight }} onClick={handleGridClick}>

          {/* Hour lines */}
          {hours.map(h => (
            <div
              key={h}
              className="absolute left-0 right-0"
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT, borderTop: '1px solid rgba(255,255,255,0.04)' }}
            />
          ))}
          {/* Half-hour lines */}
          {hours.map(h => (
            <div
              key={`${h}h`}
              className="absolute left-0 right-0"
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2, borderTop: '1px dashed rgba(255,255,255,0.02)' }}
            />
          ))}

          {/* Current time line */}
          {showNow && (
            <div
              className="absolute left-0 right-0 z-10"
              style={{ top: nowTop, borderTop: '1.5px solid #EF4444', opacity: 0.8 }}
            />
          )}

          {/* Blocks */}
          {dayBlocks.map(block => {
            const { hour: bh, minute: bm } = getLocalHourMinute(block.starts_at, timezone)
            const { hour: eh, minute: em } = getLocalHourMinute(block.ends_at, timezone)
            const top = Math.max(0, ((bh - HOUR_START) * 60 + bm) * (HOUR_HEIGHT / 60))
            const height = ((eh - bh) * 60 + (em - bm)) * (HOUR_HEIGHT / 60)
            return (
              <div
                key={block.id}
                className="absolute inset-x-1 rounded-lg flex items-start px-2 py-1"
                style={{
                  top,
                  height: Math.max(24, height),
                  background: `${block.color}20`,
                  border: `1px dashed ${block.color}60`,
                  zIndex: 1,
                }}
              >
                <span className="text-[10px] font-medium truncate" style={{ color: block.color }}>
                  {block.title}
                </span>
              </div>
            )
          })}

          {/* Bookings */}
          {dayBookings.map(b => {
            const l      = layout.get(b.id) ?? { col: 0, totalCols: 1 }
            const top    = bookingTop(b)
            const height = bookingHeight(b)
            const width  = `calc((100% - 4px) / ${l.totalCols})`
            const left   = `calc(${l.col} * (100% - 4px) / ${l.totalCols} + 2px)`
            return (
              <div
                key={b.id}
                className="absolute"
                style={{ top: top + 1, height: height - 2, width, left, zIndex: 2 }}
                onClick={e => { e.stopPropagation(); onBookingClick(b) }}
              >
                <BookingCard
                  booking={b}
                  timezone={timezone}
                  isSelected={b.id === selectedId}
                  compact={height < 48}
                  style={{ height: '100%' }}
                  onClick={onBookingClick}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
