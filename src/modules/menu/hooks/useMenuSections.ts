import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuSection } from '@/types'

export function useMenuSections(restaurantId: string | undefined) {
  const [sections, setSections] = useState<MenuSection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSections = useCallback(async () => {
    if (!restaurantId) return
    try {
      const { data, error } = await supabase
        .from('menu_sections')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setSections((data as MenuSection[]) ?? [])
    } catch (error) {
      console.error('Error fetching sections:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }

    fetchSections()

    const channel = supabase
      .channel(`menu_sections:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_sections', filter: `restaurant_id=eq.${restaurantId}` },
        fetchSections
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [restaurantId, fetchSections])

  return { sections, loading, refetch: fetchSections }
}
