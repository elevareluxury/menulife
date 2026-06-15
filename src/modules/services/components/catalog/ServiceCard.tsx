import { useState } from 'react'
import { Clock, MapPin, Wifi, Home, ArrowLeftRight, Users, Edit3, Trash2, ChevronDown } from 'lucide-react'
import type { ServiceCatalogItem, ServiceModality } from '../../types/booking'
import { ServiceBadge } from '../ServiceBadge'

function fmtDuration(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function fmtPrice(price: number | null, currency: string): string {
  if (price === null) return 'A consultar'
  return `${currency} ${price.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const MODALITY_CONFIG: Record<ServiceModality, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  in_person: { label: 'Presencial', color: '#22C55E', bg: 'rgba(34,197,94,0.12)',    Icon: MapPin         },
  online:    { label: 'Online',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',   Icon: Wifi           },
  home:      { label: 'Domicilio',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',   Icon: Home           },
  hybrid:    { label: 'Híbrido',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',   Icon: ArrowLeftRight },
}

interface ServiceCardProps {
  item: ServiceCatalogItem
  onEdit:         (item: ServiceCatalogItem) => void
  onToggleActive: (id: string, isActive: boolean) => void
  onDelete:       (item: ServiceCatalogItem) => void
}

export function ServiceCard({ item, onEdit, onToggleActive, onDelete }: ServiceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const modality = MODALITY_CONFIG[item.modality] ?? MODALITY_CONFIG.in_person
  const ModalityIcon = modality.Icon

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-150"
      style={{
        background: '#13161C',
        border: `1px solid ${item.is_active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
        opacity: item.is_active ? 1 : 0.6,
      }}
    >
      <div className="flex items-start gap-3">

        {/* Color indicator */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: `${item.color}20`, border: `1.5px solid ${item.color}50` }}
        >
          {item.icon ?? <span style={{ color: item.color, fontSize: 18 }}>◆</span>}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{item.name}</p>
              {item.category && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {item.category}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(item)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Edit3 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-8 z-20 rounded-xl overflow-hidden min-w-[140px]"
                      style={{ background: '#1e2128', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                    >
                      <button
                        onClick={() => { setMenuOpen(false); onToggleActive(item.id, !item.is_active) }}
                        className="w-full px-3 py-2.5 text-left text-xs font-medium transition-colors hover:opacity-80"
                        style={{ color: item.is_active ? '#F59E0B' : '#22C55E' }}
                      >
                        {item.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                      <button
                        onClick={() => { setMenuOpen(false); onDelete(item) }}
                        className="w-full px-3 py-2.5 text-left text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
            {/* Duration */}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
            >
              <Clock className="w-3 h-3" />
              {fmtDuration(item.duration_minutes)}
            </span>

            {/* Modality */}
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
              style={{ background: modality.bg, color: modality.color }}
            >
              <ModalityIcon className="w-3 h-3" />
              {modality.label}
            </span>

            {/* Group capacity */}
            {item.booking_type === 'group' && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}
              >
                <Users className="w-3 h-3" />
                {item.capacity} personas
              </span>
            )}

            {!item.is_active && (
              <ServiceBadge variant="neutral">Inactivo</ServiceBadge>
            )}
          </div>

          {/* Price row */}
          <div className="mt-2">
            <p
              className="text-sm font-bold"
              style={{ color: item.price !== null ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              {fmtPrice(item.price, item.currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
