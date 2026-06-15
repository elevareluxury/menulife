import { BookingCard } from './BookingCard'
import type { ServiceBooking, ServiceBlock } from '../../types/booking'
import { getLocalHourMinute, getLocalDateStr, addDays, isSameLocalDay } from '../../utils/timezone'

const HOUR_START  = 8
const HOUR_END    = 22
const HOUR_HEIGHT = 64

const DAY_ABBR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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
      return new Date(sorted.find(x => x.id === lastId)!.ends_at).getTime() <= startMs
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
    for (const o of sorted) {
      if (o.id === b.id) continue
      if (new Date(o.starts_at).getTime() < endMs && new Date(o.ends_at).getTime() > startMs)
        maxCol = Math.max(maxCol, assigned.get(o.id)!)
    }
    result.set(b.id, { col: assigned.get(b.id)!, totalCols: maxCol + 1 })
  }
  return result
}

interface WeekViewProps {
  weekStart: Date
  bookings: ServiceBooking[]
  blocks: ServiceBlock[]
  timezone: string
  selectedId?: string | null
  onBookingClick: (b: ServiceBooking) => void
  onSlotClick: (date: Date, hour: number, minute: number) => void
}

export function WeekView({
  weekStart,
  bookings,
  blocks,
  timezone,
  selectedId,
  onBookingClick,
  onSlotClick,
}: WeekViewProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const days  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT

  const now = new Date()
  const nowDateStr = getLocalDateStr(now, timezone)
  const { hour: nowHour, minute: nowMin } = getLocalHourMinute(now, timezone)
  const nowTop = ((nowHour - HOUR_START) * 60 + nowMin) * (HOUR_HEIGHT / 60)

  function getDayBookings(day: Date) {
    const dayStr = getLocalDateStr(day, timezone)
    return bookings.filter(b => getLocalDateStr(b.starts_at, timezone) === dayStr)
  }

  function getDayBlocks(day: Date) {
    return blocks.filter(b =>
      isSameLocalDay(b.starts_at, day, timezone) ||
      isSameLocalDay(b.ends_at, day, timezone) ||
      (new Date(b.starts_at) <= day && new Date(b.ends_at) >= day),
    )
  }

  function bookingTopAndHeight(b: ServiceBooking) {
    const { hour, minute } = getLocalHourMinute(b.starts_at, timezone)
    return {
      top: Math.max(0, ((hour - HOUR_START) * 60 + minute) * (HOUR_HEIGHT / 60)),
      height: Math.max(28, b.duration_minutes * (HOUR_HEIGHT / 60)),
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0F1115' }}>
      {/* Day headers */}
      <div className="flex sticky top-0 z-20" style={{ background: '#13161C', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => {
          const dayStr  = getLocalDateStr(day, timezone)
          const isToday = dayStr === nowDateStr
          const dayNum  = parseInt(dayStr.slice(8, 10), 10)
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center py-2"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isToday ? '#F4705A' : 'rgba(255,255,255,0.35)' }}>
                {DAY_ABBR[i]}
              </span>
              <span
                className="text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  color: isToday ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isToday ? '#F4705A' : 'transparent',
                }}
              >
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex" style={{ height: totalHeight }}>

        {/* Time axis */}
        <div className="w-14 flex-shrink-0 relative" style={{ background: '#13161C', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          {hours.map(h => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-2"
              style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <span className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {String(h).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const dayStr    = getLocalDateStr(day, timezone)
          const isToday   = dayStr === nowDateStr
          const dayBks    = getDayBookings(day)
          const dayBlocks = getDayBlocks(day)
          const layout    = computeLayout(dayBks)

          return (
            <div
              key={di}
              className="flex-1 relative cursor-pointer"
              style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', height: totalHeight }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const minutesFromStart = (y / HOUR_HEIGHT) * 60
                const rounded  = Math.round(minutesFromStart / 30) * 30
                const hour   = HOUR_START + Math.floor(rounded / 60)
                const minute = rounded % 60
                onSlotClick(day, Math.min(hour, HOUR_END - 1), minute)
              }}
            >
              {/* Grid lines */}
              {hours.map(h => (
                <div key={h} className="absolute left-0 right-0" style={{ top: (h - HOUR_START) * HOUR_HEIGHT, borderTop: '1px solid rgba(255,255,255,0.03)' }} />
              ))}
              {hours.map(h => (
                <div key={`${h}h`} className="absolute left-0 right-0" style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2, borderTop: '1px dashed rgba(255,255,255,0.015)' }} />
              ))}

              {/* Current time */}
              {isToday && nowHour >= HOUR_START && nowHour < HOUR_END && (
                <div className="absolute left-0 right-0 z-10" style={{ top: nowTop, borderTop: '1.5px solid rgba(239,68,68,0.7)' }} />
              )}

              {/* Blocks */}
              {dayBlocks.map(block => {
                const { hour: bh, minute: bm } = getLocalHourMinute(block.starts_at, timezone)
                const { hour: eh, minute: em } = getLocalHourMinute(block.ends_at, timezone)
                const top = Math.max(0, ((bh - HOUR_START) * 60 + bm) * (HOUR_HEIGHT / 60))
                const h = ((eh - bh) * 60 + (em - bm)) * (HOUR_HEIGHT / 60)
                return (
                  <div
                    key={block.id}
                    className="absolute inset-x-0.5 rounded flex items-start px-1 py-0.5"
                    style={{ top, height: Math.max(18, h), background: `${block.color}18`, border: `1px dashed ${block.color}50`, zIndex: 1 }}
                  >
                    <span className="text-[9px] truncate" style={{ color: block.color }}>{block.title}</span>
                  </div>
                )
              })}

              {/* Bookings */}
              {dayBks.map(b => {
                const l = layout.get(b.id) ?? { col: 0, totalCols: 1 }
                const { top, height } = bookingTopAndHeight(b)
                return (
                  <div
                    key={b.id}
                    className="absolute"
                    style={{
                      top: top + 1,
                      height: height - 2,
                      left: `calc(${l.col} * 100% / ${l.totalCols} + 1px)`,
                      width: `calc(100% / ${l.totalCols} - 2px)`,
                      zIndex: 2,
                    }}
                    onClick={e => { e.stopPropagation(); onBookingClick(b) }}
                  >
                    <BookingCard
                      booking={b}
                      timezone={timezone}
                      isSelected={b.id === selectedId}
                      compact={height < 40}
                      style={{ height: '100%' }}
                      onClick={onBookingClick}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
