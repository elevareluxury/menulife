import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '../sales/salesTypes'
import { DEFAULT_PAYMENT_METHODS } from '../sales/salesTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type MethodInput = Omit<PaymentMethod, 'id' | 'restaurant_id' | 'created_at'>

export function usePaymentMethods(restaurantId: string | undefined) {
  const [methods,  setMethods]  = useState<PaymentMethod[]>([])
  const [loading,  setLoading]  = useState(false)
  const [seeding,  setSeeding]  = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_payment_methods')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active')
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setMethods(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: MethodInput): Promise<PaymentMethod | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_payment_methods')
        .insert({ ...input, restaurant_id: restaurantId })
        .select()
        .single()
      if (error) throw error
      setMethods(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      return data
    } catch {
      toast.error('Error al crear el método de pago')
      return null
    }
  }

  const deactivate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_payment_methods')
        .update({ status: 'inactive' })
        .eq('id', id)
      if (error) throw error
      setMethods(prev => prev.filter(m => m.id !== id))
      return true
    } catch {
      toast.error('Error al desactivar el método')
      return false
    }
  }

  // Seed default methods if none exist
  const seedDefaults = async (): Promise<void> => {
    if (!restaurantId || methods.length > 0) return
    setSeeding(true)
    try {
      const rows = DEFAULT_PAYMENT_METHODS.map((m, i) => ({
        ...m, restaurant_id: restaurantId, sort_order: i,
      }))
      const { data, error } = await db
        .from('service_payment_methods')
        .insert(rows)
        .select()
      if (error) throw error
      setMethods(data ?? [])
      toast.success('Métodos de pago configurados')
    } catch {
      toast.error('Error al configurar métodos de pago')
    } finally {
      setSeeding(false)
    }
  }

  return { methods, loading, seeding, fetch, create, deactivate, seedDefaults }
}
