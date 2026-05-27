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
  default_currency: 'ARS' | 'USD'
  default_language: 'ES' | 'EN'
  timezone?: string
  schedule?: unknown
  is_open: boolean
  is_active: boolean
  plan: 'menu' | 'pro' | 'total'
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

export type Currency = 'ARS' | 'USD'
export type Language = 'ES' | 'EN'

export interface MenuFilters {
  search: string
  tags: string[]
}

export interface Waiter {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  pin: string
  is_active: boolean
  is_on_shift: boolean
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
  table_number: string | null
  customer_name: string | null
  status: string
  subtotal: number
  total: number
  currency: string
  created_at: string
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
