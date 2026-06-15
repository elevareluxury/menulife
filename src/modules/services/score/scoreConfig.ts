export type CustomerTier =
  | 'new' | 'active' | 'frequent' | 'premium' | 'vip'
  | 'at_risk' | 'inactive' | 'lost' | 'ambassador'

export interface TierConfig {
  label:       string
  emoji:       string
  color:       string
  bg:          string
  description: string
}

export const TIER_CONFIG: Record<CustomerTier, TierConfig> = {
  new:        { label: 'Nuevo',     emoji: '✨', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', description: 'Primera interacción'           },
  active:     { label: 'Activo',    emoji: '👤', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  description: 'Cliente activo'                },
  frequent:   { label: 'Frecuente', emoji: '⭐', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', description: 'Visita frecuentemente'          },
  premium:    { label: 'Premium',   emoji: '💎', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', description: 'Alto nivel de compra'           },
  vip:        { label: 'VIP',       emoji: '🔥', color: '#F4705A', bg: 'rgba(244,112,90,0.12)', description: 'Cliente de alto valor'          },
  at_risk:    { label: 'En Riesgo', emoji: '⚠️', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  description: 'Está dejando de venir'         },
  inactive:   { label: 'Inactivo',  emoji: '💤', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', description: 'Sin actividad reciente'        },
  lost:       { label: 'Perdido',   emoji: '🚨', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  description: 'Sin actividad prolongada'      },
  ambassador: { label: 'Embajador', emoji: '🚀', color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  description: 'Cliente extremadamente valioso' },
}

export interface CustomerScore {
  id:                 string
  restaurant_id:      string
  customer_id:        string
  score:              number
  tier:               CustomerTier
  completed_bookings: number
  cancelled_bookings: number
  no_show_bookings:   number
  total_revenue:      number
  last_calculated_at: string
  created_at:         string
  updated_at:         string
}

export const TIER_FILTERS: Array<{ id: 'all' | CustomerTier | 'inactive_all'; label: string }> = [
  { id: 'all',          label: 'Todos'      },
  { id: 'ambassador',   label: '🚀 Embajador'},
  { id: 'vip',          label: '🔥 VIP'     },
  { id: 'premium',      label: '💎 Premium'  },
  { id: 'frequent',     label: '⭐ Frecuente'},
  { id: 'at_risk',      label: '⚠️ En Riesgo'},
  { id: 'inactive_all', label: '💤 Inactivos'},
]
