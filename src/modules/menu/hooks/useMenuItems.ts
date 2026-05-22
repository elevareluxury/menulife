import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem } from '@/types'

export function useMenuItems(sectionId: string | null) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!sectionId) return
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setItems((data as MenuItem[]) ?? [])
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    if (!sectionId) {
      setItems([])
      setLoading(false)
      return
    }

    fetchItems()

    const channel = supabase
      .channel(`menu_items:${sectionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items', filter: `section_id=eq.${sectionId}` },
        fetchItems
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [sectionId, fetchItems])

  return { items, loading, refetch: fetchItems }
}
