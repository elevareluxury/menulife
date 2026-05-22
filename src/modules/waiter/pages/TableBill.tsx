import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { supabase } from '@/lib/supabase'
import { useWaiterAuthStore } from '@/store/waiterAuthStore'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

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
  order_id: string
  table_id: string
  subtotal: number
  tip: number
  total: number
  currency: string
  status: string
}

export function TableBill() {
  const { slug, tableNumber } = useParams()
  const navigate = useNavigate()
  const { waiter } = useWaiterAuthStore()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [bill, setBill] = useState<BillData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTipModal, setShowTipModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (!waiter || !tableNumber) return

    async function fetchData() {
      try {
        // Buscar pedido activo de la mesa
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, table_number, status, total, currency, items:order_items(id, menu_item_name, quantity, price_snapshot, notes)')
          .eq('restaurant_id', waiter!.restaurant_id)
          .eq('table_number', tableNumber as string)
          .in('status', ['pending', 'cooking', 'ready', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (orderError) throw orderError
        if (!orderData) { setLoading(false); return }

        const typedOrder = orderData as unknown as OrderData
        setOrder(typedOrder)

        // Buscar o crear cuenta
        const { data: existingBill } = await db
          .from('bills')
          .select('*')
          .eq('order_id', typedOrder.id)
          .maybeSingle()

        if (existingBill) {
          setBill(existingBill)
        } else {
          // Buscar table_id
          const { data: tableData } = await db
            .from('tables')
            .select('id')
            .eq('restaurant_id', waiter!.restaurant_id)
            .eq('table_number', tableNumber)
            .maybeSingle()

          if (tableData) {
            const { data: newBill, error: billError } = await db
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

            if (billError) throw billError
            setBill(newBill)

            // Crear bill_items
            const billItems = typedOrder.items.map(item => ({
              bill_id: newBill.id,
              order_item_id: item.id,
              menu_item_name: item.menu_item_name,
              quantity: item.quantity,
              unit_price: item.price_snapshot,
              subtotal: item.price_snapshot * item.quantity,
            }))
            await db.from('bill_items').insert(billItems)
          }
        }
      } catch (error) {
        console.error('Error fetching bill data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [waiter, tableNumber])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-8 text-center">
          <p className="text-gray-600 mb-4">No hay pedidos activos en esta mesa</p>
          <Button onClick={() => navigate(-1)}>Volver</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Mesa {tableNumber}</h1>
            <p className="text-sm text-gray-500">{order.items.length} items</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-4 max-w-md">
        {/* Items */}
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Items del Pedido</h2>
          <div className="space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.quantity}x {item.menu_item_name}</span>
                <span className="font-semibold">
                  {formatPrice(item.price_snapshot * item.quantity, order.currency as 'ARS' | 'USD')}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Totales */}
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatPrice(bill?.subtotal ?? order.total, order.currency as 'ARS' | 'USD')}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600">Propina</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatPrice(bill?.tip ?? 0, order.currency as 'ARS' | 'USD')}</span>
                <Button size="sm" variant="ghost" onClick={() => setShowTipModal(true)}>
                  {(bill?.tip ?? 0) > 0 ? 'Cambiar' : 'Agregar'}
                </Button>
              </div>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-emerald-600">
                {formatPrice(bill?.total ?? order.total, order.currency as 'ARS' | 'USD')}
              </span>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <Button onClick={() => setShowSplitModal(true)} className="w-full" variant="secondary">
          <Users className="w-4 h-4 mr-2" />
          Dividir Cuenta
        </Button>
        <Button onClick={() => setShowPaymentModal(true)} className="w-full">
          <Receipt className="w-4 h-4 mr-2" />
          Cobrar
        </Button>
      </div>

      {bill && (
        <>
          <TipModal
            isOpen={showTipModal}
            onClose={() => setShowTipModal(false)}
            bill={bill}
            onUpdate={(tip: number) => setBill(b => b ? { ...b, tip, total: b.subtotal + tip } : b)}
          />
          <SplitModal
            isOpen={showSplitModal}
            onClose={() => setShowSplitModal(false)}
            bill={bill}
            items={order.items}
          />
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            bill={bill}
            onSuccess={() => navigate(`/waiter/${slug}/dashboard`)}
          />
        </>
      )}
    </div>
  )
}

// --- Tip Modal ---
function TipModal({ isOpen, onClose, bill, onUpdate }: {
  isOpen: boolean; onClose: () => void; bill: BillData
  onUpdate: (tip: number) => void
}) {
  const [customTip, setCustomTip] = useState('')
  const [loading, setLoading] = useState(false)

  const applyTip = async (amount: number) => {
    setLoading(true)
    try {
      const { error } = await db
        .from('bills')
        .update({ tip: amount, total: bill.subtotal + amount })
        .eq('id', bill.id)
      if (error) throw error
      onUpdate(amount)
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const suggested = [
    { label: '10%', amount: Math.round(bill.subtotal * 0.1) },
    { label: '15%', amount: Math.round(bill.subtotal * 0.15) },
    { label: '20%', amount: Math.round(bill.subtotal * 0.2) },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar Propina">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {suggested.map(tip => (
            <Button key={tip.label} variant="secondary" onClick={() => applyTip(tip.amount)} disabled={loading}
              className="flex flex-col h-auto py-4 gap-1">
              <span className="text-lg font-bold">{tip.label}</span>
              <span className="text-xs">{formatPrice(tip.amount, bill.currency as 'ARS' | 'USD')}</span>
            </Button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monto personalizado</label>
          <div className="flex gap-2">
            <Input type="number" placeholder="0" value={customTip}
              onChange={e => setCustomTip(e.target.value)} />
            <Button onClick={() => applyTip(parseFloat(customTip) || 0)} disabled={loading}>Aplicar</Button>
          </div>
        </div>
        <Button variant="ghost" onClick={() => applyTip(0)} disabled={loading} className="w-full">
          Sin propina
        </Button>
      </div>
    </Modal>
  )
}

// --- Split Modal ---
function SplitModal({ isOpen, onClose, bill, items }: {
  isOpen: boolean; onClose: () => void; bill: BillData; items: OrderItem[]
}) {
  const [splitType, setSplitType] = useState<'equal' | 'by_item'>('equal')
  const [people, setPeople] = useState(2)
  const [assignments, setAssignments] = useState<Record<string, string>>({})

  const perPerson = people > 0 ? bill.total / people : bill.total

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dividir Cuenta" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button variant={splitType === 'equal' ? 'primary' : 'secondary'} onClick={() => setSplitType('equal')}>
            Por Personas
          </Button>
          <Button variant={splitType === 'by_item' ? 'primary' : 'secondary'} onClick={() => setSplitType('by_item')}>
            Por Items
          </Button>
        </div>

        {splitType === 'equal' ? (
          <div>
            <Input label="¿Cuántas personas?" type="number" min={2} value={people}
              onChange={e => setPeople(parseInt(e.target.value) || 2)} />
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-center">
              <p className="text-sm text-gray-600 mb-1">Total por persona:</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatPrice(perPerson, bill.currency as 'ARS' | 'USD')}
              </p>
            </div>
            <Button className="w-full mt-4" onClick={() => {
              toast.success(`${formatPrice(perPerson, bill.currency as 'ARS' | 'USD')} por persona`)
              onClose()
            }}>
              Confirmar División
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-3">Asigna cada item a una persona</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{item.quantity}x {item.menu_item_name}</span>
                  <Input placeholder="Nombre" className="w-28 text-sm"
                    value={assignments[item.id] ?? ''}
                    onChange={e => setAssignments(prev => ({ ...prev, [item.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={() => { toast.success('División guardada'); onClose() }}>
              Confirmar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// --- Payment Modal ---
function PaymentModal({ isOpen, onClose, bill, onSuccess }: {
  isOpen: boolean; onClose: () => void; bill: BillData; onSuccess: () => void
}) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amount, setAmount] = useState(bill.total.toString())
  const [loading, setLoading] = useState(false)
  const { waiter } = useWaiterAuthStore()

  const parsedAmount = parseFloat(amount) || 0
  const change = paymentMethod === 'cash' && parsedAmount > bill.total ? parsedAmount - bill.total : 0

  const handlePayment = async () => {
    if (parsedAmount <= 0) { toast.error('Monto inválido'); return }
    setLoading(true)
    try {
      const { error: payErr } = await db
        .from('payments')
        .insert({ bill_id: bill.id, amount: parsedAmount, payment_method: paymentMethod, created_by: waiter?.id })
      if (payErr) throw payErr

      const { error: billErr } = await db
        .from('bills')
        .update({ status: 'paid', closed_at: new Date().toISOString() })
        .eq('id', bill.id)
      if (billErr) throw billErr

      await supabase.from('orders').update({ status: 'delivered' }).eq('id', bill.order_id)

      await db.from('tables').update({ status: 'free' }).eq('id', bill.table_id)

      toast.success('Pago registrado')
      onSuccess()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago">
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-1">Total a cobrar:</p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatPrice(bill.total, bill.currency as 'ARS' | 'USD')}
          </p>
        </div>

        <Input label="Monto Recibido" type="number" step="1" value={amount}
          onChange={e => setAmount(e.target.value)} />

        <Select
          label="Método de Pago"
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          options={[
            { value: 'cash', label: 'Efectivo' },
            { value: 'debit_card', label: 'Tarjeta de Débito' },
            { value: 'credit_card', label: 'Tarjeta de Crédito' },
            { value: 'transfer', label: 'Transferencia' },
          ]}
        />

        {change > 0 && (
          <div className="p-3 bg-green-50 rounded-xl">
            <p className="text-sm text-gray-600">Vuelto:</p>
            <p className="text-xl font-bold text-green-600">
              {formatPrice(change, bill.currency as 'ARS' | 'USD')}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handlePayment} isLoading={loading} className="flex-1">Confirmar Pago</Button>
        </div>
      </div>
    </Modal>
  )
}
