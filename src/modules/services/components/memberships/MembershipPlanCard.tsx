import { useState } from 'react'
import { MoreVertical, Edit2, Archive, MapPin } from 'lucide-react'
import type { MembershipPlan } from '../../membership/membershipTypes'
import { BILLING_CYCLE_LABELS, ALLOWANCE_TYPE_CONFIG } from '../../membership/membershipTypes'
import { ServiceBadge } from '../ServiceBadge'

interface MembershipPlanCardProps {
  plan:       MembershipPlan
  onEdit?:    (plan: MembershipPlan) => void
  onArchive?: (id: string) => void
}

export function MembershipPlanCard({ plan, onEdit, onArchive }: MembershipPlanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const color = plan.color ?? '#F4705A'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: `1px solid ${color}28` }}
    >
      {/* Accent strip */}
      <div className="h-1" style={{ background: color }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: `${color}15` }}
            >
              {plan.icon ?? '⭐'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-tight">{plan.name}</p>
              {plan.description && (
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ServiceBadge variant={plan.status === 'active' ? 'success' : 'neutral'}>
              {plan.status === 'active' ? 'Activo' : 'Inactivo'}
            </ServiceBadge>

            {plan.visibility === 'specific_locations' && (
              <ServiceBadge variant="purple" icon={<MapPin className="w-2.5 h-2.5" />}>
                Local
              </ServiceBadge>
            )}

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
                          onClick={() => { onEdit(plan); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}
                      {onArchive && (
                        <button
                          onClick={() => { onArchive(plan.id); setMenuOpen(false) }}
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

        {/* Price */}
        <div className="mb-3">
          <span className="text-xl font-bold" style={{ color }}>
            {plan.currency} {plan.price.toLocaleString('es-AR')}
          </span>
          <span className="text-xs font-medium ml-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            / {BILLING_CYCLE_LABELS[plan.billing_cycle].toLowerCase()}
          </span>
        </div>

        {/* Benefits */}
        {plan.benefits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.benefits.map(b => {
              const cfg = ALLOWANCE_TYPE_CONFIG[b.allowance_type]
              return (
                <span
                  key={b.key}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
                >
                  {cfg.emoji}
                  {b.allowance_limit === null ? '∞' : b.allowance_limit}
                  {b.unit ? ` ${b.unit}` : ''}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
