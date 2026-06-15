export type BookingStatus =
  | 'pending' | 'confirmed' | 'in_progress' | 'completed'
  | 'cancelled' | 'no_show' | 'rescheduled'

export type BookingType    = 'individual' | 'group'
export type ServiceModality = 'in_person' | 'online' | 'home' | 'hybrid'
export type AgendaView     = 'day' | 'week' | 'month' | 'timeline'

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pendiente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  confirmed:   { label: 'Confirmado', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)'  },
  in_progress: { label: 'En curso',   color: '#F4705A', bg: 'rgba(244,112,90,0.15)'  },
  completed:   { label: 'Completado', color: '#22C55E', bg: 'rgba(34,197,94,0.15)'   },
  cancelled:   { label: 'Cancelado',  color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  no_show:     { label: 'No vino',    color: '#EF4444', bg: 'rgba(239,68,68,0.15)'   },
  rescheduled: { label: 'Reagendado', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)'  },
}

export interface ServiceCatalogItem {
  id: string
  restaurant_id: string
  location_id: string | null
  name: string
  description: string | null
  duration_minutes: number
  buffer_minutes: number
  price: number | null
  currency: string
  color: string
  icon: string | null
  category: string | null
  booking_type: BookingType
  capacity: number
  modality: ServiceModality
  online_link: string | null
  is_active: boolean
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BookingResource {
  id: string
  resource_id: string
  resource: {
    id: string
    name: string
    color: string
    resource_type?: { id: string; name: string; icon: string } | null
  }
}

export interface ServiceBooking {
  id: string
  restaurant_id: string
  location_id: string | null
  catalog_id: string | null
  starts_at: string
  ends_at: string
  duration_minutes: number
  status: BookingStatus
  booking_type: BookingType
  capacity: number
  reserved_spots: number
  waitlist_count: number
  client_id: string | null
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  client_notes: string | null
  title: string | null
  notes: string | null
  modality: ServiceModality
  meet_url: string | null
  service_address: string | null
  recurrence_rule: string | null
  recurrence_parent_id: string | null
  rescheduled_from_id: string | null
  price_snapshot: number | null
  currency: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations (joined)
  catalog?: ServiceCatalogItem | null
  resources?: BookingResource[]
  customer?: import('./customer').ServiceCustomer | null
}

export interface ServiceBlock {
  id: string
  restaurant_id: string
  location_id: string | null
  resource_id: string | null
  title: string
  starts_at: string
  ends_at: string
  is_all_day: boolean
  block_type: 'vacation' | 'maintenance' | 'absence' | 'event' | 'manual'
  notes: string | null
  color: string
  created_at: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflicts: Array<{ id: string; client_name: string | null; starts_at: string; ends_at: string }>
  blocks: Array<{ id: string; title: string; starts_at: string; ends_at: string }>
}

export interface CreateBookingInput {
  restaurant_id: string
  catalog_id?: string | null
  starts_at: string
  ends_at: string
  duration_minutes: number
  status?: BookingStatus
  booking_type?: BookingType
  capacity?: number
  client_name?: string | null
  client_phone?: string | null
  client_email?: string | null
  client_notes?: string | null
  title?: string | null
  notes?: string | null
  modality?: ServiceModality
  price_snapshot?: number | null
  currency?: string
  resource_ids?: string[]
  customer_id?: string | null
}
