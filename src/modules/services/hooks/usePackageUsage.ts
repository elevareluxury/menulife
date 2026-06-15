import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PackageUsage } from '../packages/packageTypes'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function usePackageUsage(restaurantId: string | undefined) {
  const [usages, setUsages] = useState<PackageUsage[]>([])

  const fetchByCustomer = useCallback(async (customerId: string) => {
    if (!restaurantId) return
    const { data } = await db
      .from('service_package_usages')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .order('used_at', { ascending: false })
    setUsages(data ?? [])
  }, [restaurantId])

  const record = async (input: {
    package_id:  string
    customer_id: string
    item_key:    string
    quantity:    number
    booking_id?: string | null
    notes?:      string | null
  }): Promise<PackageUsage | null> => {
    if (!restaurantId) return null
    try {
      const { data, error } = await db
        .from('service_package_usages')
        .insert({ ...input, restaurant_id: restaurantId, used_at: new Date().toISOString() })
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

  const usagesByPackage = usages.reduce<Record<string, PackageUsage[]>>((acc, u) => {
    if (!acc[u.package_id]) acc[u.package_id] = []
    acc[u.package_id].push(u)
    return acc
  }, {})

  return { usages, usagesByPackage, fetchByCustomer, record }
}
