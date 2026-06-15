import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { ResourceTypeIcon } from './ResourceTypeIcon'
import type { ServiceResourceType } from '../hooks/useServiceResourceTypes'
import type { CreateResourceInput } from '../hooks/useServiceResources'

/* ── Constants ───────────────────────────────────────────────── */

const COLOR_PALETTE = [
  '#F4705A', '#3B82F6', '#22C55E', '#8B5CF6',
  '#F59E0B', '#EC4899', '#14B8A6', '#EF4444',
  '#F97316', '#6B7280', '#0EA5E9', '#84CC16',
]

const CAPACITY_OPTIONS = [1, 2, 4, 6, 8, 10, 15, 20, 50]

/* ── Step indicator ──────────────────────────────────────────── */

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2, 3] as const).map(n => (
        <div
          key={n}
          className="rounded-full transition-all duration-200"
          style={{
            width:  step >= n ? 24 : 8,
            height: 8,
            backgroundColor: step >= n ? '#F4705A' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  )
}

/* ── Step 1 — Tipo ───────────────────────────────────────────── */

function StepTipo({
  types,
  selected,
  onSelect,
}: {
  types: ServiceResourceType[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-1">¿Qué tipo de recurso es?</h3>
      <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Seleccioná el tipo que mejor describe este recurso.
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {types.map(type => {
          const isSelected = selected === type.id
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl text-center transition-all duration-150"
              style={{
                backgroundColor: isSelected ? `${type.color}18` : '#1c1f26',
                border: `1.5px solid ${isSelected ? type.color : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${type.color}20` }}
              >
                <ResourceTypeIcon icon={type.icon} size={18} color={type.color} />
              </div>
              <span className="text-[11px] font-semibold leading-tight" style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {type.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Step 2 — Información ────────────────────────────────────── */

function StepInfo({
  name, setName,
  description, setDescription,
  color, setColor,
  capacity, setCapacity,
}: {
  name: string; setName: (v: string) => void
  description: string; setDescription: (v: string) => void
  color: string; setColor: (v: string) => void
  capacity: number; setCapacity: (v: number) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Información del recurso</h3>
        <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Completá los datos básicos. Podés editar todo después.
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          NOMBRE *
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Sofía, Sala A, Cancha 1..."
          maxLength={60}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 transition-all"
          style={{
            background: '#1c1f26',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#F4705A60'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,112,90,0.08)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          DESCRIPCIÓN <span style={{ color: 'rgba(255,255,255,0.25)' }}>(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Especialidad, características, observaciones..."
          rows={2}
          maxLength={200}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none focus:ring-1 transition-all"
          style={{
            background: '#1c1f26',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#F4705A60'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,112,90,0.08)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          COLOR DE IDENTIFICACIÓN
        </label>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-all duration-150 flex-shrink-0"
              style={{
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : 'none',
                outlineOffset: '2px',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          CAPACIDAD
        </label>
        <div className="flex flex-wrap gap-2">
          {CAPACITY_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setCapacity(n)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: capacity === n ? '#F4705A' : 'rgba(255,255,255,0.06)',
                color: capacity === n ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${capacity === n ? '#F4705A' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {n === 1 ? '1 persona' : `${n} personas`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Step 3 — Confirmar ──────────────────────────────────────── */

function StepConfirm({
  name,
  description,
  color,
  capacity,
  selectedType,
}: {
  name: string
  description: string
  color: string
  capacity: number
  selectedType: ServiceResourceType | undefined
}) {
  const initial = name.charAt(0).toUpperCase() || '?'
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-1">Confirmá los datos</h3>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Así va a verse tu nuevo recurso.
      </p>

      {/* Preview card */}
      <div
        className="rounded-2xl p-5 mb-5 flex items-start gap-4"
        style={{ backgroundColor: '#1c1f26', border: '1px solid #2a2d35' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-white truncate">{name || '—'}</h4>
          {selectedType && (
            <div className="flex items-center gap-1.5 mt-1">
              <ResourceTypeIcon icon={selectedType.icon} size={12} color={selectedType.color} />
              <span className="text-xs font-medium" style={{ color: selectedType.color }}>
                {selectedType.name}
              </span>
            </div>
          )}
          {description && (
            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: '#22C55E' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              Disponible
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Cap. {capacity}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Podés editar estos datos en cualquier momento.
      </p>
    </div>
  )
}

/* ── Main modal ──────────────────────────────────────────────── */

interface CreateResourceModalProps {
  restaurantId: string
  types: ServiceResourceType[]
  onClose: () => void
  onCreate: (input: CreateResourceInput) => Promise<boolean>
}

export function CreateResourceModal({ restaurantId, types, onClose, onCreate }: CreateResourceModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    types.find(t => t.is_system)?.id ?? null
  )
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [capacity, setCapacity] = useState(1)

  const selectedType = types.find(t => t.id === selectedTypeId)

  const canNext = (): boolean => {
    if (step === 1) return !!selectedTypeId
    if (step === 2) return name.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (step === 1 && !selectedTypeId) { toast.error('Seleccioná un tipo de recurso'); return }
    if (step === 2 && !name.trim()) { toast.error('El nombre es obligatorio'); return }
    if (step < 3) setStep(s => (s + 1) as 1 | 2 | 3)
  }

  const handleCreate = async () => {
    setSaving(true)
    const ok = await onCreate({
      restaurant_id: restaurantId,
      resource_type_id: selectedTypeId,
      name: name.trim(),
      description: description.trim() || null,
      color,
      capacity,
    })
    setSaving(false)
    if (ok) {
      toast.success(`Recurso "${name.trim()}" creado`)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full lg:max-w-md rounded-t-3xl lg:rounded-2xl flex flex-col"
        style={{
          background: '#13161C',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92dvh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0 flex-shrink-0">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Nuevo recurso
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Step dots */}
        <div className="px-5 pt-4">
          <StepDots step={step} />
        </div>

        {/* Content */}
        <div className="px-5 overflow-y-auto flex-1">
          {step === 1 && <StepTipo types={types} selected={selectedTypeId} onSelect={setSelectedTypeId} />}
          {step === 2 && (
            <StepInfo
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              color={color} setColor={setColor}
              capacity={capacity} setCapacity={setCapacity}
            />
          )}
          {step === 3 && (
            <StepConfirm
              name={name}
              description={description}
              color={color}
              capacity={capacity}
              selectedType={selectedType}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button
            onClick={step === 3 ? handleCreate : handleNext}
            disabled={!canNext() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ background: canNext() ? '#F4705A' : 'rgba(255,255,255,0.08)' }}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step === 3 ? (
              <><Check className="w-4 h-4" /> Crear recurso</>
            ) : (
              <>Continuar <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
