import { useState, useEffect, useCallback } from 'react'
import { Receipt, Search, X, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useAuthStore } from '@/store/authStore'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/* ── palette ─────────────────────────────────────────────────────────── */
const BG      = '#0F1115'
const SURFACE = '#16181F'
const CARD    = 'rgba(255,255,255,0.04)'
const BDR     = '1px solid rgba(255,255,255,0.08)'
const ACCENT  = '#F4705A'
const GREEN   = '#22c55e'
const RED     = '#ef4444'
const AMBER   = '#f59e0b'
const TEXT    = '#F5F7FA'
const MUTED   = 'rgba(255,255,255,0.45)'

/* ── Types ───────────────────────────────────────────────────────────── */
interface TicketItem {
  id: string
  name: string
  quantity: number
  price_snapshot: number
  subtotal: number
  is_courtesy: boolean
  notes: string | null
}

interface TicketPaymentMethod {
  method: string
  amount: number
}

interface Ticket {
  id: string
  ticket_number: number
  restaurant_id: string
  order_id: string
  table_number: string | null
  waiter_name: string | null
  customer_name: string | null
  payment_method: string
  payment_methods: TicketPaymentMethod[]
  subtotal: number
  tax: number
  tip: number
  discount: number
  courtesy: number
  total: number
  items: TicketItem[]
  status: string
  created_at: string
}

const METHOD_EMOJI: Record<string, string> = {
  cash:        '💵',
  debit_card:  '💳',
  credit_card: '💳',
  transfer:    '📱',
  mercadopago: '🟣',
  other:       '📝',
}

const METHOD_LABEL: Record<string, string> = {
  cash:        'Efectivo',
  debit_card:  'Débito',
  credit_card: 'Crédito',
  transfer:    'Transferencia',
  mercadopago: 'MercadoPago',
  other:       'Otro',
}

type FilterRange = 'today' | 'week' | 'month' | 'custom'

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtARS(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function getRangeStart(range: FilterRange, customStart: string): string {
  const now = new Date()
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (range === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30)
    return d.toISOString()
  }
  return customStart ? new Date(customStart).toISOString() : new Date(0).toISOString()
}

