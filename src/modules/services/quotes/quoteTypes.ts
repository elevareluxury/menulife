export type QuoteStatus         = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled'
export type QuoteTemplateStatus = 'active' | 'inactive' | 'archived'
export type QuoteSource         = 'manual' | 'hub' | 'form' | 'crm' | 'portal' | 'api'
export type ConversionTargetType = 'membership' | 'package' | 'booking' | 'pos_sale' | 'custom'

export interface QuoteTemplate {
  id:              string
  restaurant_id:   string
  name:            string
  description:     string | null
  status:          QuoteTemplateStatus
  currency:        string
  expiration_days: number | null
  color:           string | null
  icon:            string | null
  sort_order:      number
  metadata:        Record<string, unknown>
  created_at:      string
  updated_at:      string
}

export interface QuoteItem {
  id:          string
  quote_id:    string
  name:        string
  description: string | null
  quantity:    number
  unit_price:  number
  discount:    number
  total:       number
  sort_order:  number
  metadata:    Record<string, unknown>
  created_at:  string
}

export interface QuoteEvent {
  id:          string
  quote_id:    string
  event_type:  string
  description: string | null
  metadata:    Record<string, unknown>
  created_at:  string
}

export interface Quote {
  id:                     string
  restaurant_id:          string
  customer_id:            string
  template_id:            string | null
  quote_number:           string
  title:                  string
  description:            string | null
  status:                 QuoteStatus
  subtotal:               number
  tax_amount:             number
  total_amount:           number
  currency:               string
  expires_at:             string | null
  sent_at:                string | null
  viewed_at:              string | null
  accepted_at:            string | null
  rejected_at:            string | null
  converted_at:           string | null
  accepted_ip:            string | null
  accepted_user_agent:    string | null
  accepted_by:            string | null
  token:                  string | null
  sales_owner_id:         string | null
  conversion_target_type: ConversionTargetType | null
  conversion_target_id:   string | null
  source:                 QuoteSource
  notes:                  string | null
  metadata:               Record<string, unknown>
  created_at:             string
  updated_at:             string
  // Relations
  template?: QuoteTemplate | null
  items?:    QuoteItem[]
}

// Para el builder — entidad local sin ID (aún no guardada)
export interface QuoteItemInput {
  key:         string
  name:        string
  description: string
  quantity:    number
  unit_price:  number
  discount:    number
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Borrador',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  sent:      { label: 'Enviado',    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  viewed:    { label: 'Visto',      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  accepted:  { label: 'Aceptado',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  rejected:  { label: 'Rechazado',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  expired:   { label: 'Vencido',    color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  converted: { label: 'Convertido', color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  cancelled: { label: 'Cancelado',  color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

export const QUOTE_COLORS = ['#F4705A', '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899']
export const QUOTE_ICONS  = ['📋', '📄', '🎯', '💡', '⭐', '📊', '💼', '📈', '🤝', '✨']

export const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN']
