// ─── Session ─────────────────────────────────────────────────────────────────
export interface PortalSession {
  token:          string
  customer_id:    string
  customer_name:  string
  customer_email: string
  restaurant_id:  string
  expires_at:     string
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export interface PortalCustomer {
  id:        string
  full_name: string
  email:     string
  phone:     string | null
}

export interface PortalNextBooking {
  id:           string
  title:        string | null
  starts_at:    string
  service_name: string | null
  status:       string
}

export interface PortalHomeMembership {
  id:      string
  name:    string
  status:  string
  ends_at: string | null
  color:   string | null
}

export interface PortalHome {
  success:         boolean
  customer:        PortalCustomer
  next_booking:    PortalNextBooking | null
  membership:      PortalHomeMembership | null
  packages_active: number
  pending_quotes:  number
  pending_docs:    number
  forms_count:     number
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
export interface PortalBooking {
  id:               string
  title:            string | null
  starts_at:        string
  ends_at:          string | null
  status:           string
  notes:            string | null
  duration_minutes: number | null
  modality:         string | null
  meet_url:         string | null
  service_name:     string | null
  service_color:    string | null
  created_at:       string
}

// ─── Memberships ──────────────────────────────────────────────────────────────
export interface PortalMembership {
  id:               string
  status:           string
  starts_at:        string | null
  ends_at:          string | null
  renewal_date:     string | null
  auto_renew:       boolean
  health:           string | null
  notes:            string | null
  created_at:       string
  plan_name:        string
  plan_color:       string | null
  price:            number
  currency:         string
  plan_description: string | null
}

// ─── Packages ─────────────────────────────────────────────────────────────────
export interface PortalPackageTemplateItem {
  service_name: string
  quantity:     number
}

export interface PortalPackage {
  id:             string
  status:         string
  starts_at:      string | null
  expires_at:     string | null
  consumption:    Record<string, number>
  notes:          string | null
  created_at:     string
  template_name:  string
  template_color: string | null
  price:          number
  currency:       string
  template_items: PortalPackageTemplateItem[] | null
  validity_days:  number | null
}

// ─── Documents ────────────────────────────────────────────────────────────────
export interface PortalDocument {
  id:                  string
  title:               string
  description:         string | null
  file_name:           string | null
  file_extension:      string | null
  mime_type:           string | null
  status:              string
  document_visibility: string
  storage_path:        string | null
  expiration_date:     string | null
  created_at:          string
}

// ─── Forms ────────────────────────────────────────────────────────────────────
export interface PortalForm {
  id:               string
  submitted_at:     string | null
  created_at:       string
  form_name:        string
  form_description: string | null
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
export interface PortalQuoteItem {
  name:       string
  quantity:   number
  unit_price: number
  total:      number
}

export interface PortalQuote {
  id:           string
  quote_number: string | null
  title:        string | null
  status:       string
  total:        number
  currency:     string
  expires_at:   string | null
  notes:        string | null
  token:        string | null
  created_at:   string
  items:        PortalQuoteItem[] | null
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString('es-AR', opts ?? { weekday: 'long', day: 'numeric', month: 'long' })
}

export function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDatetime(iso: string): string {
  return `${fmtShortDate(iso)} · ${fmtTime(iso)}`
}

export function fmtCurrency(amount: number, currency = 'ARS'): string {
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `${currency} ${(amount / 1_000).toFixed(1)}K`
  return `${currency} ${amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending:      'Pendiente',
  confirmed:    'Confirmado',
  in_progress:  'En curso',
  completed:    'Completado',
  cancelled:    'Cancelado',
  no_show:      'No se presentó',
  rescheduled:  'Reprogramado',
}

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending:      '#F59E0B',
  confirmed:    '#3B82F6',
  in_progress:  '#8B5CF6',
  completed:    '#22C55E',
  cancelled:    'rgba(255,255,255,0.25)',
  no_show:      '#EF4444',
  rescheduled:  'rgba(255,255,255,0.25)',
}

export const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  active:    'Activa',
  expired:   'Vencida',
  cancelled: 'Cancelada',
  paused:    'Pausada',
  pending:   'Pendiente',
}

export const MEMBERSHIP_STATUS_COLOR: Record<string, string> = {
  active:    '#22C55E',
  expired:   'rgba(255,255,255,0.25)',
  cancelled: '#EF4444',
  paused:    '#F59E0B',
  pending:   '#F59E0B',
}

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  sent:      'Pendiente',
  viewed:    'Vista',
  accepted:  'Aceptada',
  rejected:  'Rechazada',
  expired:   'Expirada',
  cancelled: 'Cancelada',
}

export const QUOTE_STATUS_COLOR: Record<string, string> = {
  sent:      '#F59E0B',
  viewed:    '#8B5CF6',
  accepted:  '#22C55E',
  rejected:  '#EF4444',
  expired:   'rgba(255,255,255,0.25)',
  cancelled: 'rgba(255,255,255,0.25)',
}
