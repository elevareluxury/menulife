export type CustomerStatus = 'active' | 'inactive' | 'archived' | 'blocked' | 'lead'

export type CustomerSource =
  | 'instagram' | 'whatsapp' | 'referral' | 'google'
  | 'hub' | 'marketplace' | 'manual' | 'booking' | 'import' | 'other'

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, { label: string; color: string; bg: string }> = {
  active:   { label: 'Activo',    color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  inactive: { label: 'Inactivo',  color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  archived: { label: 'Archivado', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  blocked:  { label: 'Bloqueado', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  lead:     { label: 'Lead',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
}

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  instagram:   'Instagram',
  whatsapp:    'WhatsApp',
  referral:    'Referido',
  google:      'Google',
  hub:         'Hub Público',
  marketplace: 'Marketplace',
  manual:      'Manual',
  booking:     'Desde turno',
  import:      'Importado',
  other:       'Otro',
}

export interface ServiceCustomer {
  id: string
  restaurant_id: string
  location_id: string | null
  first_name: string
  last_name: string | null
  full_name: string         // GENERATED ALWAYS AS STORED en DB
  phone: string | null
  email: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
  avatar_url: string | null
  status: CustomerStatus
  source: CustomerSource
  tags: string[]
  notes: string | null
  total_bookings: number
  last_visit_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateCustomerInput {
  first_name: string
  last_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  source?: CustomerSource
  status?: CustomerStatus
  tags?: string[]
  birth_date?: string | null
  gender?: ServiceCustomer['gender']
}

export interface DuplicateCheck {
  byPhone: ServiceCustomer | null
  byEmail: ServiceCustomer | null
}
