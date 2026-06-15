import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CustomerScore } from '../score/scoreConfig'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useCustomerScore(restaurantId: string | undefined, customerId: string | undefined) {
  const [score, setScore]   = useState<CustomerScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId || !customerId) { setLoading(false); return }
    setLoading(true)
    db
      .from('service_customer_scores')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .maybeSingle()
      .then(({ data }: { data: CustomerScore | null }) => {
        setScore(data ?? null)
        setLoading(false)
      })
  }, [restaurantId, customerId])

  return { score, loading }
}
