import { useState } from 'react'
import { MoreVertical, Edit2, Archive } from 'lucide-react'
import type { PackageTemplate } from '../../packages/packageTypes'
import { CONSUMPTION_STRATEGY_CONFIG } from '../../packages/packageTypes'
import { ALLOWANCE_TYPE_CONFIG } from '../../membership/membershipTypes'
import { ServiceBadge } from '../ServiceBadge'

interface PackageTemplateCardProps {
  template:  PackageTemplate
  onEdit?:   (t: PackageTemplate) => void
  onArchive?: (id: string) => void
}

export function PackageTemplateCard({ template, onEdit, onArchive }: PackageTemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const color = template.color ?? '#F4705A'
  const strategy = CONSUMPTION_STRATEGY_CONFIG[template.consumption_strategy]

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: `1px solid ${color}28` }}
    >
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${color}15` }}
            >
              {template.icon ?? '📦'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{template.name}</p>
              {template.description && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {template.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ServiceBadge variant={template.status === 'active' ? 'success' : 'neutral'}>
              {template.status === 'active' ? 'Activo' : 'Inactivo'}
            </ServiceBadge>

            {(onEdit || onArchive) && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[140px]"
                      style={{ background: '#1C2028', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                    >
                      {onEdit && (
                        <button
                          onClick={() => { onEdit(template); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}
                      {onArchive && (
                        <button
                          onClick={() => { onArchive(template.id); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                          style={{ color: '#EF4444' }}
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archivar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price + validity */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold" style={{ color }}>
            {template.currency} {template.price.toLocaleString('es-AR')}
          </span>
          {template.validity_days && (
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              · Vence en {template.validity_days}d
            </span>
          )}
        </div>

        {/* Items */}
        {template.items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {template.items.map(item => {
              const cfg = ALLOWANCE_TYPE_CONFIG[item.allowance_type]
              return (
                <span
                  key={item.key}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  {cfg.emoji}
                  {item.allowance_type === 'unlimited' ? '∞' : item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                  {item.name ? ` ${item.name}` : ''}
                </span>
              )
            })}
          </div>
        )}

        {/* Consumption strategy badge */}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
        >
          {strategy.label}
        </span>
      </div>
    </div>
  )
}
