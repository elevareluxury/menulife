import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DocumentCategory } from '../documents/documentTypes'
import { DEFAULT_CATEGORY_SEEDS } from '../documents/documentTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useDocumentCategories(restaurantId: string | undefined) {
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading,    setLoading]    = useState(false)

  const fetch = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const { data, error } = await db
        .from('service_document_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')
      if (error) throw error
      setCategories(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  // Seeds default categories for a restaurant that has none yet.
  const seedDefaults = useCallback(async (): Promise<DocumentCategory[]> => {
    if (!restaurantId) return []
    const rows = DEFAULT_CATEGORY_SEEDS.map(s => ({ ...s, restaurant_id: restaurantId }))
    const { data, error } = await db
      .from('service_document_categories')
      .insert(rows)
      .select()
    if (error) throw error
    const seeded = data ?? []
    setCategories(seeded)
    return seeded
  }, [restaurantId])

  const fetchOrSeed = useCallback(async (): Promise<DocumentCategory[]> => {
    if (!restaurantId) return []
    setLoading(true)
    try {
      const { data } = await db
        .from('service_document_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')
      if (data && data.length > 0) {
        setCategories(data)
        return data
      }
      return await seedDefaults()
    } finally {
      setLoading(false)
    }
  }, [restaurantId, seedDefaults])

  return { categories, loading, fetch, fetchOrSeed, seedDefaults }
}
