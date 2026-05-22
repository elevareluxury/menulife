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
  name_en?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  logo_url?: string
  default_currency: 'ARS' | 'USD'
  default_language: 'ES' | 'EN'
  is_open: boolean
  is_active: boolean
  plan: 'menu' | 'pro' | 'total'
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
  mercadopago_enabled: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  section_id: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  price_ars: number
  price_usd: number
  image_url: string
  video_url?: string
  is_available: boolean
  allergens: string[]
  tags: string[]
  sort_order: number
}

export interface MenuSection {
  id: string
  restaurant_id: string
  name: string
  name_en?: string
  description?: string
  description_en?: string
  sort_order: number
  is_active: boolean
}
