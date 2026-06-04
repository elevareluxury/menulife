import { supabase } from '@/lib/supabase'

export const PLAN_COLORS: Record<string, string> = {
  menu:  '#F59E0B',
  pro:   '#3B82F6',
  total: '#10B981',
}

export const PLAN_LABELS: Record<string, string> = {
  menu:  'Menu',
  pro:   'Pro',
  total: 'Total',
}

export const PLAN_PRICES: Record<string, number> = {
  menu:  9,
  pro:   19,
  total: 32,
}

export const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  menu: {
    delivery: false, takeaway: false, reservations: false,
    advanced_analytics: false, pdf_import: false,
    multi_language: true, custom_branding: false,
  },
  pro: {
    delivery: true, takeaway: true, reservations: true,
    advanced_analytics: true, pdf_import: true,
    multi_language: true, custom_branding: true,
  },
  total: {
    delivery: true, takeaway: true, reservations: true,
    advanced_analytics: true, pdf_import: true,
    multi_language: true, custom_branding: true,
  },
}

export const FEATURE_LABELS: Record<string, string> = {
  delivery:           'Delivery',
  takeaway:           'Takeaway',
  reservations:       'Reservas',
  advanced_analytics: 'Analytics avanzados',
  pdf_import:         'Importar PDF',
  multi_language:     'Multi-idioma',
  custom_branding:    'Custom branding',
}

export const ALL_FEATURES = Object.keys(FEATURE_LABELS)

export const ONBOARDING_LABELS: Record<string, string> = {
  logo_uploaded:      'Logo subido',
  products_added:     'Productos cargados',
  tables_created:     'Mesas creadas',
  waiters_registered: 'Mozos registrados',
  qr_generated:       'Primer QR generado',
  first_order:        'Primer pedido recibido',
}

export const ONBOARDING_STEPS = Object.keys(ONBOARDING_LABELS)

export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('admin_logs').insert({
    admin_id:    user.id,
    action,
    target_type: targetType,
    target_id:   targetId,
    details:     details ?? {},
  })
}

export function openWhatsApp(phone: string, name: string) {
  const msg = encodeURIComponent(
    `Hola ${name}, te contactamos desde el equipo de MenuLife. ¿Cómo va todo con el sistema?`
  )
  window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
}

export function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}
