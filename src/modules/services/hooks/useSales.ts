import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleStatus, SaleItemInput } from '../sales/salesTypes'
import { computeItemTotal, computeSaleTotals } from '../sales/salesUtils'
import { TimelineService } from '../timeline/TimelineService'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, customer:service_customers(id, full_name), items:service_sale_items(* ORDER BY sort_order), payments:service_payments(*, method:service_payment_methods(id, name, type))'

export function useSales(restaurantId: string | undefined) {
  const [sales,   setSales]   = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_sales')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSales(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const fetchAll = useCallback(async (limit = 50) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_sales')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      setSales(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: {
    customer_id:   string
    customer_name?: string
    title?:        string | null
    currency:      string
    tax_percent:   number
    source?:       Sale['source']
    sale_channel?: Sale['sale_channel']
    notes?:        string | null
    items:         SaleItemInput[]
    quote_id?:     string | null
    booking_id?:   string | null
  }): Promise<Sale | null> => {
    if (!restaurantId) return null
    try {
      const { subtotal, discount, tax, total } = computeSaleTotals(input.items, input.tax_percent)

      const { data: sale, error: sErr } = await db
        .from('service_sales')
        .insert({
          restaurant_id: restaurantId,
          customer_id:   input.customer_id,
          sale_number:   '',
          title:         input.title?.trim() || null,
          status:        'pending',
          source:        input.source        ?? 'manual',
          sale_channel:  input.sale_channel  ?? 'presencial',
          subtotal,
          discount,
          tax,
          total,
          balance_due:   total,
          currency:      input.currency,
          quote_id:      input.quote_id   ?? null,
          booking_id:    input.booking_id ?? null,
          notes:         input.notes?.trim() || null,
          metadata:      input.customer_name ? { customer_name: input.customer_name } : {},
        })
        .select('id, sale_number, customer_id, created_at')
        .single()
      if (sErr) throw sErr

      // Insert items
      if (input.items.length > 0) {
        const rows = input.items.filter(it => it.name.trim()).map((it, idx) => ({
          sale_id:    sale.id,
          item_type:  it.item_type,
          name:       it.name.trim(),
          quantity:   it.quantity,
          unit_price: it.unit_price,
          discount:   it.discount,
          total:      computeItemTotal(it),
          sort_order: idx,
        }))
        const { error: iErr } = await db.from('service_sale_items').insert(rows)
        if (iErr) throw iErr
      }

      // Re-fetch full sale
      const { data: full } = await db.from('service_sales').select(SELECT).eq('id', sale.id).single()
      const result = full as Sale
      setSales(prev => [result, ...prev])

      // Timeline
      TimelineService.track({
        restaurantId,
        customerId:  sale.customer_id,
        eventType:   'sale_created',
        title:       'Venta registrada',
        description: `${result.sale_number}${input.title ? ` — ${input.title}` : ''}`,
        eventDate:   sale.created_at,
        metadata:    { sale_id: sale.id, sale_number: result.sale_number, total },
      })

      return result
    } catch {
      toast.error('Error al crear la venta')
      return null
    }
  }

  const updateStatus = async (id: string, status: SaleStatus): Promise<boolean> => {
    if (!restaurantId) return false
    try {
      const { error } = await db
        .from('service_sales')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setSales(prev => prev.map(s => s.id === id ? { ...s, status } : s))

      if (status === 'cancelled') {
        const s = sales.find(s => s.id === id)
        if (s) {
          TimelineService.track({
            restaurantId,
            customerId:  s.customer_id!,
            eventType:   'sale_cancelled',
            title:       'Venta cancelada',
            description: s.sale_number,
            metadata:    { sale_id: id },
          })
        }
      }
      return true
    } catch {
      toast.error('Error al actualizar la venta')
      return false
    }
  }

  // Called after recording a payment to recalculate balance_due and status
  const recalcBalance = async (saleId: string): Promise<void> => {
    try {
      // Fetch all paid payments for this sale
      const { data: payments } = await db
        .from('service_payments')
        .select('amount')
        .eq('sale_id', saleId)
        .eq('status', 'paid')

      const paid      = (payments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)
      const sale      = sales.find(s => s.id === saleId)
      if (!sale) return

      const balance   = Math.max(0, sale.total - paid)
      const newStatus: SaleStatus = balance <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'pending'

      const { error } = await db
        .from('service_sales')
        .update({ balance_due: balance, status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', saleId)
      if (error) return

      setSales(prev => prev.map(s =>
        s.id === saleId ? { ...s, balance_due: balance, status: newStatus } : s
      ))
    } catch {
      // silent — balance recalc is best-effort
    }
  }

  return { sales, loading, fetchByCustomer, fetchAll, create, updateStatus, recalcBalance }
}
