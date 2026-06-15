import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MembershipPlan } from '../membership/membershipTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type PlanInput = Omit<MembershipPlan, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>

export function useMembershipPlans(restaurantId: string | undefined) {
  const [plans,   setPlans]   = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_membership_plans')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'archived')
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      setPlans(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: PlanInput): Promise<MembershipPlan | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_membership_plans')
        .insert({ ...input, restaurant_id: restaurantId })
        .select()
        .single()
      if (error) throw error
      setPlans(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order))
      return data
    } catch {
      toast.error('Error al crear el plan')
      return null
    }
  }

  const update = async (id: string, input: Partial<PlanInput>): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_membership_plans')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setPlans(prev => prev.map(p => p.id === id ? { ...p, ...input } : p))
      return true
    } catch {
      toast.error('Error al actualizar el plan')
      return false
    }
  }

  const archive = async (id: string): Promise<boolean> => {
    const ok = await update(id, { status: 'archived' })
    if (ok) setPlans(prev => prev.filter(p => p.id !== id))
    return ok
  }

  return { plans, loading, fetch, create, update, archive }
}
