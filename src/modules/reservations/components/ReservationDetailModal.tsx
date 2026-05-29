import { useState, useEffect } from 'react'
import { Phone, MessageCircle, Users, CalendarDays, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import toast from 'react-hot-toast'
import type { Reservation, Table, CRMContact } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const STATUS_CONFIG: Record<string, { label: string; color: string; actions: string[] }> = {
  pending:   { label: 'Pendiente',       color: '#F59E0B', actions: ['confirm', 'cancel'] },
  confirmed: { label: 'Confirmada',      color: '#3B82F6', actions: ['seat', 'cancel', 'no_show'] },
  seated:    { label: 'Sentada',         color: '#10B981', actions: ['complete'] },
  completed: { label: 'Completada',      color: '#6B7280', actions: [] },
  cancelled: { label: 'Cancelada',       color: '#EF4444', actions: [] },
  no_show:   { label: 'No se presentó',  color: '#EF4444', actions: [] },
}

const ACTION_LABELS: Record<string, string> = {
  confirm:  'Confirmar',
  seat:     'Sentar ahora',
  complete: 'Completar',
  cancel:   'Cancelar',
  no_show:  'No se presentó',
}

interface Props {
  reservation: Reservation | null
  tables: Table[]
  restaurantName: string
  onClose: () => void
  onUpdated: () => void
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  const date = new Date(y, m - 1, day)
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function ReservationDetailModal({ reservation, tables, restaurantName, onClose, onUpdated }: Props) {
  const [tableId, setTableId] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [contact, setContact] = useState<CRMContact | null>(null)
  const [history, setHistory] = useState<Reservation[]>([])

  useEffect(() => {
    if (!reservation) return
    setTableId(reservation.table_id ?? '')
    setInternalNotes(reservation.internal_notes ?? '')
    // Load CRM contact
    db.from('crm_contacts')
      .select('*')
      .eq('restaurant_id', reservation.restaurant_id)
      .eq('phone', reservation.phone)
      .maybeSingle()
      .then(({ data }: { data: CRMContact | null }) => setContact(data))
    // Load history
    db.from('reservations')
      .select('*')
      .eq('restaurant_id', reservation.restaurant_id)
      .eq('phone', reservation.phone)
      .neq('id', reservation.id)
      .order('reservation_date', { ascending: false })
      .limit(5)
      .then(({ data }: { data: Reservation[] }) => setHistory(data ?? []))
  }, [reservation])

  if (!reservation) return null

  const cfg = STATUS_CONFIG[reservation.status]

  const updateStatus = async (newStatus: string) => {
    setSaving(true)
    try {
      const { error } = await db
        .from('reservations')
        .update({ status: newStatus, table_id: tableId || null, internal_notes: internalNotes || null })
        .eq('id', reservation.id)
      if (error) throw error
      toast.success('Reserva actualizada')
      onUpdated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    try {
      const { error } = await db
        .from('reservations')
        .update({ table_id: tableId || null, internal_notes: internalNotes || null })
        .eq('id', reservation.id)
      if (error) throw error
      toast.success('Guardado')
      onUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const waUrl = `https://wa.me/${reservation.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${reservation.first_name}, te contactamos desde ${restaurantName}. Tu reserva está confirmada para el ${reservation.reservation_date} a las ${reservation.reservation_time}.`)}`

  return (
    <Modal isOpen={!!reservation} onClose={onClose} title={`Reserva #${reservation.id.slice(-4).toUpperCase()}`}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Status badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '50px', background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
        </div>

        {/* Customer info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-1">{reservation.first_name} {reservation.last_name}</p>
              {reservation.email && <p className="text-xs text-ink-3">{reservation.email}</p>}
            </div>
            <div className="flex gap-2">
              <a href={`tel:${reservation.phone}`} className="p-2 rounded-lg hover:bg-surface-4 transition-colors" title="Llamar">
                <Phone className="w-4 h-4 text-ink-3" />
              </a>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-4 transition-colors" title="WhatsApp">
                <MessageCircle className="w-4 h-4 text-ok" />
              </a>
            </div>
          </div>
          <p className="text-xs text-ink-2">📱 {reservation.phone}</p>
          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span><CalendarDays className="w-3 h-3 inline mr-1" />{formatDate(reservation.reservation_date)} · {reservation.reservation_time}</span>
            <span><Users className="w-3 h-3 inline mr-1" />{reservation.party_size} personas</span>
          </div>
          {reservation.occasion && <p className="text-xs text-ink-2">🎉 {reservation.occasion}</p>}
          {reservation.notes && (
            <div className="p-2 rounded-lg bg-surface-3 text-xs text-ink-2">
              <FileText className="w-3 h-3 inline mr-1" />"{reservation.notes}"
            </div>
          )}
        </div>

        {/* CRM history */}
        {contact && (
          <div className="p-3 rounded-xl bg-surface-3 space-y-1">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Historial del cliente</p>
            <p className="text-xs text-ink-2">🔄 {contact.total_visits} visitas · ${contact.total_spent.toLocaleString('es-AR')} total</p>
            {contact.last_visit_date && <p className="text-xs text-ink-2">📅 Última visita: {contact.last_visit_date}</p>}
            {contact.is_vip && <span className="text-xs font-bold text-yellow-500">⭐ VIP</span>}
          </div>
        )}

        {/* Assign table */}
        <Select
          label="Asignar mesa"
          value={tableId}
          onChange={e => setTableId(e.target.value)}
          options={[
            { value: '', label: 'Sin asignar' },
            ...tables.filter(t => t.is_active).map(t => ({ value: t.id, label: `Mesa ${t.table_number} (${t.capacity} pers.)` })),
          ]}
        />

        {/* Internal notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
          <textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            rows={2}
            placeholder="Notas para el equipo..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B7A] resize-none"
          />
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Reservas anteriores</p>
            {history.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-center justify-between text-xs text-ink-2 py-1">
                <span>📅 {h.reservation_date} · {h.reservation_time}</span>
                <span style={{ color: STATUS_CONFIG[h.status]?.color ?? '#888' }}>{STATUS_CONFIG[h.status]?.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={saveNotes}
            disabled={saving}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Guardar
          </button>
          {cfg.actions.map(action => (
            <button
              key={action}
              type="button"
              onClick={() => updateStatus(action === 'seat' ? 'seated' : action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : action === 'no_show' ? 'no_show' : 'cancelled')}
              disabled={saving}
              style={{
                padding: '8px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: action === 'cancel' || action === 'no_show' ? '#FEF2F2' : action === 'seat' || action === 'confirm' ? '#EFF6FF' : '#F0FDF4',
                color: action === 'cancel' || action === 'no_show' ? '#EF4444' : action === 'seat' || action === 'confirm' ? '#3B82F6' : '#10B981',
              }}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
