import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ServiceResourceType {
  id: string
  restaurant_id: string | null
  name: string
  icon: string
  color: string
  is_system: boolean
  is_active: boolean
  sort_order: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useServiceResourceTypes(restaurantId: string | undefined) {
  const [types, setTypes] = useState<ServiceResourceType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }

    db
      .from('service_resource_types')
      .select('*')
      .or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`)
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('sort_order', { ascending: true })
      .then(({ data }: { data: ServiceResourceType[] | null }) => {
        setTypes(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [restaurantId])

  return { types, loading }
}
