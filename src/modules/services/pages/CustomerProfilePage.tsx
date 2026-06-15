import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Phone, Mail, Clock, Tag,
  MessageSquare, AlertCircle, CheckCircle2, CalendarDays,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import type { ServiceCustomer } from '../types/customer'
import { CUSTOMER_SOURCE_LABELS } from '../types/customer'
import { CustomerTimeline } from '../components/customers/CustomerTimeline'
import { useCustomerScore } from '../hooks/useCustomerScore'
import { ScoreBadge } from '../components/customers/ScoreBadge'
import { CustomerMembershipsSection } from '../components/memberships/CustomerMembershipsSection'
import { CustomerPackagesSection } from '../components/packages/CustomerPackagesSection'
import { CustomerQuotesSection } from '../components/quotes/CustomerQuotesSection'
import { CustomerFormsSection } from '../components/forms/CustomerFormsSection'
import { CustomerDocumentsSection } from '../components/documents/CustomerDocumentsSection'
import { CustomerSalesSection } from '../components/sales/CustomerSalesSection'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function CustomerProfilePage() {
  const { id }         = useParams<{ id: string }>()
  const navigate       = useNavigate()
  const { restaurant } = useRestaurant()
  const timezone       = restaurant?.timezone ?? 'America/Argentina/Buenos_Aires'

  const [customer,  setCustomer]  = useState<ServiceCustomer | null>(null)
  const [upcoming,  setUpcoming]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)

  const { score } = useCustomerScore(restaurant?.id, id)

  useEffect(() => {
    if (!id || !restaurant?.id) return
    setLoading(true)
    Promise.all([
      db.from('service_customers').select('*').eq('id', id).single(),
      db
        .from('service_bookings')
        .select('starts_at')
        .eq('restaurant_id', restaurant.id)
        .eq('client_id', id)
        .gt('starts_at', new Date().toISOString())
        .not('status', 'in', '("cancelled","no_show","rescheduled")')
        .order('starts_at', { ascending: true })
        .limit(1),
    ]).then(([{ data: cust, error: custErr }, { data: bks }]) => {
      if (custErr || !cust) { setNotFound(true); setLoading(false); return }
      setCustomer(cust)
      setUpcoming(bks?.[0]?.starts_at ?? null)
      setLoading(false)
    })
  }, [id, restaurant?.id])

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
        />
      </div>
    )
  }

  if (notFound || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-10 h-10 mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-sm font-semibold text-white mb-1">Cliente no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-sm mt-2 font-semibold" style={{ color: '#F4705A' }}>
          ← Volver
        </button>
      </div>
    )
  }

  /* ── Data derivada ───────────────────────────────────────── */
  const initials = customer.full_name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-5 text-sm font-medium"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        <ChevronLeft className="w-4 h-4" />
        Clientes
      </button>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 mb-3"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0 select-none"
            style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
          >
            {initials || '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h1 className="text-xl font-bold text-white leading-tight">{customer.full_name}</h1>
              {score && <ScoreBadge score={score} size="sm" />}
            </div>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {CUSTOMER_SOURCE_LABELS[customer.source]}
              {' · '}
              Cliente desde{' '}
              {new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })
                .format(new Date(customer.created_at))}
            </p>

            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contacto */}
        <div
          className="mt-4 pt-4 space-y-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-3 group">
              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-sm group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {customer.phone}
              </span>
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-3 group">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-sm truncate group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {customer.email}
              </span>
            </a>
          )}
          {customer.notes && (
            <div className="flex items-start gap-3">
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{customer.notes}</p>
            </div>
          )}
          {!customer.phone && !customer.email && !customer.notes && (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Sin datos de contacto registrados</p>
          )}
        </div>
      </div>

      {/* ── SUMMARY STATS ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          {
            label: 'Reservas',
            value: customer.total_bookings,
            icon:  <CalendarDays className="w-4 h-4" />,
            color: '#F4705A',
          },
          {
            label: 'Última visita',
            value: customer.last_visit_at
              ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
                  .format(new Date(customer.last_visit_at))
              : '—',
            icon:  <Clock className="w-4 h-4" />,
            color: '#3B82F6',
          },
          {
            label: 'Próxima',
            value: upcoming
              ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
                  .format(new Date(upcoming))
              : '—',
            icon:  <CheckCircle2 className="w-4 h-4" />,
            color: '#22C55E',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="mb-2" style={{ color: stat.color }}>{stat.icon}</div>
            <p className="text-xl font-bold text-white leading-none mb-1">{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── MEMBRESÍAS ───────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerMembershipsSection
            customerId={customer.id}
            restaurantId={restaurant.id}
          />
        </div>
      )}

      {/* ── PAQUETES ─────────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerPackagesSection
            customerId={customer.id}
            restaurantId={restaurant.id}
          />
        </div>
      )}

      {/* ── VENTAS ───────────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerSalesSection customer={customer} restaurantId={restaurant.id} defaultCurrency={restaurant.default_currency} />
        </div>
      )}

      {/* ── COTIZACIONES ─────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerQuotesSection customer={customer} restaurantId={restaurant.id} defaultCurrency={restaurant.default_currency} />
        </div>
      )}

      {/* ── FORMULARIOS ──────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerFormsSection customerId={customer.id} restaurantId={restaurant.id} />
        </div>
      )}

      {/* ── DOCUMENTOS ───────────────────────────────────────── */}
      {restaurant?.id && (
        <div className="mb-3">
          <CustomerDocumentsSection customerId={customer.id} restaurantId={restaurant.id} />
        </div>
      )}

      {/* ── TIMELINE ─────────────────────────────────────────── */}
      {restaurant?.id && (
        <CustomerTimeline
          customerId={customer.id}
          restaurantId={restaurant.id}
          timezone={timezone}
        />
      )}

    </div>
  )
}
