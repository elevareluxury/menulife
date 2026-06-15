import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Quote, QuoteItem } from '@/modules/services/quotes/quoteTypes'
import { QUOTE_STATUS_CONFIG } from '@/modules/services/quotes/quoteTypes'
import { formatCurrency, isQuoteExpired } from '@/modules/services/quotes/quoteUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type PublicQuote = Omit<Quote, 'items' | 'template'> & {
  items: QuoteItem[]
  template: { color: string | null; icon: string | null } | null
}

interface Restaurant {
  name: string
  logo_url: string | null
}

type Screen = 'loading' | 'not_found' | 'unavailable' | 'view' | 'confirm_accept' | 'confirm_reject' | 'accepted' | 'rejected'

export function QuotePublicPage() {
  const { token }                  = useParams<{ token: string }>()
  const [quote,      setQuote]     = useState<PublicQuote | null>(null)
  const [restaurant, setRestaurant]= useState<Restaurant | null>(null)
  const [screen,     setScreen]    = useState<Screen>('loading')
  const [expanded,   setExpanded]  = useState(false)
  const [saving,     setSaving]    = useState(false)

  useEffect(() => {
    if (!token) { setScreen('not_found'); return }
    loadQuote()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadQuote() {
    try {
      const { data, error } = await db
        .from('service_quotes')
        .select('*, items:service_quote_items(* ORDER BY sort_order), template:service_quote_templates(color, icon)')
        .eq('token', token)
        .single()

      if (error || !data) { setScreen('not_found'); return }

      const q = data as PublicQuote

      // States that are not viewable publicly
      if (['draft', 'cancelled'].includes(q.status)) {
        setScreen('unavailable')
        return
      }

      // Already decided
      if (q.status === 'accepted') { setQuote(q); setScreen('accepted'); return }
      if (q.status === 'rejected') { setQuote(q); setScreen('rejected'); return }
      if (q.status === 'converted') { setQuote(q); setScreen('accepted'); return }

      // Expired by date
      if (q.status !== 'expired' && isQuoteExpired(q.expires_at)) {
        await db.from('service_quotes').update({ status: 'expired' }).eq('token', token)
        q.status = 'expired'
      }

      setQuote(q)

      // Auto-mark viewed
      if (q.status === 'sent') {
        await db
          .from('service_quotes')
          .update({ status: 'viewed', viewed_at: new Date().toISOString() })
          .eq('token', token)

        await db.from('service_quote_events').insert({
          quote_id:    q.id,
          event_type:  'quote_viewed',
          description: 'Vista desde enlace público',
        })
        setQuote(prev => prev ? { ...prev, status: 'viewed' } : prev)
      }

      setScreen('view')

      // Load restaurant branding
      if (q.restaurant_id) {
        const { data: r } = await db
          .from('restaurants')
          .select('name, logo_url')
          .eq('id', q.restaurant_id)
          .single()
        if (r) setRestaurant(r)
      }
    } catch {
      setScreen('not_found')
    }
  }

  async function accept() {
    if (!quote || saving) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      await db
        .from('service_quotes')
        .update({
          status:             'accepted',
          accepted_at:        now,
          accepted_user_agent: navigator.userAgent,
        })
        .eq('token', token)

      await db.from('service_quote_events').insert({
        quote_id:    quote.id,
        event_type:  'quote_accepted',
        description: 'Aceptado desde enlace público',
        metadata:    { user_agent: navigator.userAgent },
      })

      setScreen('accepted')
    } finally {
      setSaving(false)
    }
  }

  async function reject() {
    if (!quote || saving) return
    setSaving(true)
    try {
      await db
        .from('service_quotes')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('token', token)

      await db.from('service_quote_events').insert({
        quote_id:   quote.id,
        event_type: 'quote_rejected',
        description:'Rechazado desde enlace público',
      })

      setScreen('rejected')
    } finally {
      setSaving(false)
    }
  }

  const color = quote?.template?.color ?? '#F4705A'
  const cfg   = quote ? QUOTE_STATUS_CONFIG[quote.status] : null

  /* ── LOADING ─────────────────────────────────────────────────── */
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1115' }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
        />
      </div>
    )
  }

  /* ── NOT FOUND ───────────────────────────────────────────────── */
  if (screen === 'not_found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0F1115' }}>
        <AlertCircle className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-lg font-bold text-white mb-2">Enlace no válido</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Esta propuesta no existe o el enlace es incorrecto.
        </p>
      </div>
    )
  }

  /* ── UNAVAILABLE ─────────────────────────────────────────────── */
  if (screen === 'unavailable') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0F1115' }}>
        <Clock className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
        <p className="text-lg font-bold text-white mb-2">Propuesta no disponible</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Esta propuesta aún no fue enviada o fue cancelada.
        </p>
      </div>
    )
  }

  /* ── ACCEPTED ────────────────────────────────────────────────── */
  if (screen === 'accepted') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0F1115' }}>
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: '#22C55E' }} />
        </div>
        <p className="text-2xl font-bold text-white mb-3">¡Propuesta aceptada!</p>
        <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {restaurant?.name ?? 'El equipo'} fue notificado.
          Pronto se pondrán en contacto para coordinar los próximos pasos.
        </p>
        {quote && (
          <div
            className="mt-8 px-5 py-4 rounded-2xl text-left max-w-sm w-full"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Propuesta aceptada</p>
            <p className="text-base font-bold text-white">{quote.title}</p>
            <p className="text-lg font-bold mt-2" style={{ color: '#22C55E' }}>
              {formatCurrency(quote.total_amount, quote.currency)}
            </p>
          </div>
        )}
      </div>
    )
  }

  /* ── REJECTED ────────────────────────────────────────────────── */
  if (screen === 'rejected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0F1115' }}>
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.25)' }}
        >
          <XCircle className="w-10 h-10" style={{ color: '#6B7280' }} />
        </div>
        <p className="text-xl font-bold text-white mb-3">Propuesta rechazada</p>
        <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Gracias por informarnos. Si cambiás de opinión, podés contactar a {restaurant?.name ?? 'el equipo'} directamente.
        </p>
      </div>
    )
  }

  if (!quote) return null

  const customerName = (quote.metadata as Record<string, unknown>)?.customer_name as string | undefined
  const isExpired    = quote.status === 'expired'
  const canDecide    = ['sent', 'viewed'].includes(quote.status)
  const expiresAt    = quote.expires_at
    ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(quote.expires_at))
    : null

  /* ── CONFIRM ACCEPT ──────────────────────────────────────────── */
  if (screen === 'confirm_accept') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0F1115' }}>
        <div
          className="w-full max-w-sm rounded-3xl p-6"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: '#22C55E' }} />
          </div>
          <h2 className="text-lg font-bold text-white text-center mb-2">Confirmar aceptación</h2>
          <p className="text-sm text-center mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Estás a punto de aceptar la propuesta:
          </p>
          <p className="text-base font-bold text-white text-center mb-1">{quote.title}</p>
          <p className="text-xl font-bold text-center mb-6" style={{ color: '#22C55E' }}>
            {formatCurrency(quote.total_amount, quote.currency)}
          </p>
          <button
            onClick={accept}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold mb-3 disabled:opacity-50 transition-opacity"
            style={{ background: '#22C55E', color: '#fff' }}
          >
            {saving ? 'Aceptando...' : 'Sí, acepto esta propuesta'}
          </button>
          <button
            onClick={() => setScreen('view')}
            className="w-full py-2.5 rounded-2xl text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  /* ── CONFIRM REJECT ──────────────────────────────────────────── */
  if (screen === 'confirm_reject') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0F1115' }}>
        <div
          className="w-full max-w-sm rounded-3xl p-6"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-lg font-bold text-white text-center mb-2">¿Rechazar esta propuesta?</h2>
          <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Esta acción notificará a {restaurant?.name ?? 'el equipo'}.
          </p>
          <button
            onClick={reject}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold mb-3 disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {saving ? 'Rechazando...' : 'Sí, rechazar'}
          </button>
          <button
            onClick={() => setScreen('view')}
            className="w-full py-2.5 rounded-2xl text-sm font-medium"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  /* ── MAIN VIEW ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen pb-40" style={{ background: '#0F1115' }}>

      {/* Hero accent */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }}
      />

      <div className="max-w-lg mx-auto px-4 pt-8">

        {/* Business header */}
        <div className="flex items-center gap-3 mb-8">
          {restaurant?.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: `${color}20`, color }}
            >
              {restaurant?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{restaurant?.name ?? 'Propuesta'}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>te envió una propuesta</p>
          </div>
        </div>

        {/* Quote header */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: '#13161C', border: `1px solid ${color}20` }}
        >
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${color}15` }}
            >
              {quote.template?.icon ?? '📋'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">{quote.title}</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {quote.quote_number}
                {customerName ? ` · Para ${customerName}` : ''}
              </p>
            </div>
          </div>

          {/* Status / expiry info */}
          {isExpired ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Esta propuesta venció</p>
            </div>
          ) : expiresAt ? (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Válida hasta: <span className="text-white font-medium">{expiresAt}</span>
            </p>
          ) : null}

          {quote.description && (
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.55)' }}>{quote.description}</p>
          )}

          {/* Status badge (si ya fue decidida desde otro lado) */}
          {cfg && !canDecide && !isExpired && (
            <div className="mt-3 flex">
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          )}
        </div>

        {/* Items */}
        <div
          className="rounded-3xl overflow-hidden mb-4"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="text-sm font-bold text-white">
              {quote.items.length} ítem{quote.items.length !== 1 ? 's' : ''}
            </span>
            {expanded
              ? <ChevronUp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
              : <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            }
          </button>

          {expanded && (
            <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {quote.items.map((item, i) => (
                <div key={item.id ?? i} className="flex items-start justify-between gap-3 pt-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    {item.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.description}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {item.quantity} × {formatCurrency(item.unit_price, quote.currency)}
                      {item.discount > 0 ? ` − ${formatCurrency(item.discount, quote.currency)}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-white flex-shrink-0">
                    {formatCurrency(item.total, quote.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {quote.subtotal !== quote.total_amount && (
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Subtotal</span>
              <span className="text-white">{formatCurrency(quote.subtotal, quote.currency)}</span>
            </div>
          )}
          {quote.tax_amount > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Impuestos</span>
              <span className="text-white">{formatCurrency(quote.tax_amount, quote.currency)}</span>
            </div>
          )}
          <div
            className="flex justify-between items-center"
            style={quote.subtotal !== quote.total_amount || quote.tax_amount > 0
              ? { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '4px' }
              : {}}
          >
            <span className="text-base font-bold text-white">Total</span>
            <span className="text-2xl font-bold" style={{ color }}>{formatCurrency(quote.total_amount, quote.currency)}</span>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div
            className="rounded-3xl p-5 mb-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Notas</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap' }}>{quote.notes}</p>
          </div>
        )}
      </div>

      {/* ── STICKY CTA ─────────────────────────────────────────── */}
      {canDecide && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4"
          style={{
            background: 'linear-gradient(to top, #0F1115 60%, transparent)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-lg mx-auto space-y-3">
            <button
              onClick={() => setScreen('confirm_accept')}
              className="w-full py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90"
              style={{ background: '#22C55E', color: '#fff', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}
            >
              Aceptar propuesta
            </button>
            <button
              onClick={() => setScreen('confirm_reject')}
              className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              No me interesa
            </button>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 text-center"
          style={{ background: 'linear-gradient(to top, #0F1115 60%, transparent)' }}
        >
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Esta propuesta venció. Contactá a {restaurant?.name ?? 'la empresa'} para obtener una nueva.
          </p>
        </div>
      )}
    </div>
  )
}
