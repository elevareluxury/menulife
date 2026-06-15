import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Membership, MembershipStatus, MembershipHealth, RenewalStrategy } from '../membership/membershipTypes'
import { computeMembershipHealth } from '../membership/allowanceUtils'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, plan:service_membership_plans(*)'

const STATUS_PRIORITY: Record<string, number> = {
  active: 4, paused: 3, pending: 2, expired: 1, cancelled: 0,
}

export type MembershipSummary = {
  status:       MembershipStatus
  renewal_date: string | null
  health:       MembershipHealth
}

export function useMemberships(restaurantId: string | undefined) {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading,     setLoading]     = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_memberships')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setMemberships(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: {
    customer_id:      string
    plan_id:          string
    starts_at:        string
    ends_at?:         string | null
    renewal_date?:    string | null
    auto_renew:       boolean
    renewal_strategy: RenewalStrategy
    notes?:           string | null
  }): Promise<Membership | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_memberships')
        .insert({
          ...input,
          restaurant_id: restaurantId,
          status:        'active',
          health:        'healthy',
        })
        .select(SELECT)
        .single()
      if (error) throw error
      setMemberships(prev => [data, ...prev])
      TimelineService.track({
        restaurantId,
        customerId:  data.customer_id,
        eventType:   'membership_created',
        title:       EVENT_CONFIG['membership_created']?.label ?? 'Membresía activada',
        description: data.plan?.name ?? null,
        eventDate:   data.created_at,
        metadata:    { plan_id: data.plan_id, plan_name: data.plan?.name },
      })
      return data
    } catch {
      toast.error('Error al crear la membresía')
      return null
    }
  }

  const updateStatus = async (
    id:         string,
    status:     MembershipStatus,
    customerId: string,
    planName?:  string | null,
  ): Promise<boolean> => {
    try {
      const membership = memberships.find(m => m.id === id)
      const newHealth: MembershipHealth = computeMembershipHealth({
        status,
        renewal_date:     membership?.renewal_date ?? null,
        daysSinceLastUse: null,
      })

      const { error } = await db
        .from('service_memberships')
        .update({ status, health: newHealth, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setMemberships(prev =>
        prev.map(m => m.id === id ? { ...m, status, health: newHealth } : m)
      )

      const STATUS_EVENT: Partial<Record<MembershipStatus, string>> = {
        active:    'membership_renewed',
        paused:    'membership_paused',
        expired:   'membership_expired',
        cancelled: 'membership_cancelled',
      }
      const eventType = STATUS_EVENT[status]
      if (eventType && restaurantId) {
        TimelineService.track({
          restaurantId,
          customerId,
          eventType,
          title:       EVENT_CONFIG[eventType]?.label ?? eventType,
          description: planName ?? null,
          eventDate:   new Date().toISOString(),
        })
      }
      return true
    } catch {
      toast.error('Error al actualizar la membresía')
      return false
    }
  }

  // Lightweight summary map for customer list filters
  const fetchSummaryMap = async (): Promise<Map<string, MembershipSummary>> => {
    if (!restaurantId) return new Map()
    const { data } = await db
      .from('service_memberships')
      .select('customer_id, status, renewal_date, health')
      .eq('restaurant_id', restaurantId)
      .in('status', ['active', 'paused', 'pending', 'expired'])
    const map = new Map<string, MembershipSummary>()
    for (const m of data ?? []) {
      const existing = map.get(m.customer_id)
      if (!existing || STATUS_PRIORITY[m.status] > STATUS_PRIORITY[existing.status]) {
        map.set(m.customer_id, {
          status:       m.status,
          renewal_date: m.renewal_date,
          health:       m.health ?? 'healthy',
        })
      }
    }
    return map
  }

  return { memberships, loading, fetchByCustomer, create, updateStatus, fetchSummaryMap }
}
