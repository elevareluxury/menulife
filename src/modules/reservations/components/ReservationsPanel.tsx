import { useState, useRef } from 'react'
import { Plus, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { useReservations } from '../hooks/useReservations'
import { ReservationDetailModal } from './ReservationDetailModal'
import { NewReservationModal } from './NewReservationModal'
import { STATUS_CONFIG } from './ReservationDetailModal'
import toast from 'react-hot-toast'
import type { Reservation, Table } from '@/types'

interface Props {
  restaurantId: string
  restaurantName: string
  tables: Table[]
}

function pad(n: number) { return n.toString().padStart(2, '0') }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m-1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

function formatDateShort(d: string) {
  const [y, mo, day] = d.split('-').map(Number)
  const date = new Date(y, mo-1, day)
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }
  const label = date.toLocaleDateString('es-AR', opts)
  return d === todayStr() ? `Hoy · ${label}` : label
}

export function ReservationsPanel({ restaurantId, restaurantName, tables }: Props) {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleNewReservation = (r: Reservation) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
    toast.custom(t => (
      <div
        onClick={() => { setSelectedDate(r.reservation_date); setSelectedReservation(r) }}
        className={`${t.visible ? 'animate-enter' : 'animate-leave'} cursor-pointer max-w-sm w-full bg-[#1a2035] border border-blue-500/30 shadow-lg rounded-2xl pointer-events-auto flex items-center gap-3 p-4`}
      >
        <Bell className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white">📅 Nueva reserva</p>
          <p className="text-xs text-gray-400">{r.first_name} {r.last_name} · {r.reservation_time} · {r.party_size} pers.</p>
        </div>
      </div>
    ), { duration: 6000 })
  }

  const { reservations, loading, refetch } = useReservations(restaurantId, selectedDate, handleNewReservation)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showNew, setShowNew] = useState(false)

  const prevDay = () => setSelectedDate(d => addDays(d, -1))
  const nextDay = () => setSelectedDate(d => addDays(d, 1))

  return (
    <div className="flex flex-col h-full">
      {/* Hidden audio for notification */}
      <audio ref={audioRef} src="/notification-reservation.mp3" preload="auto" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={prevDay} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-ink-1 min-w-[140px] text-center">{formatDateShort(selectedDate)}</span>
          <button onClick={nextDay} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500">
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
          style={{ background: '#FF6B7A' }}
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-ink-3 text-sm">Cargando...</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-8 text-ink-3 text-sm">
            <p className="text-2xl mb-2">📅</p>
            <p>Sin reservas para este día</p>
          </div>
        ) : (
          reservations.map(r => {
            const cfg = STATUS_CONFIG[r.status]
            const assignedTable = tables.find(t => t.id === r.table_id)
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReservation(r)}
                className="cursor-pointer rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors p-3 space-y-1.5"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{r.reservation_time} · {r.first_name} {r.last_name}</span>
                    <p className="text-xs text-gray-500">📱 {r.phone}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: cfg?.color ?? '#888', background: `${cfg?.color ?? '#888'}15`, padding: '2px 8px', borderRadius: '50px', whiteSpace: 'nowrap' }}>
                    {cfg?.label ?? r.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>👥 {r.party_size} pers.</span>
                  {r.occasion && <span>🎉 {r.occasion}</span>}
                  {assignedTable && <span className="text-blue-500 font-medium">Mesa {assignedTable.table_number}</span>}
                  {!assignedTable && <span className="text-gray-400">Sin mesa</span>}
                </div>
                {r.notes && (
                  <p className="text-xs text-gray-400 italic truncate">"{r.notes}"</p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <ReservationDetailModal
        reservation={selectedReservation}
        tables={tables}
        restaurantName={restaurantName}
        onClose={() => setSelectedReservation(null)}
        onUpdated={refetch}
      />
      <NewReservationModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        restaurantId={restaurantId}
        tables={tables}
        onCreated={refetch}
      />
    </div>
  )
}
