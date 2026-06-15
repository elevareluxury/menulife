import { useState, useEffect } from 'react'
import { X, ChevronRight, AlertTriangle, Check, Clock, User, Layers, CalendarDays } from 'lucide-react'
import type { ServiceCatalogItem, CreateBookingInput, ConflictResult } from '../../types/booking'
import type { ServiceResource } from '../../hooks/useServiceResources'
import { checkBookingConflicts } from '../../utils/checkBookingConflicts'
import { localTimeToUtc, getLocalDateStr, formatLocalTime } from '../../utils/timezone'
import toast from 'react-hot-toast'

const STEP_ICONS = [User, Layers, CalendarDays, Check]
const STEP_LABELS = ['Cliente', 'Servicio', 'Horario', 'Confirmar']

const TIME_SLOTS: Array<{ hour: number; minute: number; label: string }> = Array.from(
  { length: 28 },
  (_, i) => {
    const totalMinutes = 8 * 60 + i * 30
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return { hour: h, minute: m, label: `${pad(h)}:${pad(m)}` }
  },
)

interface Props {
  restaurantId: string
  timezone: string
  catalogItems: ServiceCatalogItem[]
  resources: ServiceResource[]
  initialDate?: Date
  initialHour?: number
  initialMinute?: number
  onClose: () => void
  onCreated: (input: CreateBookingInput) => Promise<boolean>
}

