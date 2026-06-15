import { Phone, Mail, CalendarDays, ChevronRight } from 'lucide-react'
import type { ServiceCustomer } from '../../types/customer'
import { CUSTOMER_STATUS_CONFIG } from '../../types/customer'
import type { CustomerScore } from '../../score/scoreConfig'
import { TIER_CONFIG } from '../../score/scoreConfig'

interface CustomerCardProps {
  customer: ServiceCustomer
  score?:   CustomerScore | null
  onClick:  (customer: ServiceCustomer) => void
}

export function CustomerCard({ customer, score, onClick }: CustomerCardProps) {
  const cfg = score ? TIER_CONFIG[score.tier] : CUSTOMER_STATUS_CONFIG[customer.status]

  const initials = customer.full_name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const lastVisit = customer.last_visit_at
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(customer.last_visit_at))
    : null

  const badgeLabel = score ? `${TIER_CONFIG[score.tier].emoji} ${TIER_CONFIG[score.tier].label}` : cfg.label

  return (
    <button
      onClick={() => onClick(customer)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.025] active:bg-white/[0.03]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 select-none"
        style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
      >
        {initials || '?'}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-white truncate">{customer.full_name}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-px rounded-full flex-shrink-0 leading-4"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {badgeLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 min-w-0">
          {customer.phone && (
            <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Phone className="w-3 h-3 flex-shrink-0" />
              {customer.phone}
            </span>
          )}
          {customer.email && !customer.phone && (
            <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Mail className="w-3 h-3 flex-shrink-0" />
              {customer.email}
            </span>
          )}
        </div>

        {customer.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {customer.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-px rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
              >
                {tag}
              </span>
            ))}
            {customer.tags.length > 3 && (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                +{customer.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats + chevron */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.18)' }} />
        {customer.total_bookings > 0 && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <CalendarDays className="w-3 h-3" />
            {customer.total_bookings}
          </span>
        )}
        {lastVisit && (
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
            {lastVisit}
          </span>
        )}
      </div>
    </button>
  )
}
