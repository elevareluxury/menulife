import { useState, useEffect, useCallback } from 'react'
import { Search, Star, Phone, MessageCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import type { CRMContact, Reservation } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type FilterTab = 'all' | 'vip' | 'recurrent' | 'new'

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#3B82F6', seated: '#10B981', completed: '#6B7280',
  pending: '#F59E0B', cancelled: '#EF4444', no_show: '#EF4444',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada', seated: 'Sentada', completed: 'Completada',
  pending: 'Pendiente', cancelled: 'Cancelada', no_show: 'No se presentó',
}

export function CRMPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selected, setSelected] = useState<CRMContact | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!restaurant?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = db
        .from('crm_contacts')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('last_visit_date', { ascending: false, nullsFirst: false })

      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      if (filter === 'vip') query = query.eq('is_vip', true)
      if (filter === 'recurrent') query = query.gte('total_visits', 3)
      if (filter === 'new') query = query.lte('total_visits', 1)

      const { data, error } = await query.limit(100)
      console.log('CRM query result:', { data, error, restaurantId: restaurant.id })
      if (error) {
        console.error('ERROR COMPLETO CRM fetch:', JSON.stringify(error, null, 2))
        throw error
      }
      setContacts(data ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al cargar clientes'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, search, filter])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'vip', label: '⭐ VIP' },
    { key: 'recurrent', label: 'Recurrentes' },
    { key: 'new', label: 'Nuevos' },
  ]

  if (restaurantLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Clientes</h1>
        <p className="text-gray-400 text-sm">Historial y CRM de tus clientes</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B7A]"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${filter === tab.key ? 'bg-surface-4 text-ink-1' : 'text-ink-3 hover:bg-surface-3'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-sm">No hay clientes aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {c.first_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-gray-900">{c.first_name} {c.last_name}</span>
                    {c.is_vip && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-900">{c.total_visits} visitas</p>
                  {c.last_visit_date && <p className="text-xs text-gray-400">{c.last_visit_date}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ContactDetailModal
          contact={selected}
          restaurantId={restaurant?.id ?? ''}
          onClose={() => setSelected(null)}
          onUpdated={() => { fetchContacts(); setSelected(null) }}
        />
      )}
    </div>
  )
}

interface DetailProps {
  contact: CRMContact
  restaurantId: string
  onClose: () => void
  onUpdated: () => void
}

function ContactDetailModal({ contact, restaurantId, onClose, onUpdated }: DetailProps) {
  const [isVip, setIsVip] = useState(contact.is_vip)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [history, setHistory] = useState<Reservation[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    db.from('reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('phone', contact.phone)
      .order('reservation_date', { ascending: false })
      .limit(10)
      .then(({ data }: { data: Reservation[] }) => setHistory(data ?? []))
  }, [contact.phone, restaurantId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await db
        .from('crm_contacts')
        .update({ is_vip: isVip, notes: notes.trim() || null })
        .eq('id', contact.id)
      if (error) {
        console.error('ERROR COMPLETO CRM save:', JSON.stringify(error, null, 2))
        throw error
      }
      toast.success('Cliente actualizado')
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const waUrl = `https://wa.me/${contact.phone.replace(/\D/g, '')}`

  return (
    <Modal isOpen onClose={onClose} title={`${contact.first_name} ${contact.last_name}`}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Visitas', value: contact.total_visits },
            { label: 'Total gastado', value: `$${contact.total_spent?.toLocaleString('es-AR') ?? 0}` },
            { label: 'Ticket prom.', value: `$${Math.round(contact.avg_ticket ?? 0).toLocaleString('es-AR')}` },
          ].map(s => (
            <div key={s.label} className="bg-surface-3 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-ink-1">{s.value}</p>
              <p className="text-xs text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-2">📱 {contact.phone}</p>
            {contact.email && <p className="text-sm text-ink-2">✉️ {contact.email}</p>}
            {contact.first_visit_date && <p className="text-xs text-ink-3 mt-1">Primera visita: {contact.first_visit_date}</p>}
            {contact.last_visit_date && <p className="text-xs text-ink-3">Última visita: {contact.last_visit_date}</p>}
          </div>
          <div className="flex gap-2">
            <a href={`tel:${contact.phone}`} className="p-2 rounded-lg hover:bg-surface-4 transition-colors" title="Llamar">
              <Phone className="w-4 h-4 text-ink-3" />
            </a>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-4 transition-colors" title="WhatsApp">
              <MessageCircle className="w-4 h-4 text-ok" />
            </a>
          </div>
        </div>

        {/* VIP toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-3">
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${isVip ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-ink-2">Cliente VIP</span>
          </div>
          <button
            onClick={() => setIsVip(!isVip)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isVip ? 'bg-yellow-400' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isVip ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Preferencias, alergias, observaciones..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B7A] resize-none"
          />
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag: string) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-4 text-ink-2">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Reservation history */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Historial de reservas</p>
            {history.map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-3">
                <span className="text-ink-2">📅 {r.reservation_date} · {r.reservation_time} · {r.party_size} pers.</span>
                <span style={{ color: STATUS_COLOR[r.status] ?? '#888', fontWeight: 600 }}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: saving ? 'rgba(255,107,122,0.5)' : '#FF6B7A' }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
