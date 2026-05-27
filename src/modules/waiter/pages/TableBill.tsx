import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { ReactNode } from 'react'

// ── Theme ────────────────────────────────────────────────────────────────────
const BG     = '#0A0D12'
const CARD   = '#171A21'
const CARD2  = '#1E2330'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT   = '#F5F7FA'
const MUTED  = '#98A2B3'
const ACCENT = '#FF6B7A'
const GREEN  = '#10B981'
const GOLD   = '#F59E0B'

// ── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = 'cash' | 'debit_card' | 'credit_card' | 'mercadopago' | 'transfer' | 'other'
type TipMode = 0 | 10 | 15 | 20 | 'custom'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash',        label: 'Efectivo',     icon: '💵' },
  { value: 'debit_card',  label: 'Débito',        icon: '💳' },
  { value: 'credit_card', label: 'Crédito',       icon: '💳' },
  { value: 'mercadopago', label: 'MercadoPago',   icon: '📱' },
  { value: 'transfer',    label: 'Transferencia', icon: '🔄' },
  { value: 'other',       label: 'Otro',          icon: '💱' },
]

interface OrderItem {
  id: string
  menu_item_name: string
  quantity: number
  price_snapshot: number
  notes: string | null
}

interface OrderData {
  id: string
  table_number: string
  status: string
  total: number
  currency: string
  items: OrderItem[]
}

interface BillData {
  id: string
  order_id: string | null
  table_id: string
  subtotal: number
  tip: number
  total: number
  currency: string
  status: string
}

interface PaidInfo {
  total: number
  method: PaymentMethod
  change: number
  currency: string
}

