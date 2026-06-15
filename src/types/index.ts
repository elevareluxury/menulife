export type UserRole = 'super_admin' | 'restaurant_owner'

export interface User {
  id: string
  email: string
  role: UserRole
}

export interface Restaurant {
  id: string
  owner_id: string
  slug: string
  name: string
  name_en?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
  description?: string | null
  description_en?: string | null
  default_currency: string            // ISO 4217 — any code (ARS, USD, EUR, BRL…)
  default_language: string            // BCP-47 lowercase: 'es', 'en', 'pt', 'fr', 'it', 'de'
  timezone?: string                   // IANA timezone string
  schedule?: unknown
  is_open: boolean
  is_active: boolean
  plan: 'hub_free' | 'os_gastronomy' | 'os_full'
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
  mercadopago_enabled: boolean
  created_at: string
  // Settings fields
  website?: string | null
  country?: string | null
  province?: string | null
  address_extra?: string | null
  postal_code?: string | null
  directions?: string | null
  social_links?: unknown
  menu_accent_color?: string | null
  menu_card_style?: string | null
  show_prices?: boolean
  show_descriptions?: boolean
  show_calories?: boolean
  onboarding_completed?: boolean
  // Delivery & Takeaway config
  delivery_enabled?: boolean
  delivery_time_estimate?: number | null
  delivery_min_order?: number | null
  delivery_fee_type?: 'fixed' | 'percentage' | 'zone' | null
  delivery_fee_value?: number | null
  delivery_zones?: DeliveryZone[] | unknown
  takeaway_enabled?: boolean
  takeaway_time_estimate?: number | null
  allow_language_switch?: boolean
  // Globalization — Phase 17
  locale?: string | null              // BCP-47 full tag: 'es-AR', 'en-US', 'pt-BR'
  date_format?: string | null         // 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | …
  time_format?: string | null         // '24h' | '12h'
  number_format?: string | null       // Intl.NumberFormat locale: 'es-AR' | 'en-US' | …
  // Reservations config
  reservations_enabled?: boolean
  reservations_collect_guests?: boolean
  reservations_advance_days?: number | null
  reservations_min_hours?: number | null
  reservations_max_party?: number | null
  reservations_time_slots?: string[] | null
  reservations_message?: string | null
  features?: unknown
  google_review_link?: string | null
  business_type?: 'gastronomy' | 'retail' | 'services'
}

export interface MenuSection {
  id: string
  restaurant_id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  section_id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  price_ars: number
  price_usd: number
  image_url: string
  video_url: string | null
  is_available: boolean
  sort_order: number
  allergens: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

/** @deprecated Use string (ISO 4217) — kept for backward compat */
export type Currency = string
/** @deprecated Use string (BCP-47 lowercase) — kept for backward compat */
export type Language = string

export interface MenuFilters {
  search: string
  tags: string[]
}

export interface Waiter {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  pin?: string
  is_active: boolean
  is_on_shift: boolean
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface Table {
  id: string
  restaurant_id: string
  table_number: string
  capacity: number
  position_x: number
  position_y: number
  status: 'free' | 'occupied' | 'reserved'
  waiter_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WaiterCall {
  id: string
  restaurant_id: string
  table_id: string
  waiter_id: string | null
  status: 'pending' | 'attended' | 'cancelled'
  created_at: string
  attended_at: string | null
}

export interface Order {
  id: string
  restaurant_id: string
  session_id: string
  order_type: string
  order_type_detail?: string | null
  table_number: string | null
  customer_name: string | null
  customer_phone?: string | null
  customer_address?: string | null
  delivery_fee?: number | null
  delivery_notes?: string | null
  delivery_status?: string | null
  delivery_driver_id?: string | null
  picked_up_at?: string | null
  delivered_at?: string | null
  status: string
  subtotal: number
  total: number
  currency: string
  created_at: string
}

export interface DeliveryZone {
  name: string
  max_km: number
  fee: number
}

export interface DeliveryDriver {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  phone: string | null
  pin?: string
  is_active: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface OrderTypeData {
  type: 'dine_in' | 'delivery' | 'takeaway'
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  customerAddressExtra?: string
  deliveryFee?: number
  zone?: string
  notes?: string
}

export interface Bill {
  id: string
  restaurant_id: string
  table_id: string
  waiter_id: string
  order_id: string | null
  subtotal: number
  tip: number
  total: number
  currency: string
  status: 'open' | 'paid' | 'cancelled'
  created_at: string
  closed_at: string | null
}

export interface BillItem {
  id: string
  bill_id: string
  order_item_id: string | null
  menu_item_name: string
  quantity: number
  unit_price: number
  subtotal: number
  assigned_to: string | null
  created_at: string
}

export interface Payment {
  id: string
  bill_id: string
  amount: number
  payment_method: 'cash' | 'debit_card' | 'credit_card' | 'transfer'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payment_details: any
  created_at: string
  created_by: string | null
}

export interface BillSplit {
  id: string
  bill_id: string
  split_type: 'equal' | 'by_item' | 'percentage'
  person_name: string | null
  amount: number
  items: string[] | null
  created_at: string
}

export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
export type ReservationSource = 'menu' | 'phone' | 'manual' | 'web'

export interface Reservation {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  party_size: number
  reservation_date: string
  reservation_time: string
  occasion: string | null
  notes: string | null
  guests_data: GuestData[]
  collect_guests: boolean
  source: ReservationSource
  status: ReservationStatus
  table_id: string | null
  internal_notes: string | null
  created_at: string
  updated_at?: string
}

export interface GuestData {
  name: string
}

export interface CRMContact {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  total_visits: number
  total_spent: number
  first_visit: string | null
  last_visit: string | null
  is_vip: boolean
  tags: string[]
  notes: string | null
  created_at: string
  updated_at?: string
}
