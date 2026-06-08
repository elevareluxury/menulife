import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Gift, Plus, Trash2, Tag, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/* ── palette ─────────────────────────────────────────────────────────── */
const SURFACE = '#16181F'
const SURFACE2 = '#1E2028'
const BDR     = '1px solid rgba(255,255,255,0.08)'
const ACCENT  = '#F4705A'
const GREEN   = '#22c55e'
const RED     = '#ef4444'
const AMBER   = '#f59e0b'
const TEXT    = '#F5F7FA'
const MUTED   = 'rgba(255,255,255,0.45)'

/* ── Types ───────────────────────────────────────────────────────────── */
export type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'transfer' | 'mercadopago' | 'other'

interface CheckoutItem {
  id: string
  menu_item_name: string
  quantity: number
  price_snapshot: number
  notes: string | null
  isCourtesy: boolean
}

interface PaymentEntry {
  method: PaymentMethod
  amount: string
}

interface DiscountState {
  type: 'percentage' | 'fixed'
  value: number
  reason: string
  description: string
}

export interface CheckoutModalProps {
  isOpen:          boolean
  onClose:         () => void
  onSuccess:       () => void
  orderId:         string
  tableNumber:     string
  restaurantId:    string
  cashRegisterId?: string | null
  paidBy?:         string
  waiterId?:       string | null
  waiterName?:     string | null
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:        '💵 Efectivo',
  debit_card:  '💳 Débito',
  credit_card: '💳 Crédito',
  transfer:    '📱 Transferencia',
  mercadopago: '🟣 MercadoPago',
  other:       '📝 Otro',
}

const ALL_METHODS = Object.keys(METHOD_LABELS) as PaymentMethod[]

interface POSSettings {
  tax_enabled: boolean
  tax_percentage: number
  suggested_tip_percentages: number[]
  enabled_payment_methods: PaymentMethod[]
}

const DISCOUNT_REASONS = ['Promoción', 'VIP', 'Cortesía', 'Manual', 'Otro']