// ── Component ────────────────────────────────────────────────────────────────
export function TableBill() {
  const { slug, tableNumber } = useParams()
  const navigate = useNavigate()
  const { waiter } = useWaiterAuthStore()

  const [order, setOrder]   = useState<OrderData | null>(null)
  const [bill, setBill]     = useState<BillData | null>(null)
  const [loading, setLoading] = useState(true)

  const [tipMode, setTipMode]       = useState<TipMode>(0)
  const [customTip, setCustomTip]   = useState('')
  const [splitPersons, setSplitPersons] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [paidInfo, setPaidInfo]     = useState<PaidInfo | null>(null)

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!waiter) navigate(`/waiter/${slug}/login`, { replace: true })
  }, [waiter, navigate, slug])

  // ── Fetch order + bill ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!waiter || !tableNumber) return

    async function fetchData() {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, table_number, status, total, currency, items:order_items(id, menu_item_name, quantity, price_snapshot, notes)')
          .eq('restaurant_id', waiter!.restaurant_id)
          .eq('table_number', tableNumber as string)
          .in('status', ['pending', 'confirmed', 'cooking', 'ready', 'delivered', 'bill_requested'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (orderError) throw orderError
        if (!orderData) { setLoading(false); return }

        const typedOrder = orderData as unknown as OrderData
        setOrder(typedOrder)

        // Fetch or auto-create bill
        const { data: existingBill } = await supabase
          .from('bills')
          .select('*')
          .eq('order_id', typedOrder.id)
          .maybeSingle()

        if (existingBill) {
          setBill(existingBill as BillData)
        } else {
          const { data: tableData } = await supabase
            .from('tables')
            .select('id')
            .eq('restaurant_id', waiter!.restaurant_id)
            .eq('table_number', tableNumber as string)
            .maybeSingle()

          if (tableData) {
            const { data: newBill, error: billError } = await supabase
              .from('bills')
              .insert({
                restaurant_id: waiter!.restaurant_id,
                table_id: tableData.id,
                waiter_id: waiter!.id,
                order_id: typedOrder.id,
                subtotal: typedOrder.total,
                tip: 0,
                total: typedOrder.total,
                currency: typedOrder.currency,
              })
              .select()
              .single()

            if (billError) {
              if (billError.code === '23505') {
                const { data: raceBill } = await supabase.from('bills').select('*').eq('order_id', typedOrder.id).maybeSingle()
                if (raceBill) setBill(raceBill as BillData)
              } else throw billError
              return
            }

            const billItems = typedOrder.items.map(item => ({
              bill_id: newBill.id,
              order_item_id: item.id,
              menu_item_name: item.menu_item_name,
              quantity: item.quantity,
              unit_price: item.price_snapshot,
              subtotal: item.price_snapshot * item.quantity,
            }))
            const { error: itemsError } = await supabase.from('bill_items').insert(billItems)
            if (itemsError) {
              await supabase.from('bills').delete().eq('id', newBill.id)
              throw itemsError
            }
            setBill(newBill as BillData)
          }
        }
      } catch (err) {
        console.error('Error fetching bill data:', err)
        toast.error('Error cargando la cuenta')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [waiter, tableNumber])

  // ── Derived values ──────────────────────────────────────────────────────────
  const subtotal    = bill?.subtotal ?? order?.total ?? 0
  const currency    = (bill?.currency ?? order?.currency ?? 'ARS') as 'ARS' | 'USD'
  const tipAmount   = tipMode === 'custom'
    ? Math.max(0, parseFloat(customTip) || 0)
    : Math.round(subtotal * (tipMode as number) / 100)
  const totalWithTip = subtotal + tipAmount
  const perPerson   = splitPersons > 1 ? totalWithTip / splitPersons : 0
  const parsed      = parseFloat(receivedAmount) || 0
  const change      = paymentMethod === 'cash' && parsed > totalWithTip ? parsed - totalWithTip : 0

  // ── Confirm payment ─────────────────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    if (!bill || !order) return
    if (paymentMethod === 'cash' && receivedAmount && parsed < totalWithTip) {
      toast.error('El monto recibido es menor al total')
      return
    }
    setConfirming(true)
    try {
      const { error: billErr } = await supabase
        .from('bills')
        .update({ tip: tipAmount, total: totalWithTip, status: 'paid', closed_at: new Date().toISOString() })
        .eq('id', bill.id)
      if (billErr) throw billErr

      const { error: payErr } = await supabase
        .from('payments')
        .insert({
          bill_id: bill.id,
          amount: paymentMethod === 'cash' ? (parsed || totalWithTip) : totalWithTip,
          payment_method: paymentMethod,
          created_by: waiter?.id ?? null,
        })
      if (payErr) throw payErr

      if (bill.order_id) {
        await supabase.from('orders').update({ status: 'paid' }).eq('id', bill.order_id)
      }

      await supabase.from('tables').update({ status: 'free' }).eq('id', bill.table_id)

      // Dismiss pending bill_request calls for this table
      await supabase
        .from('waiter_calls')
        .update({ status: 'attended', attended_at: new Date().toISOString() })
        .eq('table_id', bill.table_id)
        .eq('type', 'bill_request')
        .eq('status', 'pending')

      setPaidInfo({ total: totalWithTip, method: paymentMethod, change, currency })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar pago')
    } finally {
      setConfirming(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // ── No active order ─────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4" style={{ backgroundColor: BG }}>
        <p className="text-4xl">🍽️</p>
        <p className="text-base font-semibold" style={{ color: TEXT }}>No hay pedidos activos en Mesa {tableNumber}</p>
        <button
          onClick={() => navigate(`/waiter/${slug}/dashboard`)}
          className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ backgroundColor: ACCENT, color: '#fff' }}
        >
          Volver al dashboard
        </button>
      </div>
    )
  }

  // ── Post-payment confirmation ───────────────────────────────────────────────
  if (paidInfo) {
    const methodLabel = PAYMENT_OPTIONS.find(p => p.value === paidInfo.method)?.label ?? paidInfo.method
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6" style={{ backgroundColor: BG }}>
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${GREEN}20`, border: `2px solid ${GREEN}` }}
        >
          <Check className="w-10 h-10" style={{ color: GREEN }} />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Pago registrado</h1>
          <p className="text-base font-semibold" style={{ color: GREEN }}>Mesa {tableNumber} · LIBRE</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl p-5 space-y-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <SummaryRow label="Total cobrado" value={formatPrice(paidInfo.total, paidInfo.currency as 'ARS' | 'USD')} highlight />
          <SummaryRow label="Método de pago" value={methodLabel} />
          {paidInfo.change > 0 && (
            <SummaryRow label="Vuelto" value={formatPrice(paidInfo.change, paidInfo.currency as 'ARS' | 'USD')} gold />
          )}
        </div>

        <button
          onClick={() => navigate(`/waiter/${slug}/dashboard`)}
          className="w-full max-w-sm py-4 rounded-2xl font-bold text-base"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)`, color: '#fff' }}
        >
          Volver al dashboard
        </button>
      </div>
    )
  }

  // ── Main bill view ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>

      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4"
        style={{ backgroundColor: BG, borderBottom: `1px solid ${BORDER}` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: CARD }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: TEXT }} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold" style={{ color: TEXT }}>Mesa {tableNumber}</h1>
          <p className="text-xs" style={{ color: MUTED }}>
            {order.items.length} items
            {order.status === 'bill_requested' && (
              <span style={{ color: GOLD }}> · 💰 Pidió la cuenta</span>
            )}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-4 max-w-md mx-auto">

        {/* ── Items del pedido ──────────────────────────────────────────────── */}
        <BillSection title="Pedido">
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-start gap-2">
                <span className="text-sm flex-1" style={{ color: MUTED }}>
                  {item.quantity}× {item.menu_item_name}
                  {item.notes && <span className="text-xs italic block">{item.notes}</span>}
                </span>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: TEXT }}>
                  {formatPrice(item.price_snapshot * item.quantity, currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
            <span className="text-sm" style={{ color: MUTED }}>Subtotal</span>
            <span className="font-bold" style={{ color: TEXT }}>{formatPrice(subtotal, currency)}</span>
          </div>
        </BillSection>

        {/* ── Propina ───────────────────────────────────────────────────────── */}
        <BillSection title="Propina">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {([0, 10, 15, 20] as const).map(pct => (
              <button
                key={pct}
                onClick={() => { setTipMode(pct); setCustomTip('') }}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: tipMode === pct ? `${ACCENT}20` : CARD2,
                  color: tipMode === pct ? ACCENT : MUTED,
                  border: `1px solid ${tipMode === pct ? `${ACCENT}40` : BORDER}`,
                }}
              >
                {pct === 0 ? 'Sin' : `${pct}%`}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Monto personalizado"
            value={customTip}
            onChange={e => { setCustomTip(e.target.value); setTipMode('custom') }}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: CARD2, color: TEXT, border: `1px solid ${BORDER}` }}
          />
          {tipAmount > 0 && (
            <p className="mt-2 text-xs text-right" style={{ color: MUTED }}>
              Propina: <span style={{ color: GREEN }}>{formatPrice(tipAmount, currency)}</span>
            </p>
          )}
        </BillSection>

        {/* ── Dividir cuenta ────────────────────────────────────────────────── */}
        <BillSection title="Dividir cuenta">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSplitPersons(p => Math.max(1, p - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}` }}
              >
                <Minus className="w-4 h-4" style={{ color: MUTED }} />
              </button>
              <span className="text-xl font-bold w-8 text-center" style={{ color: TEXT }}>{splitPersons}</span>
              <button
                onClick={() => setSplitPersons(p => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: CARD2, border: `1px solid ${BORDER}` }}
              >
                <Plus className="w-4 h-4" style={{ color: MUTED }} />
              </button>
              <span className="text-sm" style={{ color: MUTED }}>
                {splitPersons === 1 ? 'persona' : 'personas'}
              </span>
            </div>
            {splitPersons > 1 && (
              <div className="text-right">
                <p className="text-xs" style={{ color: MUTED }}>por persona</p>
                <p className="text-lg font-bold" style={{ color: ACCENT }}>{formatPrice(perPerson, currency)}</p>
              </div>
            )}
          </div>
        </BillSection>

        {/* ── Total ─────────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
        >
          <span className="font-semibold" style={{ color: MUTED }}>Total a cobrar</span>
          <span className="text-2xl font-bold" style={{ color: TEXT }}>{formatPrice(totalWithTip, currency)}</span>
        </div>

        {/* ── Método de pago ────────────────────────────────────────────────── */}
        <BillSection title="Método de pago">
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: paymentMethod === opt.value ? `${ACCENT}18` : CARD2,
                  border: `1px solid ${paymentMethod === opt.value ? `${ACCENT}50` : BORDER}`,
                }}
              >
                <span className="text-xl">{opt.icon}</span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: paymentMethod === opt.value ? ACCENT : MUTED }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div className="mt-3">
              <label className="block text-xs font-medium mb-1.5" style={{ color: MUTED }}>
                Monto recibido
              </label>
              <input
                type="number"
                placeholder={String(totalWithTip)}
                value={receivedAmount}
                onChange={e => setReceivedAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ backgroundColor: CARD2, color: TEXT, border: `1px solid ${BORDER}` }}
              />
              {change > 0 && (
                <p className="mt-2 text-sm font-semibold" style={{ color: GOLD }}>
                  Vuelto: {formatPrice(change, currency)}
                </p>
              )}
            </div>
          )}
        </BillSection>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <button
          onClick={handleConfirmPayment}
          disabled={confirming}
          className="w-full py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)`,
            color: '#fff',
            boxShadow: `0 8px 24px ${ACCENT}40`,
          }}
        >
          {confirming ? 'Procesando...' : `Confirmar pago · ${formatPrice(totalWithTip, currency)}`}
        </button>

      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function BillSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function SummaryRow({ label, value, highlight, gold }: { label: string; value: string; highlight?: boolean; gold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: MUTED }}>{label}</span>
      <span className="font-semibold" style={{ color: highlight ? TEXT : gold ? GOLD : MUTED }}>
        {value}
      </span>
    </div>
  )
}
