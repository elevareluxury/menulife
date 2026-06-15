import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Payment, PaymentStatus } from '../sales/salesTypes'
import { TimelineService } from '../timeline/TimelineService'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, method:service_payment_methods(id, name, type)'

type PaymentInput = {
  sale_id:               string
  customer_id?:          string | null
  method_id?:            string | null
  amount:                number
  currency:              string
  transaction_reference?: string | null
  notes?:                string | null
  external_provider?:    Payment['external_provider']
}

export function usePayments(restaurantId: string | undefined) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetchBySale = useCallback(async (saleId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_payments')
        .select(SELECT)
        .eq('sale_id', saleId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPayments(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const record = async (input: PaymentInput): Promise<Payment | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_payments')
        .insert({
          sale_id:               input.sale_id,
          customer_id:           input.customer_id   ?? null,
          method_id:             input.method_id     ?? null,
          amount:                input.amount,
          currency:              input.currency,
          status:                'paid',
          external_provider:     input.external_provider ?? 'manual',
          transaction_reference: input.transaction_reference?.trim() || null,
          notes:                 input.notes?.trim() || null,
          paid_at:               new Date().toISOString(),
        })
        .select(SELECT)
        .single()
      if (error) throw error

      const payment = data as Payment
      setPayments(prev => [payment, ...prev])

      if (input.customer_id) {
        TimelineService.track({
          restaurantId,
          customerId:  input.customer_id,
          eventType:   'payment_received',
          title:       'Pago registrado',
          description: `${input.currency} ${input.amount.toLocaleString('es-AR')}`,
          metadata:    { payment_id: payment.id, sale_id: input.sale_id, amount: input.amount },
        })
      }

      return payment
    } catch {
      toast.error('Error al registrar el pago')
      return null
    }
  }

  const updateStatus = async (id: string, status: PaymentStatus): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_payments')
        .update({ status })
        .eq('id', id)
      if (error) throw error
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p))
      return true
    } catch {
      toast.error('Error al actualizar el pago')
      return false
    }
  }

  return { payments, loading, fetchBySale, record, updateStatus }
}
