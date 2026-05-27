import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItem } from '@/types'

const cacheKey = (sectionId: string) => `ml_menu_items_${sectionId}`

function readCache(sectionId: string): MenuItem[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(sectionId))
    return raw ? (JSON.parse(raw) as MenuItem[]) : null
  } catch {
    return null
  }
}

function writeCache(sectionId: string, data: MenuItem[]) {
  try {
    localStorage.setItem(cacheKey(sectionId), JSON.stringify(data))
  } catch {
    // storage quota exceeded — ignore
  }
}

export function useMenuItems(sectionId: string | null) {
  const [items, setItems] = useState<MenuItem[]>(() =>
    sectionId ? (readCache(sectionId) ?? []) : []
  )
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
      const result = (data as MenuItem[]) ?? []
      setItems(result)
      writeCache(sectionId, result)
    } catch (error) {
      console.error('Error fetching items:', error)
      const cached = readCache(sectionId)
      if (cached) setItems(cached)
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

    // Seed from cache immediately so the UI isn't blank while fetching
    const cached = readCache(sectionId)
    if (cached) {
      setItems(cached)
      setLoading(false)
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
