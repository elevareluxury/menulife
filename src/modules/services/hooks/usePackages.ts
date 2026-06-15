import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Package, PackageStatus } from '../packages/packageTypes'
import { TimelineService } from '../timeline/TimelineService'
import { EVENT_CONFIG } from '../timeline/timelineEvents'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const SELECT = '*, template:service_package_templates(*)'

export function usePackages(restaurantId: string | undefined) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_packages')
        .select(SELECT)
        .eq('restaurant_id', restaurantId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPackages(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const create = async (input: {
    customer_id:  string
    template_id:  string
    starts_at:    string
    expires_at?:  string | null
    notes?:       string | null
  }): Promise<Package | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_packages')
        .insert({ ...input, restaurant_id: restaurantId, status: 'active', consumption: {} })
        .select(SELECT)
        .single()
      if (error) throw error
      setPackages(prev => [data, ...prev])
      TimelineService.track({
        restaurantId,
        customerId:  data.customer_id,
        eventType:   'membership_created',
        title:       EVENT_CONFIG['membership_created']?.label ?? 'Paquete activado',
        description: data.template?.name ?? null,
        eventDate:   data.created_at,
        metadata:    { package_id: data.id, template_name: data.template?.name },
      })
      return data
    } catch {
      toast.error('Error al asignar el paquete')
      return null
    }
  }

  const updateStatus = async (id: string, status: PackageStatus): Promise<boolean> => {
    try {
      const { error } = await db
        .from('service_packages')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      setPackages(prev => prev.map(p => p.id === id ? { ...p, status } : p))
      return true
    } catch {
      toast.error('Error al actualizar el paquete')
      return false
    }
  }

  return { packages, loading, fetchByCustomer, create, updateStatus }
}