/* ── Discount Mini-Modal ──────────────────────────────────────────────── */
function DiscountModal({ subtotal, onApply, onClose }: {
  subtotal: number
  onApply: (d: DiscountState) => void
  onClose: () => void
}) {
  const [discType,    setDiscType]    = useState<'percentage' | 'fixed'>('percentage')
  const [value,       setValue]       = useState('')
  const [reason,      setReason]      = useState(DISCOUNT_REASONS[0])
  const [description, setDescription] = useState('')

  const numVal    = parseFloat(value) || 0
  const preview   = discType === 'percentage' ? (subtotal * numVal) / 100 : numVal

  function apply() {
    if (!numVal || numVal <= 0) { toast.error('Ingresá un valor válido'); return }
    if (discType === 'percentage' && numVal > 100) { toast.error('El porcentaje no puede superar el 100%'); return }
    onApply({ type: discType, value: numVal, reason, description })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: SURFACE2, borderRadius: 18, border: BDR, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>Aplicar Descuento</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 6, padding: '3px 7px', color: MUTED, cursor: 'pointer' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Type */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
          {(['percentage', 'fixed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setDiscType(t)}
              style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: discType === t ? ACCENT : 'transparent', color: discType === t ? '#fff' : MUTED, transition: 'all 150ms' }}
            >
              {t === 'percentage' ? <><Percent style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Porcentaje</> : <><Tag style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Monto fijo</>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              {discType === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'}
            </label>
            <input
              type="number" min="0" value={value} onChange={e => setValue(e.target.value)}
              placeholder={discType === 'percentage' ? '10' : '500'}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 9, color: TEXT, fontSize: 15, fontWeight: 700, outline: 'none' }}
            />
            {numVal > 0 && (
              <p style={{ fontSize: 12, color: GREEN, margin: '6px 0 0' }}>
                Descuento: -${preview.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Motivo</label>
            <select
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 9, color: TEXT, fontSize: 13, outline: 'none' }}
            >
              {DISCOUNT_REASONS.map(r => <option key={r} value={r} style={{ background: SURFACE2 }}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
            <input
              type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Detalle del descuento..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 9, color: TEXT, fontSize: 13, outline: 'none' }}
            />
          </div>

          <button
            onClick={apply}
            style={{ width: '100%', padding: '11px', background: ACCENT, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main CheckoutModal ───────────────────────────────────────────────── */
export function CheckoutModal({
  isOpen, onClose, onSuccess,
  orderId, tableNumber, restaurantId,
  cashRegisterId, paidBy = 'Dueño',
  waiterId, waiterName,
}: CheckoutModalProps) {
  const [items,           setItems]           = useState<CheckoutItem[]>([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)

  const [discount,        setDiscount]        = useState<DiscountState | null>(null)
  const [showDiscount,    setShowDiscount]     = useState(false)
  const [tip,             setTip]             = useState('')

  const [splitMode,       setSplitMode]       = useState(false)
  const [singleMethod,    setSingleMethod]    = useState<PaymentMethod>('cash')
  const [splitPayments,   setSplitPayments]   = useState<PaymentEntry[]>([
    { method: 'cash', amount: '' },
  ])
  const [posSettings, setPosSettings] = useState<POSSettings>({
    tax_enabled: false,
    tax_percentage: 0,
    suggested_tip_percentages: [],
    enabled_payment_methods: ALL_METHODS,
  })
  const [customerPhone, setCustomerPhone] = useState<string | null>(null)
  const [customerName,  setCustomerName]  = useState<string | null>(null)

  /* ── POS settings cache (per restaurantId, survives modal re-opens) ── */
  const posSettingsCache = useRef<Map<string, POSSettings>>(new Map())

  const fetchPOSSettings = useCallback(async () => {
    if (posSettingsCache.current.has(restaurantId)) {
      const cached = posSettingsCache.current.get(restaurantId)!
      setPosSettings(cached)
      setSingleMethod(prev => cached.enabled_payment_methods.includes(prev) ? prev : cached.enabled_payment_methods[0] ?? 'cash')
      return
    }
    const { data } = await db
      .from('restaurants')
      .select('tax_enabled, tax_percentage, suggested_tip_percentages, enabled_payment_methods')
      .eq('id', restaurantId)
      .single()
    if (data) {
      const methods = Array.isArray(data.enabled_payment_methods) && data.enabled_payment_methods.length > 0
        ? data.enabled_payment_methods as PaymentMethod[]
        : ALL_METHODS
      const settings: POSSettings = {
        tax_enabled: data.tax_enabled ?? false,
        tax_percentage: Number(data.tax_percentage ?? 0),
        suggested_tip_percentages: Array.isArray(data.suggested_tip_percentages) ? data.suggested_tip_percentages : [],
        enabled_payment_methods: methods,
      }
      posSettingsCache.current.set(restaurantId, settings)
      setPosSettings(settings)
      setSingleMethod(prev => methods.includes(prev) ? prev : methods[0] ?? 'cash')
    }
  }, [restaurantId])

  /* ── Fetch order items + customer data ── */
  const fetchItems = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      const [itemsRes, orderRes] = await Promise.all([
        db.from('order_items').select('id, menu_item_name, quantity, price_snapshot, notes').eq('order_id', orderId),
        db.from('orders').select('customer_phone, customer_name').eq('id', orderId).maybeSingle(),
      ])
      if (itemsRes.error) throw itemsRes.error
      setItems((itemsRes.data ?? []).map((i: Omit<CheckoutItem, 'isCourtesy'>) => ({ ...i, isCourtesy: false })))
      setCustomerPhone(orderRes.data?.customer_phone ?? null)
      setCustomerName(orderRes.data?.customer_name ?? null)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar el pedido')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (isOpen) {
      fetchItems()
      fetchPOSSettings()
    }
  }, [isOpen, fetchItems, fetchPOSSettings])

  if (!isOpen) return null

  /* ── Computed values ── */
  const regularItems    = items.filter(i => !i.isCourtesy)
  const courtesyItems   = items.filter(i => i.isCourtesy)
  const subtotal        = regularItems.reduce((s, i) => s + i.price_snapshot * i.quantity, 0)
  const courtesyTotal   = courtesyItems.reduce((s, i) => s + i.price_snapshot * i.quantity, 0)
  const discountAmount  = discount
    ? discount.type === 'percentage'
      ? (subtotal * discount.value) / 100
      : discount.value
    : 0
  const tipAmount       = parseFloat(tip) || 0
  const netBeforeTax    = Math.max(0, subtotal - discountAmount - courtesyTotal)
  const taxAmount       = posSettings.tax_enabled ? Math.round(netBeforeTax * posSettings.tax_percentage / 100) : 0
  const total           = netBeforeTax + tipAmount + taxAmount
  const availableMethods = posSettings.enabled_payment_methods

  /* ── Toggle courtesy ── */
  function toggleCourtesy(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isCourtesy: !i.isCourtesy } : i))
  }

  /* ── Split payment helpers ── */
  function addSplitRow() {
    setSplitPayments(prev => [...prev, { method: 'cash', amount: '' }])
  }
  function removeSplitRow(idx: number) {
    setSplitPayments(prev => prev.filter((_, i) => i !== idx))
  }
  function updateSplitMethod(idx: number, method: PaymentMethod) {
    setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, method } : p))
  }
  function updateSplitAmount(idx: number, amount: string) {
    setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, amount } : p))
  }

  const splitTotal    = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const splitMissing  = total - splitTotal
  const splitValid    = Math.abs(splitMissing) < 0.01

  /* ── Confirm payment ── */
  async function confirmPayment() {
    if (splitMode && !splitValid) {
      toast.error(`Faltan $${splitMissing.toLocaleString('es-AR', { maximumFractionDigits: 0 })} para completar el pago`)
      return
    }
    setSaving(true)
    try {
      // 1. Get table info for the final update
      const { data: tableData } = await db
        .from('tables')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .maybeSingle()

      // 2. Determine payment entries
      const paymentEntries: { method: PaymentMethod; amount: number }[] = splitMode
        ? splitPayments.map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0 })).filter(p => p.amount > 0)
        : [{ method: singleMethod, amount: total - tipAmount }]

      // 3. Insert courtesies (if any)
      const courtesyRecords: { id: string; amount: number }[] = []
      for (const item of courtesyItems) {
        const { data: cv, error: ce } = await db.from('courtesies').insert({
          restaurant_id: restaurantId,
          order_id:      orderId,
          order_item_id: item.id,
          item_name:     item.menu_item_name,
          amount:        item.price_snapshot * item.quantity,
          reason:        'Cortesía',
          authorized_by: paidBy,
        }).select('id, amount').single()
        if (ce) throw ce
        courtesyRecords.push(cv)
      }

      // 4. Insert financial_transactions for courtesies
      for (const cv of courtesyRecords) {
        await db.from('financial_transactions').insert({
          restaurant_id:  restaurantId,
          type:           'courtesy',
          amount:         cv.amount,
          reference_type: 'courtesy',
          reference_id:   cv.id,
          cash_register_id: cashRegisterId ?? null,
          description:    `Cortesía — Mesa ${tableNumber}`,
        })
      }

      // 5. Insert payments + financial_transactions per method
      for (const entry of paymentEntries) {
        const { data: pmt, error: pe } = await db.from('payments').insert({
          order_id:         orderId,
          restaurant_id:    restaurantId,
          amount:           entry.amount,
          payment_method:   entry.method,
          paid_by:          paidBy,
          cash_register_id: cashRegisterId ?? null,
        }).select('id').single()
        if (pe) throw pe

        await db.from('financial_transactions').insert({
          restaurant_id:    restaurantId,
          type:             'sale',
          amount:           entry.amount,
          payment_method:   entry.method,
          reference_type:   'order',
          reference_id:     orderId,
          cash_register_id: cashRegisterId ?? null,
          description:      `Venta Mesa ${tableNumber}`,
          payment_id:       pmt.id,
        })

        // 6. Cash movements only for cash payments
        if (entry.method === 'cash' && cashRegisterId) {
          await db.from('cash_movements').insert({
            cash_register_id: cashRegisterId,
            restaurant_id:    restaurantId,
            type:             'income',
            amount:           entry.amount,
            description:      `Venta Mesa ${tableNumber}`,
            created_by_name:  paidBy,
          })
        }
      }

      // 7. Tip
      let tipId: string | null = null
      if (tipAmount > 0) {
        const { data: tipData, error: te } = await db.from('tips').insert({
          restaurant_id:    restaurantId,
          order_id:         orderId,
          waiter_id:        waiterId ?? null,
          amount:           tipAmount,
          payment_method:   singleMethod,
          cash_register_id: cashRegisterId ?? null,
        }).select('id').single()
        if (te) throw te
        tipId = tipData.id

        await db.from('financial_transactions').insert({
          restaurant_id:    restaurantId,
          type:             'tip',
          amount:           tipAmount,
          reference_type:   'tip',
          reference_id:     tipId,
          cash_register_id: cashRegisterId ?? null,
          description:      `Propina — Mesa ${tableNumber}`,
        })
      }

      // 8. Discount
      if (discount && discountAmount > 0) {
        await db.from('discounts').insert({
          restaurant_id:  restaurantId,
          order_id:       orderId,
          discount_type:  discount.type,
          value:          discount.value,
          amount_applied: discountAmount,
          reason:         discount.reason,
          description:    discount.description || null,
          applied_by:     paidBy,
        })
      }

      // 9. Ticket number
      const { data: lastTicket } = await db
        .from('tickets')
        .select('ticket_number')
        .eq('restaurant_id', restaurantId)
        .order('ticket_number', { ascending: false })
        .limit(1)
        .single()
      const ticketNumber = (lastTicket?.ticket_number ?? 0) + 1

      // 10. Insert ticket (immutable snapshot)
      await db.from('tickets').insert({
        restaurant_id:    restaurantId,
        order_id:         orderId,
        ticket_number:    ticketNumber,
        table_number:     tableNumber,
        waiter_id:        waiterId ?? null,
        waiter_name:      waiterName ?? paidBy,
        payment_method:   singleMethod,
        payment_methods:  splitMode
          ? splitPayments.map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0 }))
          : [{ method: singleMethod, amount: total - tipAmount }],
        subtotal,
        tax:              taxAmount,
        tip:              tipAmount,
        discount:         discountAmount,
        courtesy:         courtesyTotal,
        total,
        items:            items.map(i => ({
          id:              i.id,
          name:            i.menu_item_name,
          quantity:        i.quantity,
          price_snapshot:  i.price_snapshot,
          subtotal:        i.price_snapshot * i.quantity,
          is_courtesy:     i.isCourtesy,
          notes:           i.notes,
        })),
        status: 'paid',
      })

      // 11. Update order status
      await db.from('orders').update({
        status: 'completed',
      }).eq('id', orderId)

      // 12. Free the table
      if (tableData?.id) {
        await db.from('tables').update({
          status:    'free',
          waiter_id: null,
        }).eq('id', tableData.id)
      }

      // 13. Audit log
      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name:     paidBy,
        action:        'payment_completed',
        entity_type:   'order',
        entity_id:     orderId,
        details: {
          total,
          subtotal,
          discount:   discountAmount,
          tip:        tipAmount,
          courtesy:   courtesyTotal,
          methods:    paymentEntries,
          table:      tableNumber,
          ticket_num: ticketNumber,
        },
      })

      // 14. CRM upsert (no crítico — no bloquea el cobro)
      if (customerPhone) {
        try {
          const { data: existing } = await db
            .from('crm_contacts')
            .select('id, total_visits, total_spent')
            .eq('restaurant_id', restaurantId)
            .eq('phone', customerPhone)
            .maybeSingle()
          if (existing) {
            await db.from('crm_contacts').update({
              total_visits: (existing.total_visits ?? 0) + 1,
              total_spent:  (existing.total_spent ?? 0) + total,
              last_visit:   new Date().toISOString(),
            }).eq('id', existing.id)
          } else {
            await db.from('crm_contacts').insert({
              restaurant_id: restaurantId,
              first_name:    customerName ?? '',
              phone:         customerPhone,
              total_visits:  1,
              total_spent:   total,
              first_visit:   new Date().toISOString(),
              last_visit:    new Date().toISOString(),
            })
          }
        } catch (crmErr) {
          console.error('[CRM upsert]', crmErr)
        }
      }

      toast.success(`✅ Cobro registrado — Mesa ${tableNumber} liberada`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al procesar el cobro')
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ── */
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

        <div style={{
          position: 'relative', width: '100%', maxWidth: 600,
          background: SURFACE, borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: BDR, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
              Cuenta — Mesa {tableNumber}
            </h2>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '5px 9px', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: MUTED }}>Cargando pedido...</div>
            ) : (
              <>
                {/* Sin caja abierta */}
                {!cashRegisterId && (
                  <div style={{ margin: '16px 0 4px', padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚠️</span>
                    <span>No hay caja abierta. El cobro se registrará sin vincular a caja.</span>
                  </div>
                )}
                {/* Products */}
                <div style={{ marginTop: 20, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 12px' }}>
                    PRODUCTOS
                  </h3>
                  {items.length === 0 ? (
                    <p style={{ color: MUTED, fontSize: 14 }}>Sin ítems</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Header row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 90px 90px 36px', gap: 8, padding: '6px 10px' }}>
                        {['Producto', 'Cant.', 'Precio', 'Subtotal', ''].map(h => (
                          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase' }}>{h}</span>
                        ))}
                      </div>
                      {items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid', gridTemplateColumns: '1fr 48px 90px 90px 36px', gap: 8,
                            padding: '10px 10px', borderRadius: 10,
                            background: item.isCourtesy ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                            border: item.isCourtesy ? '1px solid rgba(34,197,94,0.2)' : BDR,
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontSize: 13, color: item.isCourtesy ? MUTED : TEXT, textDecoration: item.isCourtesy ? 'line-through' : 'none' }}>
                              {item.menu_item_name}
                            </p>
                            {item.isCourtesy && (
                              <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>🎁 Cortesía</span>
                            )}
                            {item.notes && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: AMBER }}>⚠️ {item.notes}</p>
                            )}
                          </div>
                          <span style={{ fontSize: 13, color: MUTED, textAlign: 'center' }}>{item.quantity}</span>
                          <span style={{ fontSize: 13, color: MUTED }}>
                            ${item.price_snapshot.toLocaleString('es-AR')}
                          </span>
                          <span style={{ fontSize: 13, color: item.isCourtesy ? MUTED : TEXT, textDecoration: item.isCourtesy ? 'line-through' : 'none', fontWeight: 600 }}>
                            ${(item.price_snapshot * item.quantity).toLocaleString('es-AR')}
                          </span>
                          <button
                            onClick={() => toggleCourtesy(item.id)}
                            title={item.isCourtesy ? 'Quitar cortesía' : 'Marcar como cortesía'}
                            style={{
                              width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: item.isCourtesy ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                            }}
                          >
                            <Gift style={{ width: 14, height: 14, color: item.isCourtesy ? GREEN : MUTED }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: '16px', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 14px' }}>
                    TOTALES
                  </h3>

                  {[
                    { label: 'Subtotal',    value: `$${subtotal.toLocaleString('es-AR')}`,         color: TEXT },
                    { label: 'Descuento',   value: discount ? `-$${discountAmount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '$0', color: discountAmount > 0 ? GREEN : MUTED },
                    { label: 'Cortesías',   value: `-$${courtesyTotal.toLocaleString('es-AR')}`,   color: courtesyTotal > 0 ? GREEN : MUTED },
                    posSettings.tax_enabled && { label: `Impuestos (${posSettings.tax_percentage}%)`, value: `$${taxAmount.toLocaleString('es-AR')}`, color: MUTED },
                  ].filter(Boolean).map(r => {
                    const row = r as { label: string; value: string; color: string }
                    return (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ fontSize: 13, color: MUTED }}>{row.label}</span>
                        <span style={{ fontSize: 13, color: row.color, fontWeight: 600 }}>{row.value}</span>
                      </div>
                    )
                  })}

                  {/* Tip input + suggested chips */}
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: posSettings.suggested_tip_percentages.length > 0 ? 6 : 0 }}>
                      <span style={{ fontSize: 13, color: MUTED }}>Propina</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: MUTED }}>$</span>
                        <input
                          type="number" min="0" step="0.01" value={tip}
                          onChange={e => setTip(e.target.value)}
                          placeholder="0"
                          style={{ width: 90, padding: '5px 8px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, color: AMBER, fontSize: 13, fontWeight: 700, outline: 'none', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                    {posSettings.suggested_tip_percentages.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {posSettings.suggested_tip_percentages.map(pct => {
                          const amt = Math.round(netBeforeTax * pct / 100)
                          const isActive = tip === String(amt)
                          return (
                            <button
                              key={pct}
                              onClick={() => setTip(isActive ? '' : String(amt))}
                              style={{
                                padding: '3px 10px', borderRadius: 7, border: isActive ? `1px solid ${AMBER}` : BDR,
                                background: isActive ? `rgba(245,158,11,0.15)` : 'rgba(255,255,255,0.05)',
                                color: isActive ? AMBER : MUTED, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              {pct}%
                            </button>
                          )
                        })}
                        <button
                          onClick={() => setTip('')}
                          style={{ padding: '3px 10px', borderRadius: 7, border: BDR, background: 'rgba(255,255,255,0.05)', color: MUTED, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Otro
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: BDR, marginTop: 10, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: TEXT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>TOTAL</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                      ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Discount button */}
                  <button
                    onClick={() => setShowDiscount(true)}
                    style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: discount ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', border: discount ? '1px solid rgba(34,197,94,0.3)' : BDR, borderRadius: 8, color: discount ? GREEN : MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Tag style={{ width: 13, height: 13 }} />
                    {discount ? `Descuento ${discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`} · ${discount.reason}` : 'Aplicar descuento'}
                    {discount && (
                      <span
                        onClick={e => { e.stopPropagation(); setDiscount(null) }}
                        style={{ marginLeft: 4, color: RED, cursor: 'pointer' }}
                      >×</span>
                    )}
                  </button>
                </div>

                {/* Payment method */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, margin: '0 0 14px' }}>
                    MÉTODO DE PAGO
                  </h3>

                  {!splitMode ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      {availableMethods.map(m => (
                        <button
                          key={m}
                          onClick={() => setSingleMethod(m)}
                          style={{
                            padding: '10px 8px', borderRadius: 10, border: singleMethod === m ? `2px solid ${ACCENT}` : BDR,
                            background: singleMethod === m ? `rgba(244,112,90,0.1)` : 'rgba(255,255,255,0.03)',
                            color: singleMethod === m ? ACCENT : MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            textAlign: 'center', transition: 'all 150ms',
                          }}
                        >
                          {METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {splitPayments.map((entry, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <select
                            value={entry.method}
                            onChange={e => updateSplitMethod(idx, e.target.value as PaymentMethod)}
                            style={{ flex: 1, padding: '9px 10px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 9, color: TEXT, fontSize: 13, outline: 'none' }}
                          >
                            {availableMethods.map(k => (
                              <option key={k} value={k} style={{ background: SURFACE }}>{METHOD_LABELS[k]}</option>
                            ))}
                          </select>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 9, padding: '9px 10px' }}>
                            <span style={{ fontSize: 13, color: MUTED }}>$</span>
                            <input
                              type="number" min="0" value={entry.amount}
                              onChange={e => updateSplitAmount(idx, e.target.value)}
                              placeholder="0"
                              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: TEXT, fontSize: 13, fontWeight: 700, outline: 'none' }}
                            />
                          </div>
                          {splitPayments.length > 1 && (
                            <button onClick={() => removeSplitRow(idx)} className="self-end sm:self-auto" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 10px', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={addSplitRow} className="w-full sm:w-auto" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: BDR, borderRadius: 9, color: MUTED, fontSize: 13, cursor: 'pointer' }}>
                        <Plus style={{ width: 14, height: 14 }} /> Agregar método
                      </button>
                      {!splitValid && splitTotal > 0 && (
                        <p style={{ fontSize: 12, color: RED, margin: '4px 0 0', textAlign: 'center' }}>
                          Faltan ${Math.abs(splitMissing).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </p>
                      )}
                      {splitValid && splitTotal > 0 && (
                        <p style={{ fontSize: 12, color: GREEN, margin: '4px 0 0', textAlign: 'center' }}>✓ Suma correcta</p>
                      )}
                    </div>
                  )}

                  {/* Split toggle */}
                  <button
                    onClick={() => {
                      setSplitMode(!splitMode)
                      if (!splitMode) {
                        setSplitPayments([{ method: 'cash', amount: String(total - tipAmount) }])
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: splitMode ? `rgba(244,112,90,0.1)` : 'rgba(255,255,255,0.04)', border: splitMode ? `1px solid ${ACCENT}40` : BDR, borderRadius: 8, color: splitMode ? ACCENT : MUTED, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Pago dividido {splitMode ? '(activo)' : ''}
                  </button>
                </div>

                {/* Confirm button */}
                <button
                  onClick={confirmPayment}
                  disabled={saving}
                  style={{
                    width: '100%', padding: '16px', background: saving ? 'rgba(244,112,90,0.5)' : ACCENT,
                    border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 800,
                    cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
                    fontFamily: 'var(--font-ruda, Ruda, sans-serif)',
                  }}
                >
                  {saving ? 'Procesando...' : 'CONFIRMAR COBRO'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Discount modal */}
      {showDiscount && (
        <DiscountModal
          subtotal={subtotal}
          onApply={d => setDiscount(d)}
          onClose={() => setShowDiscount(false)}
        />
      )}
    </>
  )
}