export function CreateBookingDrawer({
  restaurantId,
  timezone,
  catalogItems,
  resources,
  initialDate,
  initialHour = 10,
  initialMinute = 0,
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<ConflictResult | null>(null)
  const [checkingConflict, setCheckingConflict] = useState(false)

  // Step 1 — Client
  const [clientName,  setClientName]  = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientNotes, setClientNotes] = useState('')

  // Step 2 — Service
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null)

  // Step 3 — Schedule
  const today = initialDate ?? new Date()
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [selectedHour, setSelectedHour] = useState(initialHour)
  const [selectedMinute, setSelectedMinute] = useState(initialMinute)
  const [duration, setDuration] = useState(60)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // Sync duration from service
  useEffect(() => {
    if (selectedService) setDuration(selectedService.duration_minutes)
  }, [selectedService])

  // Check conflicts when step 3 is shown or slot/resource changes
  useEffect(() => {
    if (step !== 2) return
    let cancelled = false
    ;(async () => {
      setCheckingConflict(true)
      const startsAt = localTimeToUtc(selectedDate, selectedHour, selectedMinute, timezone)
      const endsAt   = new Date(startsAt.getTime() + duration * 60_000)
      const result   = await checkBookingConflicts(restaurantId, startsAt, endsAt, selectedResourceIds)
      if (!cancelled) { setConflict(result); setCheckingConflict(false) }
    })()
    return () => { cancelled = true }
  }, [step, selectedDate, selectedHour, selectedMinute, duration, selectedResourceIds, restaurantId, timezone])

  function canAdvance() {
    if (step === 0) return clientName.trim().length > 0
    if (step === 1) return true // service is optional
    if (step === 2) return !checkingConflict
    return true
  }

  function getStartsAt() {
    return localTimeToUtc(selectedDate, selectedHour, selectedMinute, timezone)
  }

  function getEndsAt() {
    const s = getStartsAt()
    return new Date(s.getTime() + duration * 60_000)
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      const startsAt = getStartsAt()
      const endsAt   = getEndsAt()
      const ok = await onCreated({
        restaurant_id:    restaurantId,
        catalog_id:       selectedService?.id ?? null,
        starts_at:        startsAt.toISOString(),
        ends_at:          endsAt.toISOString(),
        duration_minutes: duration,
        status:           'confirmed',
        booking_type:     selectedService?.booking_type ?? 'individual',
        capacity:         selectedService?.capacity ?? 1,
        client_name:      clientName.trim() || null,
        client_phone:     clientPhone.trim() || null,
        client_email:     clientEmail.trim() || null,
        client_notes:     clientNotes.trim() || null,
        notes:            notes.trim() || null,
        modality:         selectedService?.modality ?? 'in_person',
        price_snapshot:   selectedService?.price ?? null,
        currency:         selectedService?.currency ?? 'ARS',
        resource_ids:     selectedResourceIds,
      })
      if (ok) {
        toast.success('Reserva creada')
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  const dateStr  = getLocalDateStr(selectedDate, timezone)
  const startsAt = getStartsAt()
  const endsAt   = getEndsAt()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full lg:w-[520px] rounded-t-3xl lg:rounded-2xl flex flex-col"
        style={{
          background: '#13161C',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h2 className="text-base font-bold text-white">Nueva reserva</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Paso {step + 1} de 4 — {STEP_LABELS[step]}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 px-5 py-3">
          {STEP_LABELS.map((_, i) => {
            const Icon = STEP_ICONS[i]
            const done   = i < step
            const active = i === step
            return (
              <div
                key={i}
                className="flex-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                style={{
                  backgroundColor: active ? 'rgba(244,112,90,0.12)' : done ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                }}
              >
                <Icon
                  className="w-3 h-3 flex-shrink-0"
                  style={{ color: active ? '#F4705A' : done ? '#22C55E' : 'rgba(255,255,255,0.25)' }}
                />
                <span
                  className="text-[10px] font-semibold hidden sm:block"
                  style={{ color: active ? '#F4705A' : done ? '#22C55E' : 'rgba(255,255,255,0.25)' }}
                >
                  {STEP_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

          {/* STEP 0 — Cliente */}
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Nombre *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="Juan García"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  placeholder="0341 555-1234"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="juan@email.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Nota del cliente</label>
                <textarea
                  placeholder="Alergias, preferencias…"
                  value={clientNotes}
                  onChange={e => setClientNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>
          )}

          {/* STEP 1 — Servicio */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs text-white/40 mb-2">Seleccioná el servicio (opcional)</p>
              <button
                onClick={() => setSelectedService(null)}
                className="w-full text-left rounded-xl px-4 py-3 transition-all"
                style={{
                  background: !selectedService ? 'rgba(244,112,90,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${!selectedService ? '#F4705A' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <p className="text-sm font-semibold" style={{ color: !selectedService ? '#F4705A' : 'rgba(255,255,255,0.6)' }}>
                  Sin servicio específico
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Reserva manual, reunión o bloqueo
                </p>
              </button>
              {catalogItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedService(item)}
                  className="w-full text-left rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: selectedService?.id === item.id ? `${item.color}18` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${selectedService?.id === item.id ? item.color : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        {item.description && (
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {item.duration_minutes}min
                      </p>
                      {item.price != null && (
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          ${item.price.toLocaleString('es-AR')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {catalogItems.length === 0 && (
                <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  No hay servicios en el catálogo aún.
                </p>
              )}
            </div>
          )}

          {/* STEP 2 — Horario */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={e => {
                    const d = new Date(e.target.value + 'T12:00:00Z')
                    setSelectedDate(d)
                  }}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Time slots */}
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-2">Hora de inicio</label>
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {TIME_SLOTS.map(slot => {
                    const isSelected = slot.hour === selectedHour && slot.minute === selectedMinute
                    return (
                      <button
                        key={slot.label}
                        onClick={() => { setSelectedHour(slot.hour); setSelectedMinute(slot.minute) }}
                        className="py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: isSelected ? '#F4705A' : 'rgba(255,255,255,0.05)',
                          color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {slot.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-2">Duración</label>
                <div className="flex gap-2 flex-wrap">
                  {[15, 30, 45, 60, 90, 120].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: duration === d ? '#F4705A' : 'rgba(255,255,255,0.05)',
                        color: duration === d ? '#fff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {d < 60 ? `${d}min` : `${d / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resources */}
              {resources.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-white/60 block mb-2">Recursos (opcional)</label>
                  <div className="space-y-1.5">
                    {resources.filter(r => r.is_active).map(r => {
                      const selected = selectedResourceIds.includes(r.id)
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedResourceIds(prev =>
                            selected ? prev.filter(x => x !== r.id) : [...prev, r.id]
                          )}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                          style={{
                            background: selected ? `${r.color}18` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${selected ? r.color : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                            <span className="text-sm text-white">{r.name}</span>
                          </div>
                          {selected && <Check className="w-3.5 h-3.5" style={{ color: r.color }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Conflict warning */}
              {checkingConflict && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Verificando disponibilidad…
                </div>
              )}
              {!checkingConflict && conflict?.hasConflict && (
                <div
                  className="flex items-start gap-2 rounded-xl p-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                      Conflicto detectado
                    </p>
                    {conflict.conflicts.map(c => (
                      <p key={c.id} className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {c.client_name ?? 'Reserva'} — {formatLocalTime(c.starts_at, timezone)}–{formatLocalTime(c.ends_at, timezone)}
                      </p>
                    ))}
                    {conflict.blocks.map(b => (
                      <p key={b.id} className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Bloqueo: {b.title}
                      </p>
                    ))}
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Podés continuar de todos modos si es intencional.
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-white/60 block mb-1.5">Notas internas</label>
                <textarea
                  placeholder="Indicaciones, preparación…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(244,112,90,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>
          )}

          {/* STEP 3 — Confirmar */}
          {step === 3 && (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Client */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,112,90,0.15)' }}>
                    <User className="w-4 h-4" style={{ color: '#F4705A' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{clientName || '—'}</p>
                    {clientPhone && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{clientPhone}</p>}
                    {clientEmail && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{clientEmail}</p>}
                  </div>
                </div>
                <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* Service */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${selectedService?.color ?? '#6B7280'}18` }}
                  >
                    <Layers className="w-4 h-4" style={{ color: selectedService?.color ?? '#6B7280' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedService?.name ?? 'Sin servicio'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {duration}min
                      {selectedService?.price != null && ` · $${selectedService.price.toLocaleString('es-AR')}`}
                    </p>
                  </div>
                </div>
                <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

                {/* Time */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
                    <CalendarDays className="w-4 h-4" style={{ color: '#3B82F6' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {startsAt.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {formatLocalTime(startsAt, timezone)} → {formatLocalTime(endsAt, timezone)}
                    </p>
                  </div>
                </div>

                {/* Resources */}
                {selectedResourceIds.length > 0 && (
                  <>
                    <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex flex-wrap gap-1.5">
                      {selectedResourceIds.map(rid => {
                        const r = resources.find(x => x.id === rid)
                        if (!r) return null
                        return (
                          <span
                            key={rid}
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${r.color}20`, color: r.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                            {r.name}
                          </span>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: '#F4705A', color: '#fff' }}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#22C55E', color: '#fff' }}
            >
              <Check className="w-4 h-4" />
              {saving ? 'Creando…' : 'Confirmar reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
