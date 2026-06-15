import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { ResourceTypeIcon } from './ResourceTypeIcon'
import { STATUS_CONFIG } from './ResourceCard'
import type { ServiceResource, UpdateResourceInput, ResourceStatus } from '../hooks/useServiceResources'
import type { ServiceResourceType } from '../hooks/useServiceResourceTypes'

const COLOR_PALETTE = [
  '#F4705A', '#3B82F6', '#22C55E', '#8B5CF6',
  '#F59E0B', '#EC4899', '#14B8A6', '#EF4444',
  '#F97316', '#6B7280', '#0EA5E9', '#84CC16',
]

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'available',   label: 'Disponible'    },
  { value: 'busy',        label: 'Ocupado'       },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'blocked',     label: 'Bloqueado'     },
  { value: 'inactive',    label: 'Inactivo'      },
]

interface EditResourceModalProps {
  resource: ServiceResource
  types: ServiceResourceType[]
  onClose: () => void
  onSave: (id: string, input: UpdateResourceInput) => Promise<boolean>
}

export function EditResourceModal({ resource, types, onClose, onSave }: EditResourceModalProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(resource.name)
  const [description, setDescription] = useState(resource.description ?? '')
  const [color, setColor] = useState(resource.color)
  const [capacity, setCapacity] = useState(resource.capacity)
  const [status, setStatus] = useState<ResourceStatus>(
    resource.status === 'active' ? 'available' : resource.status
  )
  const [typeId, setTypeId] = useState<string | null>(resource.resource_type_id)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const ok = await onSave(resource.id, {
      name: name.trim(),
      description: description.trim() || null,
      color,
      capacity,
      status,
      resource_type_id: typeId,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full lg:max-w-md rounded-t-3xl lg:rounded-2xl"
        style={{
          background: '#13161C',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-bold text-white">Editar recurso</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>NOMBRE *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none"
              style={{ background: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F4705A60' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
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
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
              style={{ background: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F4705A60' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>TIPO</label>
            <div className="grid grid-cols-4 gap-2">
              {types.slice(0, 8).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTypeId(t.id)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: typeId === t.id ? `${t.color}18` : '#1c1f26',
                    border: `1.5px solid ${typeId === t.id ? t.color : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <ResourceTypeIcon icon={t.icon} size={14} color={typeId === t.id ? t.color : 'rgba(255,255,255,0.35)'} />
                  <span className="text-[10px] font-medium leading-tight text-center" style={{ color: typeId === t.id ? t.color : 'rgba(255,255,255,0.4)' }}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>ESTADO</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => {
                const cfg = STATUS_CONFIG[opt.value]
                const isSelected = status === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: isSelected ? cfg.bg : 'rgba(255,255,255,0.04)',
                      color: isSelected ? cfg.color : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${isSelected ? `${cfg.color}40` : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>COLOR</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
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
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>CAPACIDAD</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={capacity}
              onChange={e => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-3 py-2 rounded-xl text-sm text-white outline-none text-center"
              style={{ background: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#F4705A60' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
              style={{ background: '#F4705A' }}
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Save className="w-4 h-4" /> Guardar</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
