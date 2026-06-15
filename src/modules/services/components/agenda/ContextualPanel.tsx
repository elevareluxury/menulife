import { X, Phone, Mail, StickyNote, Clock, MapPin, Video, CalendarDays, RefreshCw, Ban, CheckCircle2, UserCheck } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { ServiceBooking, BookingStatus } from '../../types/booking'
import { BOOKING_STATUS_CONFIG } from '../../types/booking'
import { formatLocalTime, formatInTz } from '../../utils/timezone'

const NEXT_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'no_show'],
  completed:   [],
  cancelled:   [],
  no_show:     [],
  rescheduled: [],
}

const STATUS_ACTIONS: Record<BookingStatus, { label: string; icon: React.ReactNode; color: string }> = {
  confirmed:   { label: 'Confirmar',   icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#3B82F6' },
  in_progress: { label: 'Iniciar',     icon: <UserCheck    className="w-3.5 h-3.5" />, color: '#F4705A' },
  completed:   { label: 'Completar',   icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#22C55E' },
  cancelled:   { label: 'Cancelar',    icon: <Ban          className="w-3.5 h-3.5" />, color: '#EF4444' },
  no_show:     { label: 'No vino',     icon: <X            className="w-3.5 h-3.5" />, color: '#EF4444' },
  rescheduled: { label: 'Reagendó',    icon: <RefreshCw    className="w-3.5 h-3.5" />, color: '#8B5CF6' },
  pending:     { label: 'Pendiente',   icon: <Clock        className="w-3.5 h-3.5" />, color: '#F59E0B' },
}

interface ContextualPanelProps {
  booking: ServiceBooking | null
  timezone: string
  onClose: () => void
  onStatusChange: (id: string, status: BookingStatus) => void
  onReschedule: (booking: ServiceBooking) => void
}

export function ContextualPanel({
  booking,
  timezone,
  onClose,
  onStatusChange,
  onReschedule,
}: ContextualPanelProps) {
  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
        >
          <CalendarDays className="w-5 h-5" style={{ color: 'rgba(244,112,90,0.5)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Seleccioná una reserva
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          o hacé click en un horario para crear una nueva
        </p>
      </div>
    )
  }

  const color      = booking.catalog?.color ?? BOOKING_STATUS_CONFIG[booking.status].color
  const dateLabel  = formatInTz(booking.starts_at, timezone, { weekday: 'long', day: 'numeric', month: 'long' })
  const startTime  = formatLocalTime(booking.starts_at, timezone)
  const endTime    = formatLocalTime(booking.ends_at, timezone)
  const nextStatus = NEXT_STATUSES[booking.status]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <StatusBadge status={booking.status} size="sm" />
          </div>
          <h3 className="text-sm font-bold text-white truncate">
            {booking.client_name ?? booking.title ?? 'Sin nombre'}
          </h3>
          {booking.catalog?.name && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {booking.catalog.name}
            </p>
          )}
        </div>
        <button onClick={onClose} className="ml-2 flex-shrink-0 p-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* Time */}
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <div>
            <p className="text-sm font-semibold text-white capitalize">{dateLabel}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {startTime} → {endTime} · {booking.duration_minutes}min
            </p>
          </div>
        </div>

        {/* Client info */}
        {(booking.client_phone || booking.client_email) && (
          <div className="space-y-2">
            {booking.client_phone && (
              <a
                href={`tel:${booking.client_phone}`}
                className="flex items-center gap-3 group"
              >
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-sm group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {booking.client_phone}
                </span>
              </a>
            )}
            {booking.client_email && (
              <a
                href={`mailto:${booking.client_email}`}
                className="flex items-center gap-3 group"
              >
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <span className="text-sm group-hover:text-white transition-colors truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {booking.client_email}
                </span>
              </a>
            )}
          </div>
        )}

        {/* Modality */}
        {booking.modality === 'online' && (
          <div className="flex items-center gap-3">
            <Video className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {booking.meet_url ?? 'Online'}
            </span>
          </div>
        )}
        {(booking.modality === 'home' || booking.service_address) && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {booking.service_address ?? 'A domicilio'}
            </span>
          </div>
        )}

        {/* Resources */}
        {(booking.resources?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {booking.resources!.map(r => (
              <span
                key={r.id}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${r.resource.color}20`, color: r.resource.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.resource.color }} />
                {r.resource.name}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {booking.notes && (
          <div className="flex items-start gap-3">
            <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {booking.notes}
            </p>
          </div>
        )}
        {booking.client_notes && (
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Nota del cliente
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{booking.client_notes}</p>
          </div>
        )}

        {/* Group info */}
        {booking.booking_type === 'group' && (
          <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span>Lugares</span>
            <span className="font-semibold text-white">
              {booking.reserved_spots} / {booking.capacity}
            </span>
          </div>
        )}
      </div>

      {/* Status actions */}
      {nextStatus.length > 0 && (
        <div className="px-4 pb-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Cambiar estado
          </p>
          <div className="flex flex-wrap gap-1.5">
            {nextStatus.map(s => {
              const action = STATUS_ACTIONS[s]
              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(booking.id, s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: `${action.color}15`, color: action.color, border: `1px solid ${action.color}30` }}
                >
                  {action.icon}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Reagendar */}
      {['pending', 'confirmed'].includes(booking.status) && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onReschedule(booking)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reagendar
          </button>
        </div>
      )}
    </div>
  )
}
