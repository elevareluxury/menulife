import { useState, useEffect } from 'react'
import { X, Link } from 'lucide-react'
import type { ServiceCatalogItem, BookingType, ServiceModality } from '../../types/booking'
import type { ServiceResourceType } from '../../hooks/useServiceResourceTypes'
import type { CatalogResourceEntry } from '../../hooks/useServiceCatalogResources'

const SERVICE_COLORS = [
  '#F4705A','#22C55E','#3B82F6','#8B5CF6','#F59E0B',
  '#EC4899','#14B8A6','#F97316','#6B7280','#EF4444',
]

const SERVICE_ICONS = ['💆','💪','🎯','📚','🎨','🏃','🧘','🎸','✂️','💻','📸','🏋️','🎓','🌿','🎭','🦷','👁️','🧪']

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180]

const MODALITY_OPTIONS: Array<{ value: ServiceModality; label: string }> = [
  { value: 'in_person', label: 'Presencial' },
  { value: 'online',    label: 'Online' },
  { value: 'home',      label: 'Domicilio' },
  { value: 'hybrid',    label: 'Híbrido' },
]

interface CreateServiceDrawerProps {
  open:              boolean
  item?:             ServiceCatalogItem | null
  initialResources?: CatalogResourceEntry[]
  defaultCurrency?:  string
  resourceTypes:     ServiceResourceType[]
  onClose:           () => void
  onSave: (
    input: Partial<ServiceCatalogItem>,
    resourceEntries: CatalogResourceEntry[],
  ) => Promise<boolean>
}

