export type OrgPlan = 'single' | 'multi' | 'enterprise'
export type OrgRole = 'owner' | 'admin' | 'manager' | 'staff'
export type LocationScope = 'all' | 'selected' | 'single'
export type LocationStatus = 'active' | 'inactive' | 'coming_soon' | 'closed'

export interface Organization {
  id:         string
  name:       string
  slug:       string
  logo_url:   string | null
  timezone:   string
  currency:   string
  country:    string
  plan:       OrgPlan
  settings:   Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationLocation {
  id:              string
  organization_id: string
  restaurant_id:   string
  slug:            string
  address:         string | null
  city:            string | null
  state:           string | null
  country:         string
  timezone:        string
  phone:           string | null
  email:           string | null
  status:          LocationStatus
  sort_order:      number
  metadata:        Record<string, unknown>
  created_at:      string
  updated_at:      string
}

export interface OrganizationMember {
  id:              string
  organization_id: string
  user_id:         string
  role:            OrgRole
  location_scope:  LocationScope
  metadata:        Record<string, unknown>
  created_at:      string
}

// Lightweight location summary used by LocationSwitcher
// Comes from joining organization_locations + restaurants
export interface LocationSummary {
  id:           string   // restaurant_id
  name:         string   // restaurant.name
  city:         string | null
  status:       LocationStatus
  sort_order:   number
}
