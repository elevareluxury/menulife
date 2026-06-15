import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { ResourceTypeIcon } from './ResourceTypeIcon'
import type { ServiceResource, ResourceStatus } from '../hooks/useServiceResources'

/* ── Status config ───────────────────────────────────────────── */

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: 'Disponible',     color: '#22C55E', bg: '#0d1a12' },
  active:      { label: 'Disponible',     color: '#22C55E', bg: '#0d1a12' },
  busy:        { label: 'Ocupado',        color: '#F4705A', bg: '#1a0f0d' },
  maintenance: { label: 'Mantenimiento',  color: '#F59E0B', bg: '#1a150a' },
  blocked:     { label: 'Bloqueado',      color: '#6B7280', bg: '#111318' },
  inactive:    { label: 'Inactivo',       color: '#4B5563', bg: '#111318' },
}

function getStatus(r: ServiceResource) {
  if (!r.is_active) return STATUS_CONFIG.inactive
  return STATUS_CONFIG[r.status] ?? STATUS_CONFIG.inactive
}

/* ── Status cycle for quick-toggle ──────────────────────────── */
const STATUS_CYCLE: ResourceStatus[] = ['available', 'busy', 'maintenance', 'blocked']

function nextStatus(current: ResourceStatus): ResourceStatus {
  const idx = STATUS_CYCLE.indexOf(current === 'active' ? 'available' : current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

/* ── Context menu ────────────────────────────────────────────── */

interface ContextMenuProps {
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

function ContextMenu({ onEdit, onDelete, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[140px]"
      style={{ background: '#1c1f26', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
    >
      <button
        onClick={() => { onEdit(); onClose() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" /> Editar
      </button>
      <button
        onClick={() => { onDelete(); onClose() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors"
        style={{ color: '#F87171' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = '' }}
      >
        <Trash2 className="w-3.5 h-3.5" /> Eliminar
      </button>
    </div>
  )
}

/* ── Resource Card ───────────────────────────────────────────── */

interface ResourceCardProps {
  resource: ServiceResource
  onStatusChange: (id: string, status: ResourceStatus) => void
  onEdit: (resource: ServiceResource) => void
  onDelete: (id: string) => void
}

export function ResourceCard({ resource, onStatusChange, onEdit, onDelete }: ResourceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = getStatus(resource)
  const initial = resource.name.charAt(0).toUpperCase()

  const handleStatusClick = () => {
    const next = nextStatus(resource.status)
    onStatusChange(resource.id, next)
  }

  return (
    <div
      className="relative flex flex-col rounded-2xl p-4 transition-all duration-200"
      style={{
        backgroundColor: '#1c1f26',
        border: '1px solid rgba(255,255,255,0.07)',
        opacity: !resource.is_active || resource.status === 'inactive' ? 0.55 : 1,
      }}
    >
      {/* Avatar + menu */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: resource.color }}
        >
          {resource.image_url ? (
            <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <ContextMenu
              onEdit={() => onEdit(resource)}
              onDelete={() => onDelete(resource.id)}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Name */}
      <p className="text-sm font-bold text-white leading-tight mb-1 truncate">{resource.name}</p>

      {/* Type */}
      {resource.resource_type && (
        <div className="flex items-center gap-1 mb-2.5">
          <ResourceTypeIcon
            icon={resource.resource_type.icon}
            size={11}
            color={resource.resource_type.color}
          />
          <span className="text-[11px] font-medium" style={{ color: resource.resource_type.color }}>
            {resource.resource_type.name}
          </span>
        </div>
      )}

      {/* Capacity */}
      {resource.capacity > 1 && (
        <p className="text-[10px] mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Cap. {resource.capacity}
        </p>
      )}

      {/* Status toggle button */}
      <button
        onClick={handleStatusClick}
        className="mt-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 self-start"
        style={{
          backgroundColor: status.bg,
          color: status.color,
          border: `1px solid ${status.color}30`,
        }}
        title="Click para cambiar estado"
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color }}
        />
        {status.label}
      </button>
    </div>
  )
}