export function CreateServiceDrawer({
  open, item, initialResources = [], defaultCurrency, resourceTypes, onClose, onSave,
}: CreateServiceDrawerProps) {
  const [name,            setName]            = useState('')
  const [description,     setDescription]     = useState('')
  const [durationMin,     setDurationMin]      = useState(60)
  const [customDuration,  setCustomDuration]   = useState('')
  const [bufferMin,       setBufferMin]        = useState(0)
  const [showBuffer,      setShowBuffer]       = useState(false)
  const [price,           setPrice]            = useState('')
  const [currency,        setCurrency]         = useState(defaultCurrency ?? 'ARS')
  const [category,        setCategory]         = useState('')
  const [modality,        setModality]         = useState<ServiceModality>('in_person')
  const [onlineLink,      setOnlineLink]       = useState('')
  const [bookingType,     setBookingType]      = useState<BookingType>('individual')
  const [capacity,        setCapacity]         = useState('1')
  const [color,           setColor]            = useState(SERVICE_COLORS[0])
  const [icon,            setIcon]             = useState('')
  const [resources,       setResources]        = useState<CatalogResourceEntry[]>([])
  const [saving,          setSaving]           = useState(false)

  useEffect(() => {
    if (!open) return
    if (item) {
      setName(item.name)
      setDescription(item.description ?? '')
      setDurationMin(item.duration_minutes)
      setCustomDuration('')
      setBufferMin(item.buffer_minutes)
      setShowBuffer(item.buffer_minutes > 0)
      setPrice(item.price !== null ? String(item.price) : '')
      setCurrency(item.currency)
      setCategory(item.category ?? '')
      setModality(item.modality)
      setOnlineLink(item.online_link ?? '')
      setBookingType(item.booking_type)
      setCapacity(String(item.capacity))
      setColor(item.color)
      setIcon(item.icon ?? '')
      setResources(initialResources)
    } else {
      setName('')
      setDescription('')
      setDurationMin(60)
      setCustomDuration('')
      setBufferMin(0)
      setShowBuffer(false)
      setPrice('')
      setCurrency(defaultCurrency ?? 'ARS')
      setCategory('')
      setModality('in_person')
      setOnlineLink('')
      setBookingType('individual')
      setCapacity('1')
      setColor(SERVICE_COLORS[0])
      setIcon('')
      setResources([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  if (!open) return null

  const effectiveDuration = customDuration ? parseInt(customDuration) || 60 : durationMin

  const toggleResource = (typeId: string) => {
    setResources(prev => {
      const exists = prev.find(r => r.resource_type_id === typeId)
      if (exists) return prev.filter(r => r.resource_type_id !== typeId)
      return [...prev, { resource_type_id: typeId, quantity: 1, is_required: false }]
    })
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    const input: Partial<ServiceCatalogItem> = {
      name:             name.trim(),
      description:      description.trim() || null,
      duration_minutes: effectiveDuration,
      buffer_minutes:   showBuffer ? bufferMin : 0,
      price:            price ? parseFloat(price) : null,
      currency,
      category:         category.trim() || null,
      modality,
      online_link:      modality === 'online' || modality === 'hybrid' ? (onlineLink.trim() || null) : null,
      booking_type:     bookingType,
      capacity:         bookingType === 'group' ? (parseInt(capacity) || 1) : 1,
      color,
      icon:             icon || null,
      is_active:        item?.is_active ?? true,
    }
    const ok = await onSave(input, resources)
    setSaving(false)
    if (ok) onClose()
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
  const labelStyle = { color: 'rgba(255,255,255,0.5)' }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              {item ? 'Editar servicio' : 'Nuevo servicio'}
            </h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Color + Icon row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-2" style={labelStyle}>Color</label>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-7 h-7 rounded-lg transition-all"
                    style={{
                      background: c,
                      outline: color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: '2px',
                      opacity: color === c ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={labelStyle}>Ícono</label>
              <div className="flex flex-wrap gap-1 max-w-[160px]">
                {SERVICE_ICONS.map(ic => (
                  <button
                    key={ic}
                    onClick={() => setIcon(prev => prev === ic ? '' : ic)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all"
                    style={{
                      background: icon === ic ? `${color}25` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${icon === ic ? color + '50' : 'transparent'}`,
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>
              Nombre <span style={{ color: '#F4705A' }}>*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Masaje relajante 60min"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripción breve del servicio..."
              rows={2}
              className={inputCls + ' resize-none'}
              style={inputStyle}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Duración</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DURATION_PRESETS.map(d => (
                <button
                  key={d}
                  onClick={() => { setDurationMin(d); setCustomDuration('') }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: durationMin === d && !customDuration ? `${color}20` : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${durationMin === d && !customDuration ? color + '50' : 'transparent'}`,
                    color: durationMin === d && !customDuration ? color : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {d < 60 ? `${d}min` : `${Math.floor(d / 60)}${d % 60 ? `h ${d % 60}min` : 'h'}`}
                </button>
              ))}
              <input
                type="number"
                min="5"
                step="5"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                placeholder="Otro (min)"
                className="w-24 px-2 py-1.5 rounded-xl text-xs text-white outline-none placeholder:text-white/25"
                style={inputStyle}
              />
            </div>

            {/* Buffer toggle */}
            <button
              onClick={() => setShowBuffer(v => !v)}
              className="text-xs font-medium transition-colors"
              style={{ color: showBuffer ? '#F4705A' : 'rgba(255,255,255,0.3)' }}
            >
              {showBuffer ? '− Ocultar buffer entre turnos' : '+ Buffer entre turnos'}
            </button>
            {showBuffer && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={bufferMin}
                  onChange={e => setBufferMin(parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-2 rounded-xl text-xs text-white outline-none"
                  style={inputStyle}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>minutos de pausa post-servicio</span>
              </div>
            )}
          </div>

          {/* Price + Currency */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Precio</label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-24 px-2 py-2.5 rounded-xl text-sm text-white outline-none"
                style={inputStyle}
              >
                {['ARS','USD','EUR','BRL','CLP','COP','MXN','UYU'].map(c => (
                  <option key={c} value={c} style={{ background: '#13161C' }}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="Dejar vacío = A consultar"
                className={inputCls + ' flex-1'}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Categoría</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ej: Masajes, Pilates, Consultoría..."
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Modality */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Modalidad</label>
            <div className="grid grid-cols-2 gap-2">
              {MODALITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setModality(opt.value)}
                  className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: modality === opt.value ? `${color}20` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${modality === opt.value ? color + '50' : 'transparent'}`,
                    color: modality === opt.value ? color : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {(modality === 'online' || modality === 'hybrid') && (
              <div className="mt-2 flex items-center gap-2">
                <Link className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
                <input
                  value={onlineLink}
                  onChange={e => setOnlineLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className={inputCls + ' flex-1'}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Booking type */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Tipo de reserva</label>
            <div className="grid grid-cols-2 gap-2">
              {(['individual', 'group'] as BookingType[]).map(bt => (
                <button
                  key={bt}
                  onClick={() => setBookingType(bt)}
                  className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: bookingType === bt ? `${color}20` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${bookingType === bt ? color + '50' : 'transparent'}`,
                    color: bookingType === bt ? color : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {bt === 'individual' ? 'Individual' : 'Grupal'}
                </button>
              ))}
            </div>
            {bookingType === 'group' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Capacidad máxima:</span>
                <input
                  type="number"
                  min="2"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-20 px-2 py-2 rounded-xl text-xs text-white outline-none"
                  style={inputStyle}
                />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>personas</span>
              </div>
            )}
          </div>

          {/* Resource types */}
          {resourceTypes.length > 0 && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>
                Recursos necesarios (opcional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {resourceTypes.map(rt => {
                  const selected = resources.some(r => r.resource_type_id === rt.id)
                  return (
                    <button
                      key={rt.id}
                      onClick={() => toggleResource(rt.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: selected ? `${rt.color}20` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selected ? rt.color + '50' : 'transparent'}`,
                        color: selected ? rt.color : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      <span>{rt.icon}</span>
                      {rt.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            {saving ? 'Guardando...' : item ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </div>
    </>
  )
}
