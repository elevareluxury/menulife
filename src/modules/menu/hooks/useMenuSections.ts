import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuSection } from '@/types'

const cacheKey = (restaurantId: string) => `ml_menu_sections_${restaurantId}`

function readCache(restaurantId: string): MenuSection[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(restaurantId))
    return raw ? (JSON.parse(raw) as MenuSection[]) : null
  } catch {
    return null
  }
}

function writeCache(restaurantId: string, data: MenuSection[]) {
  try {
    localStorage.setItem(cacheKey(restaurantId), JSON.stringify(data))
  } catch {
    // storage quota exceeded — ignore
  }
}

export function useMenuSections(restaurantId: string | undefined) {
  const [sections, setSections] = useState<MenuSection[]>(() =>
    restaurantId ? (readCache(restaurantId) ?? []) : []
  )
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
      const result = (data as MenuSection[]) ?? []
      setSections(result)
      writeCache(restaurantId, result)
    } catch (error) {
      console.error('Error fetching sections:', error)
      const cached = readCache(restaurantId)
      if (cached) setSections(cached)
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false)
      return
    }

    const cached = readCache(restaurantId)
    if (cached) {
      setSections(cached)
      setLoading(false)
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
