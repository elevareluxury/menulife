import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { BrainItem } from './useBrain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface UseBrainSearchOptions {
  types?: string[]
  includeArchived?: boolean
}

export function useBrainSearch(
  searchTerm: string,
  options: UseBrainSearchOptions = {}
) {
  const { types, includeArchived = false } = options
  const { user } = useAuthStore()
  const [items, setItems] = useState<BrainItem[]>([])
  const [loading, setLoading] = useState(true)
  const [debouncedTerm, setDebouncedTerm] = useState('')

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('life_brain_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    if (types && types.length > 0) {
      query = query.in('type', types)
    }

    if (debouncedTerm.length > 0) {
      // websearch_to_tsquery soporta operadores naturales: OR, -, "frases exactas"
      query = query.textSearch('search_vector', debouncedTerm, {
        type: 'websearch',
        config: 'spanish',
      })
    }

    const { data, error } = await query.limit(200)

    if (error) {
      // Fallback a ILIKE si FTS falla (config no disponible, query inválida, etc.)
      if (debouncedTerm.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallback: any = db
          .from('life_brain_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!includeArchived) fallback = fallback.eq('is_archived', false)
        if (types && types.length > 0) fallback = fallback.in('type', types)

        fallback = fallback.or(
          `title.ilike.%${debouncedTerm}%,content.ilike.%${debouncedTerm}%`
        )

        const { data: fallbackData } = await fallback.limit(200)
        setItems((fallbackData ?? []) as BrainItem[])
      } else {
        setItems([])
      }
    } else {
      setItems((data ?? []) as BrainItem[])
    }

    setLoading(false)
  }, [user, debouncedTerm, types?.join(','), includeArchived]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return { items, loading, term: debouncedTerm, refetch: fetchItems }
}
