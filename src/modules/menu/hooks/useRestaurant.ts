import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Restaurant } from '@/types'

export function useRestaurant() {
  const { user } = useAuthStore()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    async function fetchRestaurant() {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user!.id)
          .single()

        if (error) throw error
        setRestaurant(data as Restaurant)
      } catch (error) {
        console.error('Error fetching restaurant:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [user])

  return { restaurant, loading }
}
