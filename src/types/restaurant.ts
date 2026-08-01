export type RestaurantPlan =
  | 'hub_free'
  | 'os_gastronomy'
  | 'os_retail'
  | 'os_full'

export type BusinessType = 'gastronomy' | 'retail' | 'services'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'cancelled'

export interface Restaurant {
  id: string
  owner_id: string | null
  slug: string
  name: string
  name_en: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  country: string
  postal_code: string | null
  directions: string | null
  address_extra: string | null
  logo_url: string | null
  cover_image_url: string | null
  banner_url: string | null
  hub_cover_url: string | null
  description: string | null
  description_en: string | null
  short_description: string | null
  short_description_en: string | null
  hub_about: string | null
  hub_about_en: string | null
  website: string | null
  default_currency: string
  default_language: string
  timezone: string
  plan: RestaurantPlan
  business_type: BusinessType
  subscription_status: SubscriptionStatus
  trial_ends_at: string | null
  plan_activated_at: string | null
  plan_activated_by: string | null
  is_open: boolean
  is_active: boolean
  hub_enabled: boolean
  setup_completed: boolean
  setup_step: number
  onboarding_completed: boolean
  tax_enabled: boolean
  tax_percentage: number
  delivery_enabled: boolean
  takeaway_enabled: boolean
  reservations_enabled: boolean
  mercadopago_enabled: boolean
  mercadopago_access_token: string | null
  organization_id: string | null
  schedule: Record<string, {
    open: string; close: string; closed: boolean
  }> | null
  business_hours: Record<string, {
    from: string | null; to: string | null; open: boolean
  }> | null
  social_links: {
    instagram: string | null
    facebook: string | null
    whatsapp: string | null
    tiktok: string | null
    google_maps: string | null
  } | null
  hub_bottom_nav: Array<{
    id: string; icon: string; label: string
  }> | null
  features: {
    delivery: boolean
    takeaway: boolean
    reservations: boolean
    multi_language: boolean
    custom_branding: boolean
    advanced_analytics: boolean
    pdf_import: boolean
  } | null
  hub_category: string | null
  hub_city: string | null
  hub_category_tags: string[] | null
  hub_category_tags_en: string[] | null
  hub_main_cta_text: string
  hub_main_cta_url: string | null
  google_rating: number | null
  google_review_count: number
  google_review_url: string | null
  google_review_link: string | null
  daily_sales_goal: number | null
  suggested_tip_percentages: number[] | null
  enabled_payment_methods: string[] | null
  menu_accent_color: string
  menu_card_style: string
  notes: string | null
  created_at: string
  updated_at: string
  // Delivery extended config
  delivery_time_estimate: number | null
  delivery_min_order: number | null
  delivery_fee_type: 'fixed' | 'percentage' | 'zone' | null
  delivery_fee_value: number | null
  delivery_zones: unknown
  // Takeaway extended config
  takeaway_time_estimate: number | null
  // Reservations extended config
  reservations_collect_guests: boolean
  reservations_advance_days: number | null
  reservations_min_hours: number | null
  reservations_max_party: number | null
  reservations_time_slots: string[] | null
  reservations_message: string | null
  // Globalization — Phase 17
  locale: string | null
  date_format: string | null
  time_format: string | null
  number_format: string | null
  allow_language_switch: boolean
  // Display options
  show_prices: boolean
  show_descriptions: boolean
  show_calories: boolean
}
