import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MembershipUsage } from '../membership/membershipTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useMembershipUsage(restaurantId: string | undefined) {
  const [usages,  setUsages]  = useState<MembershipUsage[]>([])
  const [loading, setLoading] = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_membership_usage')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('used_at', { ascending: false })
      if (error) throw error
      setUsages(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const record = async (input: {
    membership_id: string
    customer_id:   string
    benefit_key:   string
    quantity:      number
    notes?:        string | null
    used_at?:      string
  }): Promise<MembershipUsage | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_membership_usage')
        .insert({
          ...input,
          restaurant_id: restaurantId,
          used_at:       input.used_at ?? new Date().toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      setUsages(prev => [data, ...prev])
      return data
    } catch {
      toast.error('Error al registrar el uso')
      return null
    }
  }

  // Group usages by membership_id for the profile section
  const usagesByMembership = usages.reduce<Record<string, MembershipUsage[]>>((acc, u) => {
    if (!acc[u.membership_id]) acc[u.membership_id] = []
    acc[u.membership_id].push(u)
    return acc
  }, {})

  return { usages, loading, fetchByCustomer, record, usagesByMembership }
}
