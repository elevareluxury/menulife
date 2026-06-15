import type { ServiceBooking, ServiceBlock } from '../../types/booking'
import type { ServiceResource } from '../../hooks/useServiceResources'
import { BOOKING_STATUS_CONFIG } from '../../types/booking'
import { getLocalHourMinute, getLocalDateStr, formatLocalTime } from '../../utils/timezone'

const HOUR_START = 8
const HOUR_END   = 22
const TOTAL_HOURS = HOUR_END - HOUR_START
const ROW_HEIGHT  = 52 // px per resource row
const COL_WIDTH   = 64 // px per hour

interface TimelineViewProps {
  date: Date
  bookings: ServiceBooking[]
  blocks: ServiceBlock[]
  resources: ServiceResource[]
  timezone: string
  selectedId?: string | null
  onBookingClick: (b: ServiceBooking) => void
  onSlotClick: (date: Date, hour: number, minute: number) => void
}

export function TimelineView({
  date,
  bookings,
  blocks,
  resources,
  timezone,
  selectedId,
  onBookingClick,
  onSlotClick,
}: TimelineViewProps) {
  const hours   = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i)
  const todayStr = getLocalDateStr(date, timezone)

  const now = new Date()
  const nowStr = getLocalDateStr(now, timezone)
  const { hour: nowHour, minute: nowMin } = getLocalHourMinute(now, timezone)
  const nowLeft = ((nowHour - HOUR_START) * 60 + nowMin) * (COL_WIDTH / 60)
  const isToday = nowStr === todayStr

  function getResourceBookings(rid: string) {
    return bookings.filter(b => {
      const dayStr = getLocalDateStr(b.starts_at, timezone)
      if (dayStr !== todayStr) return false
      return b.resources?.some(r => r.resource_id === rid)
    })
  }

  // Bookings without any resource
  const unassigned = bookings.filter(b => {
    const dayStr = getLocalDateStr(b.starts_at, timezone)
    if (dayStr !== todayStr) return false
    return !b.resources?.length
  })

  function bookingLeft(b: ServiceBooking) {
    const { hour, minute } = getLocalHourMinute(b.starts_at, timezone)
    return Math.max(0, ((hour - HOUR_START) * 60 + minute) * (COL_WIDTH / 60))
  }

  function bookingWidth(b: ServiceBooking) {
    return Math.max(30, b.duration_minutes * (COL_WIDTH / 60))
  }

  const rows: Array<{ id: string; label: string; color: string; bookingList: ServiceBooking[] }> = [
    ...resources.filter(r => r.is_active).map(r => ({
      id: r.id,
      label: r.name,
      color: r.color,
      bookingList: getResourceBookings(r.id),
    })),
    ...(unassigned.length > 0 ? [{ id: '_unassigned', label: 'Sin recurso', color: '#6B7280', bookingList: unassigned }] : []),
  ]

  const totalWidth = TOTAL_HOURS * COL_WIDTH

  return (
    <div className="flex-1 overflow-auto select-none" style={{ background: '#0F1115' }}>
      <div style={{ minWidth: totalWidth + 160 }}>

        {/* Header row */}
        <div className="flex sticky top-0 z-20" style={{ background: '#13161C', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-40 flex-shrink-0 px-3 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Recurso
            </span>
          </div>
          <div className="relative flex-1" style={{ width: totalWidth }}>
            {hours.map(h => (
              <div
                key={h}
                className="absolute flex items-center justify-start"
                style={{ left: (h - HOUR_START) * COL_WIDTH, width: COL_WIDTH, top: 0, bottom: 0 }}
              >
                <span className="text-[10px] font-medium pl-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map(row => (
          <div
            key={row.id}
            className="flex"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', height: ROW_HEIGHT }}
          >
            {/* Resource label */}
            <div className="w-40 flex-shrink-0 flex items-center gap-2 px-3" style={{ background: '#13161C', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
              <span className="text-xs font-medium truncate text-white">{row.label}</span>
            </div>

            {/* Timeline */}
            <div
              className="relative flex-1 cursor-pointer"
              style={{ width: totalWidth, height: ROW_HEIGHT }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const minutesFromStart = (x / COL_WIDTH) * 60
                const rounded = Math.round(minutesFromStart / 30) * 30
                const hour   = HOUR_START + Math.floor(rounded / 60)
                const minute = rounded % 60
                onSlotClick(date, Math.min(hour, HOUR_END - 1), minute)
              }}
            >
              {/* Grid lines */}
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute top-0 bottom-0"
                  style={{ left: (h - HOUR_START) * COL_WIDTH, borderLeft: '1px solid rgba(255,255,255,0.04)' }}
                />
              ))}

              {/* Current time */}
              {isToday && nowHour >= HOUR_START && nowHour < HOUR_END && (
                <div
                  className="absolute top-0 bottom-0 z-10"
                  style={{ left: nowLeft, borderLeft: '1.5px solid rgba(239,68,68,0.7)' }}
                />
              )}

              {/* Blocks (global only for now) */}
              {blocks
                .filter(b => (b.resource_id === null || b.resource_id === row.id) && getLocalDateStr(b.starts_at, timezone) === todayStr)
                .map(block => {
                  const left  = blockingLeft(block, timezone)
                  const width = blockingWidth(block, timezone)
                  return (
                    <div
                      key={block.id}
                      className="absolute top-1 bottom-1 rounded flex items-center px-1.5"
                      style={{ left, width: Math.max(20, width), background: `${block.color}18`, border: `1px dashed ${block.color}50` }}
                    >
                      <span className="text-[9px] truncate" style={{ color: block.color }}>{block.title}</span>
                    </div>
                  )
                })}

              {/* Bookings */}
              {row.bookingList.map(b => {
                const left  = bookingLeft(b)
                const width = bookingWidth(b)
                const color = b.catalog?.color ?? BOOKING_STATUS_CONFIG[b.status].color
                const label = b.client_name ?? b.catalog?.name ?? 'Reserva'
                return (
                  <button
                    key={b.id}
                    onClick={e => { e.stopPropagation(); onBookingClick(b) }}
                    className="absolute top-1 bottom-1 rounded-lg flex items-center px-2 gap-1.5 text-left transition-all"
                    style={{
                      left,
                      width: Math.max(24, width),
                      background: `${color}20`,
                      border: `1.5px solid ${b.id === selectedId ? color : `${color}50`}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white truncate">{label}</p>
                      {width > 80 && (
                        <p className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {formatLocalTime(b.starts_at, timezone)}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Agregá recursos en el módulo de Recursos para ver el timeline.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function blockingLeft(block: ServiceBlock, timezone: string) {
  const { hour, minute } = getLocalHourMinute(block.starts_at, timezone)
  return Math.max(0, ((hour - HOUR_START) * 60 + minute) * (COL_WIDTH / 60))
}

function blockingWidth(block: ServiceBlock, timezone: string) {
  const { hour: sh, minute: sm } = getLocalHourMinute(block.starts_at, timezone)
  const { hour: eh, minute: em } = getLocalHourMinute(block.ends_at, timezone)
  return ((eh - sh) * 60 + (em - sm)) * (COL_WIDTH / 60)
}
