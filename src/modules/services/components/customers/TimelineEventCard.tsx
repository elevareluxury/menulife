import { getEventConfig } from '../../timeline/timelineEvents'
import type { TimelineEvent } from '../../hooks/useCustomerTimeline'

interface TimelineEventCardProps {
  event:    TimelineEvent
  isLast:   boolean
  timezone: string
}

export function TimelineEventCard({ event, isLast, timezone }: TimelineEventCardProps) {
  const cfg  = getEventConfig(event.event_type)
  const Icon = cfg.icon

  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone: timezone,
    hour:     '2-digit',
    minute:   '2-digit',
  }).format(new Date(event.event_date))

  return (
    <div className="flex gap-3">
      {/* Línea vertical + icono */}
      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 z-10"
          style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
        </div>
        {!isLast && (
          <div
            className="flex-1 w-px mt-1"
            style={{ background: 'rgba(255,255,255,0.06)', minHeight: 16 }}
          />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-white leading-snug">{event.title}</p>
          <span
            className="text-[10px] flex-shrink-0 mt-0.5"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {time}
          </span>
        </div>
        {event.description && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}
