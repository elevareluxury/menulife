export type SaleStatus        = 'draft' | 'pending' | 'paid' | 'partially_paid' | 'cancelled' | 'refunded'
export type SaleSource        = 'manual' | 'booking' | 'membership' | 'package' | 'quote' | 'portal' | 'retail' | 'restaurant' | 'future'
export type SaleChannel       = 'presencial' | 'online' | 'portal' | 'marketplace' | 'hub' | 'api' | 'future'
export type SaleItemType      = 'service' | 'tip' | 'package' | 'product' | 'membership' | 'future'
export type PaymentStatus     = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
export type PaymentProvider   = 'manual' | 'stripe' | 'mercadopago' | 'paypal' | 'pix' | 'future'
export type PaymentMethodType = 'cash' | 'card' | 'transfer' | 'qr' | 'wallet' | 'terminal' | 'other'
export type RefundStatus      = 'pending' | 'approved' | 'rejected' | 'completed'

export interface PaymentMethod {
  id:            string
  restaurant_id: string
  name:          string
  type:          PaymentMethodType
  provider:      PaymentProvider
  status:        'active' | 'inactive'
  sort_order:    number
  metadata:      Record<string, unknown>
  created_at:    string
}

export interface SaleItem {
  id:         string
  sale_id:    string
  item_type:  SaleItemType
  item_id:    string | null
  name:       string
  quantity:   number
  unit_price: number
  discount:   number
  total:      number
  sort_order: number
  metadata:   Record<string, unknown>
  created_at: string
}

export interface Payment {
  id:                      string
  sale_id:                 string
  customer_id:             string | null
  method_id:               string | null
  amount:                  number
  currency:                string
  status:                  PaymentStatus
  external_provider:       PaymentProvider
  external_transaction_id: string | null
  payment_intent_id:       string | null
  provider_customer_id:    string | null
  provider_payload:        Record<string, unknown>
  transaction_reference:   string | null
  paid_at:                 string | null
  notes:                   string | null
  metadata:                Record<string, unknown>
  created_at:              string
  // Relations
  method?: PaymentMethod | null
}

export interface Sale {
  id:             string
  restaurant_id:  string
  customer_id:    string | null
  sale_number:    string
  title:          string | null
  status:         SaleStatus
  source:         SaleSource
  sale_channel:   SaleChannel
  subtotal:       number
  discount:       number
  tax:            number
  total:          number
  balance_due:    number
  currency:       string
  quote_id:       string | null
  booking_id:     string | null
  membership_id:  string | null
  package_id:     string | null
  notes:          string | null
  metadata:       Record<string, unknown>
  created_at:     string
  updated_at:     string
  // Relations
  items?:    SaleItem[]
  payments?: Payment[]
  customer?: { id: string; full_name: string } | null
}

export interface Refund {
  id:         string
  payment_id: string
  amount:     number
  reason:     string | null
  status:     RefundStatus
  metadata:   Record<string, unknown>
  created_at: string
}

// Builder input (local, no ID yet)
export interface SaleItemInput {
  key:        string
  name:       string
  item_type:  SaleItemType
  quantity:   number
  unit_price: number
  discount:   number
}

// ─── Config maps ──────────────────────────────────────────────────────────────

export const SALE_STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; bg: string }> = {
  draft:           { label: 'Borrador',       color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  pending:         { label: 'Pendiente',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  paid:            { label: 'Pagado',          color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  partially_paid:  { label: 'Pago parcial',    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  cancelled:       { label: 'Cancelado',       color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  refunded:        { label: 'Reembolsado',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
}

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: '#F59E0B' },
  paid:      { label: 'Pagado',     color: '#22C55E' },
  failed:    { label: 'Fallido',    color: '#EF4444' },
  cancelled: { label: 'Cancelado',  color: '#6B7280' },
  refunded:  { label: 'Reembolsado',color: '#8B5CF6' },
}

export const PAYMENT_METHOD_TYPE_CONFIG: Record<PaymentMethodType, { label: string; emoji: string }> = {
  cash:     { label: 'Efectivo',    emoji: '💵' },
  card:     { label: 'Tarjeta',     emoji: '💳' },
  transfer: { label: 'Transferencia',emoji: '🏦' },
  qr:       { label: 'QR / Wallet', emoji: '📱' },
  wallet:   { label: 'Billetera',   emoji: '👛' },
  terminal: { label: 'Terminal',    emoji: '🖥️' },
  other:    { label: 'Otro',        emoji: '💰' },
}

export const SALE_SOURCE_LABELS: Record<SaleSource, string> = {
  manual:      'Manual',
  booking:     'Reserva',
  membership:  'Membresía',
  package:     'Paquete',
  quote:       'Cotización',
  portal:      'Portal',
  retail:      'Retail',
  restaurant:  'Restaurante',
  future:      'Otro',
}

export const DEFAULT_PAYMENT_METHODS: Array<Omit<PaymentMethod, 'id' | 'restaurant_id' | 'created_at'>> = [
  { name: 'Efectivo',      type: 'cash',     provider: 'manual', status: 'active', sort_order: 0, metadata: {} },
  { name: 'Tarjeta',       type: 'card',     provider: 'manual', status: 'active', sort_order: 1, metadata: {} },
  { name: 'Transferencia', type: 'transfer', provider: 'manual', status: 'active', sort_order: 2, metadata: {} },
  { name: 'Mercado Pago',  type: 'qr',       provider: 'mercadopago', status: 'active', sort_order: 3, metadata: {} },
]

export const CURRENCIES = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'COP', 'MXN']