/* ── Ticket Detail Modal ──────────────────────────────────────────────── */
function TicketDetailModal({ ticket, userName, restaurantId, onClose, onCorrected }: {
  ticket: Ticket
  userName: string
  restaurantId: string
  onClose: () => void
  onCorrected: () => void
}) {
  const [correcting, setCorrecting] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [openRegisterId, setOpenRegisterId] = useState<string | null>(null)

  useEffect(() => {
    db.from('cash_registers').select('id').eq('restaurant_id', restaurantId).eq('status', 'open')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle().then(({ data }: { data: any }) => setOpenRegisterId(data?.id ?? null))
  }, [restaurantId])

  async function generateCorrection() {
    setCorrecting(true)
    try {
      const { data: lastTicket } = await db
        .from('tickets')
        .select('ticket_number')
        .eq('restaurant_id', restaurantId)
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single()
      const ticketNumber = (lastTicket?.ticket_number ?? 0) + 1

      await db.from('tickets').insert({
        restaurant_id:    restaurantId,
        order_id:         ticket.order_id,
        ticket_number:    ticketNumber,
        table_number:     ticket.table_number,
        waiter_name:      userName,
        payment_method:   ticket.payment_method,
        payment_methods:  ticket.payment_methods,
        subtotal:         -ticket.subtotal,
        tax:              -ticket.tax,
        tip:              -ticket.tip,
        discount:         -ticket.discount,
        courtesy:         -ticket.courtesy,
        total:            -ticket.total,
        items:            ticket.items.map(i => ({ ...i, subtotal: -i.subtotal })),
        status:           'voided',
        correction_of:    ticket.id,
      })

      await db.from('financial_transactions').insert({
        restaurant_id:  restaurantId,
        type:           'adjustment',
        amount:         -ticket.total,
        reference_type: 'ticket_correction',
        reference_id:   ticket.id,
        description:    `Corrección ticket #${ticket.ticket_number}`,
      })

      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name:     userName,
        action:        'ticket_correction',
        entity_type:   'ticket',
        entity_id:     ticket.id,
        details: { original_ticket: ticket.ticket_number, new_ticket: ticketNumber, total: ticket.total },
      })

      toast.success(`✅ Corrección generada — Ticket #${ticketNumber}`)
      onCorrected()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al generar la corrección')
    } finally {
      setCorrecting(false)
    }
  }

  async function processRefund() {
    const amount = parseFloat(refundAmount)
    if (!refundReason.trim()) { toast.error('El motivo es requerido'); return }
    if (!amount || amount <= 0 || amount > Math.abs(ticket.total)) {
      toast.error('Monto inválido'); return
    }
    setRefunding(true)
    try {
      await db.from('refunds').insert({
        restaurant_id: restaurantId,
        order_id: ticket.order_id,
        ticket_id: ticket.id,
        amount,
        reason: refundReason.trim(),
        authorized_by: userName,
      })

      await db.from('financial_transactions').insert({
        restaurant_id:  restaurantId,
        type:           'refund',
        amount:         -amount,
        reference_type: 'refund',
        reference_id:   ticket.id,
        description:    `Anulación ticket #${ticket.ticket_number} — ${refundReason.trim()}`,
      })

      await db.from('tickets').update({ status: 'refunded' }).eq('id', ticket.id)

      if (openRegisterId) {
        await db.from('cash_movements').insert({
          cash_register_id: openRegisterId,
          restaurant_id:    restaurantId,
          type:             'refund',
          amount:           -amount,
          description:      `Anulación ticket #${ticket.ticket_number}`,
          created_by_name:  userName,
        })
      }

      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        action:        'refund_processed',
        entity_type:   'ticket',
        entity_id:     ticket.id,
        details:       { ticket_number: ticket.ticket_number, amount, reason: refundReason.trim() },
        user_name:     userName,
        created_at:    new Date().toISOString(),
      })

      toast.success(`✅ Anulación registrada — Ticket #${ticket.ticket_number}`)
      onCorrected()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al procesar la anulación')
    } finally {
      setRefunding(false)
    }
  }

  const methods: TicketPaymentMethod[] = Array.isArray(ticket.payment_methods) && ticket.payment_methods.length > 0
    ? ticket.payment_methods
    : [{ method: ticket.payment_method, amount: ticket.total }]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        background: SURFACE, borderRadius: 20, border: BDR,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: BDR, position: 'sticky', top: 0, background: SURFACE, zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
              Ticket #{ticket.ticket_number}
            </h2>
            <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>{fmtDate(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '5px 9px', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Meta info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Mesa',   value: ticket.table_number ?? '—' },
              { label: 'Mozo',   value: ticket.waiter_name ?? '—' },
              { label: 'Cliente',value: ticket.customer_name ?? '—' },
              { label: 'Estado', value: ticket.status === 'voided' ? '❌ Anulado' : ticket.status === 'refunded' ? '↩️ Devuelto' : '✅ Pagado' },
            ].map(r => (
              <div key={r.label}>
                <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>{r.label}</p>
                <p style={{ fontSize: 13, color: TEXT, margin: 0, fontWeight: 600 }}>{r.value}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 10px' }}>PRODUCTOS</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '4px 0', marginBottom: 20 }}>
            {(ticket.items ?? []).map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 14px', borderBottom: i < ticket.items.length - 1 ? BDR : 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, color: item.is_courtesy ? MUTED : TEXT, textDecoration: item.is_courtesy ? 'line-through' : 'none' }}>
                    {item.quantity}x {item.name}
                    {item.is_courtesy && <span style={{ fontSize: 10, color: GREEN, marginLeft: 6, fontWeight: 700 }}>CORTESÍA</span>}
                  </p>
                  {item.notes && <p style={{ fontSize: 11, color: AMBER, margin: '2px 0 0' }}>⚠️ {item.notes}</p>}
                </div>
                <span style={{ fontSize: 13, color: item.is_courtesy ? MUTED : TEXT, fontWeight: 600, flexShrink: 0 }}>
                  {fmtARS(Math.abs(item.subtotal))}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 10px' }}>PAGO</h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '4px 14px', marginBottom: 20 }}>
            {methods.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < methods.length - 1 ? BDR : 'none' }}>
                <span style={{ fontSize: 13, color: MUTED }}>
                  {METHOD_EMOJI[m.method] ?? '💰'} {METHOD_LABEL[m.method] ?? m.method}
                </span>
                <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{fmtARS(Math.abs(m.amount))}</span>
              </div>
            ))}
          </div>

          {/* Totals breakdown */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '4px 14px', marginBottom: 24 }}>
            {[
              { label: 'Subtotal',  value: fmtARS(Math.abs(ticket.subtotal)),  color: TEXT  },
              ticket.discount > 0 && { label: 'Descuento', value: `-${fmtARS(Math.abs(ticket.discount))}`, color: GREEN },
              ticket.courtesy > 0 && { label: 'Cortesías', value: `-${fmtARS(Math.abs(ticket.courtesy))}`, color: GREEN },
              ticket.tax > 0      && { label: 'Impuestos', value: fmtARS(Math.abs(ticket.tax)),            color: TEXT  },
              ticket.tip > 0      && { label: 'Propina',   value: fmtARS(Math.abs(ticket.tip)),            color: AMBER },
            ].filter(Boolean).map(r => {
              const row = r as { label: string; value: string; color: string }
              return (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: BDR }}>
                  <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: row.color, fontWeight: 600 }}>{row.value}</span>
                </div>
              )
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>TOTAL</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: ticket.status === 'voided' ? RED : ACCENT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                {ticket.total < 0 ? '-' : ''}{fmtARS(Math.abs(ticket.total))}
              </span>
            </div>
          </div>

          {/* Correction + Refund actions */}
          {ticket.status !== 'voided' && (
            <div style={{ borderTop: BDR, paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <AlertTriangle style={{ width: 16, height: 16, color: AMBER, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                  Los tickets son inmutables. Generá una corrección para errores contables, o anulá el cobro para devolver dinero al cliente.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button
                  onClick={generateCorrection}
                  disabled={correcting}
                  style={{ flex: 1, padding: '12px', background: correcting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: RED, fontSize: 13, fontWeight: 700, cursor: correcting ? 'not-allowed' : 'pointer' }}
                >
                  {correcting ? 'Generando...' : 'Corrección contable'}
                </button>

                {ticket.status !== 'refunded' && (
                  <button
                    onClick={() => { setShowRefund(true); setRefundAmount(String(Math.abs(ticket.total))) }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: RED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Anular cobro
                  </button>
                )}
              </div>

              {showRefund && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: RED, margin: '0 0 12px' }}>Anulación de cobro</p>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                      Motivo * (requerido)
                    </label>
                    <textarea
                      value={refundReason}
                      onChange={e => setRefundReason(e.target.value)}
                      rows={2}
                      placeholder="Ej: Error en el cobro, cliente insatisfecho..."
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: BDR, borderRadius: 9, color: TEXT, fontSize: 13, outline: 'none', resize: 'none' }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                      Monto a devolver ($)
                    </label>
                    <input
                      type="number" min="0.01" max={Math.abs(ticket.total)} step="0.01"
                      value={refundAmount}
                      onChange={e => setRefundAmount(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: BDR, borderRadius: 9, color: AMBER, fontSize: 15, fontWeight: 700, outline: 'none' }}
                    />
                    <p style={{ fontSize: 11, color: MUTED, margin: '4px 0 0' }}>Máximo: {fmtARS(Math.abs(ticket.total))}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setShowRefund(false); setRefundReason(''); setRefundAmount('') }}
                      style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: BDR, borderRadius: 9, color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={processRefund}
                      disabled={refunding}
                      style={{ flex: 1, padding: '10px', background: refunding ? 'rgba(239,68,68,0.3)' : RED, border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: refunding ? 'not-allowed' : 'pointer' }}
                    >
                      {refunding ? 'Procesando...' : 'Confirmar anulación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── KPI bar ──────────────────────────────────────────────────────────── */
function KpiBar({ tickets }: { tickets: Ticket[] }) {
  const valid     = tickets.filter(t => t.status !== 'voided')
  const total     = valid.reduce((s, t) => s + t.total, 0)
  const avg       = valid.length > 0 ? total / valid.length : 0

  const methodCount: Record<string, number> = {}
  valid.forEach(t => {
    const m = t.payment_method ?? 'other'
    methodCount[m] = (methodCount[m] ?? 0) + 1
  })
  const topMethod = Object.entries(methodCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const kpis = [
    { label: 'Tickets',        value: String(valid.length) },
    { label: 'Facturación',    value: fmtARS(total)        },
    { label: 'Ticket promedio',value: fmtARS(avg)          },
    { label: 'Método top',     value: METHOD_LABEL[topMethod] ?? topMethod },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
      {kpis.map(k => (
        <div key={k.label} style={{ background: CARD, border: BDR, borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{k.label}</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>{k.value}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export function TicketsPage() {
  const { restaurant }              = useRestaurant()
  const { user }                    = useAuthStore()
  const [tickets,    setTickets]    = useState<Ticket[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<Ticket | null>(null)
  const [search,     setSearch]     = useState('')
  const [range,      setRange]      = useState<FilterRange>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  const userName = (user?.user_metadata?.full_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'Dueño'

  const load = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const from = getRangeStart(range, customFrom)
      let q = db
        .from('tickets')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', from)
        .order('created_at', { ascending: false })

      if (range === 'custom' && customTo) {
        q = q.lte('created_at', new Date(customTo + 'T23:59:59').toISOString())
      }

      const { data, error } = await q
      if (error) throw error
      setTickets(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar los tickets')
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, range, customFrom, customTo])

  useEffect(() => { load() }, [load])

  const filtered = tickets.filter(t => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      String(t.ticket_number).includes(q) ||
      (t.table_number ?? '').toLowerCase().includes(q) ||
      (t.waiter_name ?? '').toLowerCase().includes(q) ||
      (t.customer_name ?? '').toLowerCase().includes(q)
    )
  })

  const RANGES: { key: FilterRange; label: string }[] = [
    { key: 'today',  label: 'Hoy'         },
    { key: 'week',   label: 'Semana'      },
    { key: 'month',  label: 'Mes'         },
    { key: 'custom', label: 'Personalizado'},
  ]

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, padding: '24px 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt style={{ width: 22, height: 22, color: ACCENT }} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
              Tickets
            </h1>
            <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Historial inmutable de cobros</p>
          </div>
        </div>

        {/* Filter range */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: range === r.key ? ACCENT : 'rgba(255,255,255,0.06)',
                color:      range === r.key ? '#fff'  : MUTED,
                transition: 'all 150ms',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {range === 'custom' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <input
              type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none' }}
            />
            <input
              type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none' }}
            />
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: MUTED }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por #ticket, mesa, mozo, cliente..."
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 38px', background: 'rgba(255,255,255,0.05)', border: BDR, borderRadius: 10, color: TEXT, fontSize: 14, outline: 'none' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <KpiBar tickets={filtered} />

            {/* Ticket list */}
            {filtered.length === 0 ? (
              <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '40px 16px', textAlign: 'center', color: MUTED }}>
                {search ? 'Sin resultados para tu búsqueda' : 'Sin tickets en este período'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(ticket => {
                  const isVoided = ticket.status === 'voided' || ticket.status === 'refunded'
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelected(ticket)}
                      style={{
                        background: isVoided ? 'rgba(239,68,68,0.04)' : SURFACE,
                        border: isVoided ? '1px solid rgba(239,68,68,0.2)' : BDR,
                        borderRadius: 14, padding: '16px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', transition: 'border-color 150ms',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                            #{ticket.ticket_number}
                          </span>
                          {ticket.status === 'voided' && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: RED, background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '2px 7px' }}>ANULADO</span>
                          )}
                          {ticket.status === 'refunded' && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: RED, background: 'rgba(239,68,68,0.12)', borderRadius: 6, padding: '2px 7px' }}>DEVUELTO</span>
                          )}
                          <span style={{ fontSize: 12, color: MUTED }}>{fmtDate(ticket.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                          {ticket.table_number && (
                            <span style={{ fontSize: 12, color: MUTED }}>Mesa {ticket.table_number}</span>
                          )}
                          {ticket.waiter_name && (
                            <span style={{ fontSize: 12, color: MUTED }}>· {ticket.waiter_name}</span>
                          )}
                          <span style={{ fontSize: 12, color: MUTED }}>
                            · {METHOD_EMOJI[ticket.payment_method] ?? '💰'} {METHOD_LABEL[ticket.payment_method] ?? ticket.payment_method}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: isVoided ? RED : ACCENT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                          {ticket.total < 0 ? '-' : ''}{fmtARS(Math.abs(ticket.total))}
                        </span>
                        <ChevronRight style={{ width: 16, height: 16, color: MUTED }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <TicketDetailModal
          ticket={selected}
          userName={userName}
          restaurantId={restaurant?.id ?? ''}
          onClose={() => setSelected(null)}
          onCorrected={load}
        />
      )}
    </div>
  )
}
