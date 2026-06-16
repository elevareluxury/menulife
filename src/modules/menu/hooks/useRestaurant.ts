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

    let active = true
    const timer = setTimeout(() => {
      if (active) setLoading(false)
    }, 10_000)

    async function fetchRestaurant() {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user!.id)
          .maybeSingle()

        if (!active) return
        clearTimeout(timer)
        if (error) throw error
        setRestaurant(data as Restaurant | null)
      } catch (error) {
        console.error('Error fetching restaurant:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchRestaurant()

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [user])

  return { restaurant, loading }
}
