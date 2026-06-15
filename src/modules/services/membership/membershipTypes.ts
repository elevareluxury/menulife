export type AllowanceType        = 'sessions' | 'hours' | 'credits' | 'visits' | 'unlimited' | 'custom'
export type AllowanceResetCycle  = 'billing' | 'weekly' | 'monthly' | 'never'
export type MembershipStatus     = 'active' | 'paused' | 'expired' | 'cancelled' | 'pending'
export type BillingCycle         = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'custom'
export type PlanStatus           = 'active' | 'inactive' | 'archived'
export type RenewalStrategy      = 'manual' | 'auto' | 'external'
export type MembershipVisibility = 'all_locations' | 'specific_locations'
export type MembershipHealth     = 'healthy' | 'warning' | 'critical'

export interface Allowance {
  key:             string
  allowance_type:  AllowanceType
  allowance_limit: number | null
  label:           string
  unit:            string
  reset_cycle:     AllowanceResetCycle
}

export interface MembershipPlan {
  id:            string
  restaurant_id: string
  name:          string
  description:   string | null
  price:         number
  currency:      string
  billing_cycle: BillingCycle
  status:        PlanStatus
  benefits:      Allowance[]
  color:         string | null
  icon:          string | null
  sort_order:    number
  visibility:    MembershipVisibility
  created_at:    string
  updated_at:    string
}

export interface Membership {
  id:               string
  restaurant_id:    string
  customer_id:      string
  plan_id:          string
  status:           MembershipStatus
  starts_at:        string
  ends_at:          string | null
  renewal_date:     string | null
  auto_renew:       boolean
  renewal_strategy: RenewalStrategy
  health:           MembershipHealth
  notes:            string | null
  created_at:       string
  updated_at:       string
  plan?:            MembershipPlan | null
}

export interface MembershipUsage {
  id:            string
  restaurant_id: string
  membership_id: string
  customer_id:   string
  benefit_key:   string
  quantity:      number
  notes:         string | null
  used_at:       string
  created_at:    string
}

export interface AllowanceSummary {
  allowance:  Allowance
  used:       number
  remaining:  number | null
  percentage: number
}

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:    'Mensual',
  quarterly:  'Trimestral',
  semiannual: 'Semestral',
  annual:     'Anual',
  custom:     'Personalizado',
}

export const ALLOWANCE_TYPE_CONFIG: Record<AllowanceType, { label: string; emoji: string; defaultUnit: string }> = {
  sessions:  { label: 'Sesiones',      emoji: '🎯', defaultUnit: 'sesión'  },
  hours:     { label: 'Horas',         emoji: '⏱️', defaultUnit: 'hora'    },
  credits:   { label: 'Créditos',      emoji: '💰', defaultUnit: 'crédito' },
  visits:    { label: 'Visitas',       emoji: '📅', defaultUnit: 'visita'  },
  unlimited: { label: 'Ilimitado',     emoji: '∞',  defaultUnit: ''        },
  custom:    { label: 'Personalizado', emoji: '✏️', defaultUnit: 'unidad'  },
}

export const MEMBERSHIP_STATUS_CONFIG: Record<MembershipStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Activa',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  paused:    { label: 'Pausada',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  expired:   { label: 'Vencida',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  cancelled: { label: 'Cancelada', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  pending:   { label: 'Pendiente', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
}

export const RENEWAL_STRATEGY_CONFIG: Record<RenewalStrategy, { label: string; description: string }> = {
  manual:   { label: 'Manual',     description: 'Renovación gestionada manualmente'         },
  auto:     { label: 'Automática', description: 'Renovación automática al vencer'           },
  external: { label: 'Externa',    description: 'Gestionada por Stripe, MercadoPago, etc.' },
}

export const RESET_CYCLE_LABELS: Record<AllowanceResetCycle, string> = {
  billing: 'Por ciclo de facturación',
  weekly:  'Semanal',
  monthly: 'Mensual',
  never:   'Sin reset (total)',
}

export const PLAN_COLORS = ['#F4705A', '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899']
export const PLAN_ICONS  = ['⭐', '💎', '🔥', '🚀', '👑', '🎯', '🏆', '✨']
