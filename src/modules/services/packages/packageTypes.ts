import type { AllowanceType } from '../membership/membershipTypes'

export type PackageStatus         = 'active' | 'expired' | 'cancelled' | 'pending'
export type PackageTemplateStatus = 'active' | 'inactive' | 'archived'
export type ConsumptionStrategy   = 'manual' | 'automatic' | 'hybrid'

export interface PackageItem {
  key:            string
  name:           string
  catalog_id:     string | null
  quantity:       number
  unit:           string
  allowance_type: AllowanceType
}

export interface PackageTemplate {
  id:                   string
  restaurant_id:        string
  name:                 string
  description:          string | null
  price:                number
  currency:             string
  items:                PackageItem[]
  validity_days:        number | null
  consumption_strategy: ConsumptionStrategy
  status:               PackageTemplateStatus
  color:                string | null
  icon:                 string | null
  sort_order:           number
  metadata:             Record<string, unknown>
  created_at:           string
  updated_at:           string
}

export interface Package {
  id:            string
  restaurant_id: string
  customer_id:   string
  template_id:   string | null
  status:        PackageStatus
  starts_at:     string
  expires_at:    string | null
  consumption:   Record<string, number>
  notes:         string | null
  metadata:      Record<string, unknown>
  created_at:    string
  updated_at:    string
  template?:     PackageTemplate | null
}

export interface PackageUsage {
  id:            string
  restaurant_id: string
  package_id:    string
  customer_id:   string
  item_key:      string
  booking_id:    string | null
  quantity:      number
  notes:         string | null
  used_at:       string
  created_at:    string
}

export interface PackageItemSummary {
  item:       PackageItem
  used:       number
  remaining:  number | null
  percentage: number
}

export const PACKAGE_STATUS_CONFIG: Record<PackageStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Activo',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  pending:   { label: 'Pendiente', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  expired:   { label: 'Vencido',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  cancelled: { label: 'Cancelado',color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export const CONSUMPTION_STRATEGY_CONFIG: Record<ConsumptionStrategy, { label: string; description: string }> = {
  manual:    { label: 'Manual',     description: 'El owner registra los consumos manualmente'             },
  automatic: { label: 'Automático', description: 'Se descuenta automáticamente al completar una reserva' },
  hybrid:    { label: 'Híbrido',    description: 'Automático + ajuste manual permitido'                  },
}

export const PACKAGE_COLORS = ['#F4705A', '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899']
export const PACKAGE_ICONS  = ['📦', '🎁', '💎', '⭐', '🔥', '🚀', '👑', '🎯', '🏆', '✨']
