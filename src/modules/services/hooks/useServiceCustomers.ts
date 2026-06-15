import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ServiceCustomer, CreateCustomerInput, DuplicateCheck } from '../types/customer'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'
import { recalculateCustomerScore } from '../score/CustomerScoreEngine'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const NIL_UUID = '00000000-0000-0000-0000-000000000000'

export function useServiceCustomers(restaurantId: string | undefined) {
  const [customers, setCustomers] = useState<ServiceCustomer[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (opts?: {
    status?: string
    search?: string
    tags?: string[]
  }) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      let q = db
        .from('service_customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (opts?.status && opts.status !== 'all') {
        q = q.eq('status', opts.status)
      }
      if (opts?.search?.trim()) {
        const s = opts.search.trim()
        q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`)
      }
      if (opts?.tags?.length) {
        q = q.contains('tags', opts.tags)
      }

      const { data, error } = await q
      if (error) throw error
      setCustomers(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const findByPhone = async (phone: string): Promise<ServiceCustomer | null> => {
    if (!restaurantId || !phone?.trim()) return null
    const { data } = await db
      .from('service_customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('phone', phone.trim())
      .maybeSingle()
    return data ?? null
  }

  const checkDuplicates = useCallback(async (
    phone?: string | null,
    email?: string | null,
    excludeId?: string,
  ): Promise<DuplicateCheck> => {
    const result: DuplicateCheck = { byPhone: null, byEmail: null }
    if (!restaurantId) return result

    if (phone?.trim()) {
      const { data } = await db
        .from('service_customers')
        .select('id, first_name, last_name, full_name, phone')
        .eq('restaurant_id', restaurantId)
        .eq('phone', phone.trim())
        .neq('id', excludeId ?? NIL_UUID)
        .maybeSingle()
      result.byPhone = data ?? null
    }
    if (email?.trim()) {
      const { data } = await db
        .from('service_customers')
        .select('id, first_name, last_name, full_name, email')
        .eq('restaurant_id', restaurantId)
        .eq('email', email.trim().toLowerCase())
        .neq('id', excludeId ?? NIL_UUID)
        .maybeSingle()
      result.byEmail = data ?? null
    }
    return result
  }, [restaurantId])

  const create = async (input: CreateCustomerInput): Promise<ServiceCustomer | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_customers')
        .insert({
          restaurant_id: restaurantId,
          first_name:    input.first_name.trim(),
          last_name:     input.last_name?.trim() || null,
          phone:         input.phone?.trim() || null,
          email:         input.email?.trim().toLowerCase() || null,
          notes:         input.notes?.trim() || null,
          source:        input.source ?? 'manual',
          status:        input.status ?? 'active',
          tags:          input.tags ?? [],
          birth_date:    input.birth_date ?? null,
          gender:        input.gender ?? null,
        })
        .select()
        .single()
      if (error) throw error
      setCustomers(prev => [data, ...prev])
      TimelineService.track({
        restaurantId,
        customerId: data.id,
        eventType:  'customer_created',
        title:      EVENT_CONFIG.customer_created.label,
        eventDate:  data.created_at,
        metadata:   { source: data.source },
      })
      recalculateCustomerScore(restaurantId, data.id)
      return data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear el cliente'
      toast.error(msg)
      return null
    }
  }

  const update = async (
    id: string,
    input: Partial<CreateCustomerInput & { status: string; tags: string[] }>,
  ): Promise<boolean> => {
    try {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (input.first_name !== undefined) payload.first_name = input.first_name.trim()
      if (input.last_name  !== undefined) payload.last_name  = input.last_name?.trim() || null
      if (input.phone      !== undefined) payload.phone      = input.phone?.trim() || null
      if (input.email      !== undefined) payload.email      = input.email?.trim().toLowerCase() || null
      if (input.notes      !== undefined) payload.notes      = input.notes?.trim() || null
      if (input.status     !== undefined) payload.status     = input.status
      if (input.tags       !== undefined) payload.tags       = input.tags
      if (input.source     !== undefined) payload.source     = input.source
      if (input.birth_date !== undefined) payload.birth_date = input.birth_date
      if (input.gender     !== undefined) payload.gender     = input.gender

      const { error } = await db
        .from('service_customers')
        .update(payload)
        .eq('id', id)
      if (error) throw error
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...payload } as ServiceCustomer : c))
      return true
    } catch {
      toast.error('Error al actualizar el cliente')
      return false
    }
  }

  // Incrementa el contador de reservas y actualiza última visita.
  // Usa fetch+update en lugar de función SQL para mantener toda la lógica en app layer.
  // Aceptable para escala single-operator; migrar a SQL atomic si se necesita multi-worker.
  const incrementBookingCount = async (id: string, visitAt: string): Promise<void> => {
    const { data: current } = await db
      .from('service_customers')
      .select('total_bookings')
      .eq('id', id)
      .single()
    const next = (current?.total_bookings ?? 0) + 1
    await db
      .from('service_customers')
      .update({ total_bookings: next, last_visit_at: visitAt, updated_at: new Date().toISOString() })
      .eq('id', id)
    setCustomers(prev =>
      prev.map(c => c.id === id ? { ...c, total_bookings: next, last_visit_at: visitAt } : c)
    )
  }

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status !== 'active' && c.status !== 'lead').length,
    newThisMonth: customers.filter(c => {
      const d = new Date(c.created_at)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length,
  }

  return {
    customers,
    loading,
    fetch,
    findByPhone,
    checkDuplicates,
    create,
    update,
    incrementBookingCount,
    stats,
  }
}
