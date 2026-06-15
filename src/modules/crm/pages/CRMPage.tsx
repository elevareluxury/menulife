import { useState, useEffect, useCallback } from 'react'
import {
  Search, Star, Phone, MessageCircle, ChevronRight,
  Calendar, Clock, Users, CheckCircle2, XCircle, UserCheck, ShoppingBag, TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useRestaurantStore } from '@/store/restaurantStore'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import type { CRMContact, Reservation, ReservationStatus } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type FilterTab = 'all' | 'vip' | 'recurrent' | 'new'
type ResFilter = ReservationStatus | 'all'
type ViewMode = 'clientes' | 'reservas' | 'ventas'

interface PurchaseRecord {
  id: string
  created_at: string
  total: number
  order_type: string | null
  status: string
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: '#3B82F6', seated: '#10B981', completed: '#6B7280',
  pending: '#F59E0B', cancelled: '#EF4444', no_show: '#EF4444',
}
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada', seated: 'Sentada', completed: 'Completada',
  pending: 'Pendiente', cancelled: 'Cancelada', no_show: 'No se presentó',
}

// ── Reservation detail modal ──────────────────────────────────────────────────

interface ResDetailProps {
  reservation: Reservation
  onClose: () => void
  onUpdated: () => void
}

function ReservationDetailModal({ reservation: initial, onClose, onUpdated }: ResDetailProps) {
  const [res, setRes] = useState<Reservation>(initial)
  const [saving, setSaving] = useState(false)
  const [tableName, setTableName] = useState<string | null>(null)

  useEffect(() => {
    if (!res.table_id) return
    db.from('tables').select('table_number').eq('id', res.table_id).maybeSingle()
      .then(({ data }: { data: { table_number: number } | null }) => {
        if (data?.table_number) setTableName(`Mesa ${data.table_number}`)
      })
      .catch(() => {})
  }, [res.table_id])

  const updateStatus = async (newStatus: ReservationStatus) => {
    setSaving(true)
    try {
      const { error } = await db.from('reservations')
        .update({ status: newStatus })
        .eq('id', res.id)
      if (error) throw error
      setRes(prev => ({ ...prev, status: newStatus }))
      toast.success(`Reserva ${STATUS_LABEL[newStatus]?.toLowerCase() ?? newStatus}`)
      onUpdated()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${STATUS_COLOR[res.status]}22`, color: STATUS_COLOR[res.status] ?? '#888' }}
    >
      {STATUS_LABEL[res.status] ?? res.status}
    </span>
  )

  return (
    <Modal isOpen onClose={onClose} title="Detalle de reserva" dark>
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          {statusBadge}
          <span className="text-xs text-ink-3">{res.created_at?.slice(0, 10)}</span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          <Row icon="👤" label="Nombre" value={`${res.first_name} ${res.last_name}`} />
          <Row icon="📱" label="Teléfono" value={res.phone} />
          {res.email && <Row icon="✉️" label="Email" value={res.email} />}
          <Row icon="📅" label="Fecha" value={res.reservation_date} />
          <Row icon="🕐" label="Hora" value={res.reservation_time} />
          <Row icon="👥" label="Personas" value={String(res.party_size)} />
          {res.occasion && <Row icon="🎉" label="Ocasión" value={res.occasion} />}
          {tableName && <Row icon="🪑" label="Mesa" value={tableName} />}
          {res.notes && <Row icon="📝" label="Notas" value={res.notes} />}
        </div>

        {/* Guests data */}
        {res.collect_guests && res.guests_data && res.guests_data.length > 0 && (
          <div className="bg-surface-3 rounded-xl p-3">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest mb-2">Acompañantes</p>
            <div className="space-y-1">
              {res.guests_data.map((g, i) => (
                <p key={i} className="text-sm text-ink-2">· {g.name}</p>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {res.status !== 'completed' && res.status !== 'cancelled' && res.status !== 'no_show' && (
          <div className="flex gap-2 flex-wrap pt-1 border-t border-surface-3">
            {res.status === 'pending' && (
              <>
                <ActionBtn
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  label="Confirmar"
                  color="#10B981"
                  disabled={saving}
                  onClick={() => updateStatus('confirmed')}
                />
                <ActionBtn
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  label="Rechazar"
                  color="#EF4444"
                  disabled={saving}
                  onClick={() => updateStatus('cancelled')}
                />
              </>
            )}
            {res.status === 'confirmed' && (
              <>
                <ActionBtn
                  icon={<UserCheck className="w-3.5 h-3.5" />}
                  label="Sentar"
                  color="#10B981"
                  disabled={saving}
                  onClick={() => updateStatus('seated')}
                />
                <ActionBtn
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  label="Cancelar"
                  color="#EF4444"
                  disabled={saving}
                  onClick={() => updateStatus('cancelled')}
                />
              </>
            )}
            {res.status === 'seated' && (
              <ActionBtn
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                label="Completar"
                color="#6366F1"
                disabled={saving}
                onClick={() => updateStatus('completed')}
              />
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-surface-3 text-sm font-medium text-ink-3 hover:bg-surface-3 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-5 text-base flex-shrink-0">{icon}</span>
      <span className="text-ink-3 w-20 flex-shrink-0">{label}</span>
      <span className="text-ink-1 font-medium flex-1 break-words">{value}</span>
    </div>
  )
}

function ActionBtn({
  icon, label, color, disabled, onClick,
}: {
  icon: React.ReactNode
  label: string
  color: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}33` }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CRMPage() {
  const { restaurant, loading: restaurantLoading } = useRestaurant()
  const businessType = useRestaurantStore(s => s.businessType)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('clientes')

  // Contacts state
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [selected, setSelected] = useState<CRMContact | null>(null)

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [resLoading, setResLoading] = useState(false)
  const [resFilter, setResFilter] = useState<ResFilter>('pending')
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)

  const fetchContacts = useCallback(async () => {
    if (!restaurant?.id) { setLoading(false); return }
    setLoading(true)
    try {
      let query = db
        .from('crm_contacts')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('last_visit', { ascending: false, nullsFirst: false })

      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }
      if (filter === 'vip') query = query.eq('is_vip', true)
      if (filter === 'recurrent') query = query.gte('total_visits', 3)
      if (filter === 'new') query = query.lte('total_visits', 1)

      const { data, error } = await query.limit(100)
      if (error) throw error
      setContacts(data ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al cargar clientes'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, search, filter])

  const fetchReservations = useCallback(async () => {
    if (!restaurant?.id) return
    setResLoading(true)
    try {
      let query = db
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('reservation_date', { ascending: true })

      if (resFilter !== 'all') query = query.eq('status', resFilter)

      const { data, error } = await query.limit(100)
      if (error) throw error
      setReservations(data ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al cargar reservas'
      toast.error(msg)
    } finally {
      setResLoading(false)
    }
  }, [restaurant?.id, resFilter])

  useEffect(() => { fetchContacts() }, [fetchContacts])
  useEffect(() => { if (viewMode === 'reservas') fetchReservations() }, [viewMode, fetchReservations])

  const CONTACT_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'vip', label: '⭐ VIP' },
    { key: 'recurrent', label: 'Recurrentes' },
    { key: 'new', label: 'Nuevos' },
  ]

  const RES_TABS: { key: ResFilter; label: string }[] = [
    { key: 'all',       label: 'Todas' },
    { key: 'pending',   label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'completed', label: 'Completadas' },
    { key: 'cancelled', label: 'Canceladas' },
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
      <div className="mb-5">
        <h1 className="text-3xl font-bold mb-1">Clientes</h1>
        <p className="text-ink-3 text-sm">Historial, CRM y reservas</p>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface-3 w-fit mb-5">
        {([
          { id: 'clientes' as ViewMode, icon: <Users className="w-3.5 h-3.5" />, label: 'Clientes' },
          ...(businessType === 'retail'
            ? [{ id: 'ventas' as ViewMode, icon: <ShoppingBag className="w-3.5 h-3.5" />, label: 'Ventas' }]
            : [{ id: 'reservas' as ViewMode, icon: <Calendar className="w-3.5 h-3.5" />, label: 'Reservas' }]
          ),
        ]).map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              viewMode === id ? 'bg-surface-1 text-ink-1 shadow-sm' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* ── CLIENTES VIEW ───────────────────────────────────────────────── */}
      {viewMode === 'clientes' && (
        <>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-3 bg-surface-2 text-sm text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-ink-4"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {CONTACT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filter === tab.key ? 'bg-surface-4 text-ink-1' : 'text-ink-3 hover:bg-surface-3'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-ink-4">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm">No hay clientes aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="w-full text-left bg-surface-2 rounded-xl border border-surface-3 p-4 hover:bg-surface-3 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.first_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-ink-1">{c.first_name} {c.last_name}</span>
                        {c.is_vip && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-ink-3">{c.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-ink-1">{c.total_visits} visitas</p>
                      {c.last_visit && <p className="text-xs text-ink-4">{c.last_visit}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── RESERVAS VIEW ───────────────────────────────────────────────── */}
      {viewMode === 'reservas' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {RES_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setResFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  resFilter === tab.key
                    ? 'text-ink-1'
                    : 'text-ink-3 hover:bg-surface-3'
                }`}
                style={resFilter === tab.key && tab.key !== 'all' ? {
                  backgroundColor: `${STATUS_COLOR[tab.key] ?? '#888'}18`,
                  color: STATUS_COLOR[tab.key] ?? undefined,
                } : resFilter === tab.key ? { backgroundColor: 'var(--surface-4)' } : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {resLoading ? (
            <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-ink-4">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">
                {resFilter === 'all' ? 'No hay reservas registradas' : `Sin reservas ${STATUS_LABEL[resFilter]?.toLowerCase() ?? resFilter}s`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reservations.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRes(r)}
                  className="w-full text-left bg-surface-2 rounded-xl border border-surface-3 p-4 hover:bg-surface-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {r.first_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-ink-1 truncate">{r.first_name} {r.last_name}</p>
                        <div className="flex items-center gap-2 text-xs text-ink-3 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{r.reservation_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{r.reservation_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />{r.party_size} pers.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${STATUS_COLOR[r.status] ?? '#888'}18`,
                          color: STATUS_COLOR[r.status] ?? '#888',
                        }}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {selected && (
        <ContactDetailModal
          contact={selected}
          restaurantId={restaurant?.id ?? ''}
          businessType={businessType}
          onClose={() => setSelected(null)}
          onUpdated={() => { fetchContacts(); setSelected(null) }}
          onSelectReservation={setSelectedRes}
        />
      )}

      {selectedRes && (
        <ReservationDetailModal
          reservation={selectedRes}
          onClose={() => setSelectedRes(null)}
          onUpdated={() => {
            setSelectedRes(null)
            if (viewMode === 'reservas') fetchReservations()
          }}
        />
      )}
    </div>
  )
}

// ── Contact detail modal ──────────────────────────────────────────────────────

interface DetailProps {
  contact: CRMContact
  restaurantId: string
  businessType: 'gastronomy' | 'retail' | 'services'
  onClose: () => void
  onUpdated: () => void
  onSelectReservation: (r: Reservation) => void
}

function ContactDetailModal({ contact, restaurantId, businessType, onClose, onUpdated, onSelectReservation }: DetailProps) {
  const [isVip, setIsVip] = useState(contact.is_vip)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [history, setHistory] = useState<Reservation[]>([])
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    let isMounted = true
    if (businessType === 'retail') {
      db.from('orders')
        .select('id, created_at, total, order_type, status')
        .eq('restaurant_id', restaurantId)
        .or(`customer_phone.eq.${contact.phone},customer_name.ilike.${contact.first_name}%`)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data }: { data: PurchaseRecord[] | null }) => {
          if (isMounted) setPurchases(data ?? [])
        })
    } else {
      db.from('reservations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('phone', contact.phone)
        .order('reservation_date', { ascending: false })
        .limit(10)
        .then(({ data }: { data: Reservation[] | null }) => {
          if (isMounted) setHistory(data ?? [])
        })
    }
    return () => { isMounted = false }
  }, [contact.phone, contact.first_name, restaurantId, businessType])

  // Frequency calculation: (today - first_visit) / total_visits
  const frequency = (() => {
    if (!contact.first_visit || contact.total_visits <= 1) return null
    const days = Math.floor((Date.now() - new Date(contact.first_visit).getTime()) / 86400000)
    return Math.max(1, Math.round(days / contact.total_visits))
  })()

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await db
        .from('crm_contacts')
        .update({ is_vip: isVip, notes: notes.trim() || null })
        .eq('id', contact.id)
      if (error) throw error
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
    <Modal isOpen onClose={onClose} title={`${contact.first_name} ${contact.last_name}`} dark>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Header stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Visitas', value: contact.total_visits },
            { label: 'Total gastado', value: `$${contact.total_spent?.toLocaleString('es-AR') ?? 0}` },
            { label: 'Ticket prom.', value: `$${contact.total_visits > 0 ? Math.round(contact.total_spent / contact.total_visits).toLocaleString('es-AR') : 0}` },
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
            {contact.first_visit && <p className="text-xs text-ink-3 mt-1">Primera visita: {contact.first_visit}</p>}
            {contact.last_visit && <p className="text-xs text-ink-3">Última visita: {contact.last_visit}</p>}
            {frequency && (
              <p className="text-xs text-ink-3 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                Viene cada ~{frequency} días
              </p>
            )}
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
            <Star className={`w-4 h-4 ${isVip ? 'text-yellow-500 fill-yellow-500' : 'text-ink-4'}`} />
            <span className="text-sm font-medium text-ink-2">Cliente VIP</span>
          </div>
          <button
            onClick={() => setIsVip(!isVip)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isVip ? 'bg-yellow-400' : 'bg-surface-4'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isVip ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1">Notas internas</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Preferencias, alergias, observaciones..."
            className="w-full border border-surface-3 rounded-xl px-3 py-2 text-sm bg-surface-2 text-ink-1 focus:outline-none focus:ring-2 focus:ring-brand resize-none placeholder:text-ink-4"
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

        {/* History — gastronomy: reservations, retail: purchases */}
        {businessType === 'retail' ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Historial de compras</p>
            {purchases.length === 0 ? (
              <p className="text-xs text-ink-4 py-2">Sin compras registradas</p>
            ) : (
              purchases.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-surface-3"
                >
                  <span className="text-ink-2">
                    🛍 {p.created_at?.slice(0, 10)} · {p.order_type ?? 'venta'}
                  </span>
                  <span className="font-bold text-ink-1">${p.total?.toLocaleString('es-AR')}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-widest">Historial de reservas</p>
            {history.length === 0 ? (
              <p className="text-xs text-ink-4 py-2">Sin reservas registradas</p>
            ) : (
              history.map(r => (
                <button
                  key={r.id}
                  onClick={() => onSelectReservation(r)}
                  className="w-full flex items-center justify-between text-xs p-2.5 rounded-lg bg-surface-3 hover:bg-surface-4 transition-colors text-left"
                >
                  <span className="text-ink-2">📅 {r.reservation_date} · {r.reservation_time} · {r.party_size} pers.</span>
                  <span style={{ color: STATUS_COLOR[r.status] ?? '#888', fontWeight: 600 }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-surface-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-surface-3 text-sm font-medium text-ink-3 hover:bg-surface-3 transition-colors">
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
