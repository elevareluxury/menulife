import {
  Calendar, CheckCircle2, XCircle, UserX, RefreshCw, UserPlus,
  StickyNote, Tag, CreditCard, Package, FileText, Award, TrendingUp, ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TimelineEventType =
  | 'customer_created'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'booking_no_show'
  | 'booking_rescheduled'
  | 'customer_note_added'
  | 'tag_added'
  | 'tag_removed'
  | 'membership_created'
  | 'membership_renewed'
  | 'membership_paused'
  | 'membership_expired'
  | 'membership_cancelled'
  | 'package_purchased'
  | 'form_submitted'
  | 'form_updated'
  | 'form_signed'
  | 'document_uploaded'
  | 'document_archived'
  | 'document_deleted'
  | 'document_linked'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'quote_converted'
  | 'quote_approved'
  | 'sale_created'
  | 'sale_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'payment_refunded'
  | 'tier_changed'

export type TimelineCategory = 'all' | 'bookings' | 'payments' | 'documents' | 'memberships' | 'notes'

export interface TimelineEventConfig {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  category: Exclude<TimelineCategory, 'all'>
}

export const EVENT_CONFIG: Record<string, TimelineEventConfig> = {
  customer_created:     { label: 'Cliente registrado',   icon: UserPlus,     color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   category: 'notes'       },
  booking_created:      { label: 'Reserva creada',       icon: Calendar,     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  category: 'bookings'    },
  booking_confirmed:    { label: 'Reserva confirmada',   icon: CheckCircle2, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  category: 'bookings'    },
  booking_completed:    { label: 'Servicio completado',  icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   category: 'bookings'    },
  booking_cancelled:    { label: 'Reserva cancelada',    icon: XCircle,      color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'bookings'    },
  booking_no_show:      { label: 'No se presentó',       icon: UserX,        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   category: 'bookings'    },
  booking_rescheduled:  { label: 'Reserva reagendada',   icon: RefreshCw,    color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', category: 'bookings'    },
  customer_note_added:  { label: 'Nota agregada',        icon: StickyNote,   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', category: 'notes'       },
  tag_added:            { label: 'Etiqueta agregada',    icon: Tag,          color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', category: 'notes'       },
  tag_removed:          { label: 'Etiqueta eliminada',   icon: Tag,          color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'notes'      },
  membership_created:   { label: 'Membresía activada',   icon: Award,        color: '#F4705A', bg: 'rgba(244,112,90,0.12)',  category: 'memberships' },
  membership_renewed:   { label: 'Membresía renovada',   icon: Award,        color: '#F4705A', bg: 'rgba(244,112,90,0.12)',  category: 'memberships' },
  membership_paused:    { label: 'Membresía pausada',    icon: Award,        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  category: 'memberships' },
  membership_expired:   { label: 'Membresía vencida',    icon: Award,        color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   category: 'memberships' },
  membership_cancelled: { label: 'Membresía cancelada',  icon: Award,        color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'memberships' },
  package_purchased:    { label: 'Paquete adquirido',    icon: Package,      color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', category: 'memberships' },
  form_submitted:       { label: 'Formulario completado', icon: FileText,    color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  category: 'documents'   },
  form_updated:         { label: 'Formulario actualizado', icon: FileText,   color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  category: 'documents'   },
  form_signed:          { label: 'Formulario firmado',    icon: FileText,    color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   category: 'documents'   },
  document_uploaded:    { label: 'Documento agregado',   icon: FileText,     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', category: 'documents'   },
  document_archived:    { label: 'Documento archivado',  icon: FileText,     color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'documents'  },
  document_deleted:     { label: 'Documento eliminado',  icon: FileText,     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   category: 'documents'  },
  document_linked:      { label: 'Documento vinculado',  icon: FileText,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', category: 'documents'  },
  quote_created:        { label: 'Cotización creada',    icon: FileText,     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', category: 'documents'   },
  quote_sent:           { label: 'Cotización enviada',   icon: FileText,     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  category: 'documents'   },
  quote_viewed:         { label: 'Cotización vista',     icon: FileText,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  category: 'documents'   },
  quote_accepted:       { label: 'Cotización aceptada',  icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   category: 'documents'   },
  quote_rejected:       { label: 'Cotización rechazada', icon: XCircle,      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   category: 'documents'   },
  quote_expired:        { label: 'Cotización vencida',   icon: FileText,     color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'documents'   },
  quote_converted:      { label: 'Cotización convertida',icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.12)',  category: 'documents'   },
  quote_approved:       { label: 'Presupuesto aprobado', icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   category: 'documents'   },
  sale_created:         { label: 'Venta registrada',     icon: ShoppingCart, color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  category: 'payments'    },
  sale_cancelled:       { label: 'Venta cancelada',      icon: ShoppingCart, color: '#6B7280', bg: 'rgba(107,114,128,0.12)', category: 'payments'   },
  payment_received:     { label: 'Pago recibido',        icon: CreditCard,   color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  category: 'payments'    },
  payment_failed:       { label: 'Pago fallido',         icon: CreditCard,   color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  category: 'payments'    },
  payment_refunded:     { label: 'Pago reembolsado',     icon: CreditCard,   color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  category: 'payments'    },
  tier_changed:         { label: 'Nivel actualizado',    icon: TrendingUp,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', category: 'notes'       },
}

export const FALLBACK_EVENT_CONFIG: TimelineEventConfig = {
  label:    'Evento',
  icon:     Calendar,
  color:    '#6B7280',
  bg:       'rgba(107,114,128,0.12)',
  category: 'notes',
}

export function getEventConfig(eventType: string): TimelineEventConfig {
  return EVENT_CONFIG[eventType] ?? { ...FALLBACK_EVENT_CONFIG, label: eventType.replace(/_/g, ' ') }
}

export const CATEGORY_FILTERS: Array<{ id: TimelineCategory; label: string }> = [
  { id: 'all',         label: 'Todos'      },
  { id: 'bookings',    label: 'Reservas'   },
  { id: 'payments',    label: 'Pagos'      },
  { id: 'documents',   label: 'Documentos' },
  { id: 'memberships', label: 'Membresías' },
  { id: 'notes',       label: 'Notas'      },
]

export function categoryEventTypes(category: Exclude<TimelineCategory, 'all'>): string[] {
  return Object.entries(EVENT_CONFIG)
    .filter(([, cfg]) => cfg.category === category)
    .map(([type]) => type)
}
