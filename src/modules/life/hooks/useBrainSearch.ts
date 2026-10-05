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
  const [result, setResult] = useState<{ items: BrainItem[]; key: string } | null>(null)
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [trigger, setTrigger] = useState(0)

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const typesKey = types?.join(',')
  const fetchKey = `${user?.id ?? ''}|${debouncedTerm}|${typesKey ?? ''}|${String(includeArchived)}|${trigger}`

  useEffect(() => {
    if (!user) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('life_brain_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!includeArchived) query = query.eq('is_archived', false)
    if (types && types.length > 0) query = query.in('type', types)

    if (debouncedTerm.length > 0) {
      // websearch_to_tsquery soporta operadores naturales: OR, -, "frases exactas"
      query = query.textSearch('search_vector', debouncedTerm, {
        type: 'websearch',
        config: 'spanish',
      })
    }

    const key = fetchKey
    let cancelled = false

    query.limit(200).then(async ({ data, error }: { data: BrainItem[] | null; error: unknown }) => {
      if (cancelled) return

      if (error && debouncedTerm.length > 0) {
        // Fallback a ILIKE si FTS falla (config no disponible, query inválida, etc.)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fallback: any = db
          .from('life_brain_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (!includeArchived) fallback = fallback.eq('is_archived', false)
        if (types && types.length > 0) fallback = fallback.in('type', types)
        fallback = fallback.or(`title.ilike.%${debouncedTerm}%,content.ilike.%${debouncedTerm}%`)

        const { data: fallbackData } = await fallback.limit(200)
        if (!cancelled) setResult({ items: (fallbackData ?? []) as BrainItem[], key })
      } else {
        setResult({ items: (error ? [] : (data ?? [])) as BrainItem[], key })
      }
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, debouncedTerm, typesKey, includeArchived, trigger])

  // Derive during render: loading when result is absent or stale
  const items = user ? (result?.items ?? []) : []
  const loading = !!user && (result === null || result.key !== fetchKey)

  const refetch = useCallback(() => setTrigger(n => n + 1), [])

  return { items, loading, term: debouncedTerm, refetch }
}
