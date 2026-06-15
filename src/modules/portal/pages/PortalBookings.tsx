import { useEffect, useState } from 'react'
import { Calendar, Clock, Video, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePortalCtx } from '../PortalApp'
import { apiGetBookings, apiCancelBooking, apiLogEvent } from '../portalAPI'
import type { PortalBooking } from '../portalTypes'
import {
  fmtDate, fmtTime,
  BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR,
} from '../portalTypes'

type Filter = 'upcoming' | 'past' | 'cancelled'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming',  label: 'Próximas'   },
  { key: 'past',      label: 'Pasadas'    },
  { key: 'cancelled', label: 'Canceladas' },
]

function BookingCard({
  b, token, onCancel,
}: {
  b:         PortalBooking
  token:     string
  onCancel?: (id: string) => void
}) {
  const [cancelling, setCancelling] = useState(false)
  const color = BOOKING_STATUS_COLOR[b.status] ?? 'rgba(255,255,255,0.25)'
  const canCancel = ['pending', 'confirmed'].includes(b.status) && new Date(b.starts_at) > new Date()

  const handleCancel = async () => {
    if (!window.confirm('¿Cancelar esta reserva?')) return
    setCancelling(true)
    const result = await apiCancelBooking(token, b.id)
    setCancelling(false)
    if (result.success) {
      apiLogEvent(token, 'booking_cancel', 'booking', b.id)
      toast.success('Reserva cancelada')
      onCancel?.(b.id)
    } else {
      toast.error('No se pudo cancelar la reserva')
    }
  }

  return (
    <div
      className="rounded-2xl p-4 mb-3"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: color }} />
          <div>
            <p className="text-sm font-bold text-white leading-tight">
              {b.service_name ?? b.title ?? 'Reserva'}
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}
        >
          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {fmtDate(b.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {fmtTime(b.starts_at)}
            {b.duration_minutes ? ` · ${b.duration_minutes} min` : ''}
          </span>
        </div>
        {b.modality === 'online' && b.meet_url && (
          <div className="flex items-center gap-2">
            <Video className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <a href={b.meet_url} target="_blank" rel="noopener noreferrer"
              className="text-xs underline" style={{ color: '#3B82F6' }}>
              Unirse a la videollamada
            </a>
          </div>
        )}
        {b.modality === 'presencial' && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Presencial</span>
          </div>
        )}
      </div>

      {b.notes && (
        <p className="text-xs px-3 py-2 rounded-xl mb-3" style={{
          background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic',
        }}>
          {b.notes}
        </p>
      )}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full h-9 rounded-xl text-xs font-semibold transition-opacity"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          {cancelling ? 'Cancelando…' : 'Cancelar reserva'}
        </button>
      )}
    </div>
  )
}

export function PortalBookings() {
  const { session } = usePortalCtx()
  const [filter, setFilter]     = useState<Filter>('upcoming')
  const [bookings, setBookings] = useState<PortalBooking[]>([])
  const [loading, setLoading]   = useState(true)

  const load = async (f: Filter) => {
    setLoading(true)
    const data = await apiGetBookings(session.token, f)
    setBookings(data)
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  const handleCancel = (id: string) =>
    setBookings(prev => prev.filter(b => b.id !== id))

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Mis reservas</h1>

      {/* Filter tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl mb-5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: filter === key ? '#F4705A' : 'transparent',
              color:      filter === key ? '#fff'    : 'rgba(255,255,255,0.4)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }} />
        </div>
      ) : bookings.length === 0 ? (
        <div
          className="rounded-2xl p-10 flex flex-col items-center text-center"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Calendar className="w-8 h-8 mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {filter === 'upcoming'  ? 'Sin próximas reservas' :
             filter === 'past'      ? 'Sin reservas pasadas'  :
             'Sin reservas canceladas'}
          </p>
        </div>
      ) : (
        <div>
          {bookings.map(b => (
            <BookingCard
              key={b.id}
              b={b}
              token={session.token}
              onCancel={filter === 'upcoming' ? handleCancel : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
