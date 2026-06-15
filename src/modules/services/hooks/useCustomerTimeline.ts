import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { TimelineCategory } from '../timeline/timelineEvents'
import { categoryEventTypes } from '../timeline/timelineEvents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const PAGE_SIZE = 20

export interface TimelineEvent {
  id:          string
  customer_id: string
  event_type:  string
  title:       string
  description: string | null
  booking_id:  string | null
  actor_type:  'system' | 'owner' | 'client'
  metadata:    Record<string, unknown>
  event_date:  string
  created_at:  string
}

export function useCustomerTimeline(restaurantId: string | undefined) {
  const [events,      setEvents]      = useState<TimelineEvent[]>([])
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)

  // Cursor = event_date ISO string del último evento cargado.
  // Almacenado en ref para que fetchMore sea estable (no se recrea en cada render).
  const cursorRef      = useRef<string | null>(null)
  const loadingMoreRef = useRef(false)

  function buildQuery(customerId: string, category?: TimelineCategory) {
    let q = db
      .from('service_customer_timeline')
      .select('*')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurantId)   // tenant isolation explícita + usa idx_sct_customer_date
      .order('event_date', { ascending: false })
      .order('id',         { ascending: false })

    if (category && category !== 'all') {
      const types = categoryEventTypes(category)
      if (types.length) q = q.in('event_type', types)
    }
    return q
  }

  const fetchFirst = useCallback(async (
    customerId: string,
    category?: TimelineCategory,
  ) => {
    if (!restaurantId) return
    setLoading(true)
    cursorRef.current = null
    try {
      const { data, error } = await buildQuery(customerId, category)
        .limit(PAGE_SIZE + 1)
      if (error) throw error

      const items: TimelineEvent[] = data ?? []
      const hasMoreItems = items.length > PAGE_SIZE
      const page = hasMoreItems ? items.slice(0, PAGE_SIZE) : items
      setEvents(page)
      setHasMore(hasMoreItems)
      cursorRef.current = hasMoreItems ? page[page.length - 1].event_date : null
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const fetchMore = useCallback(async (
    customerId: string,
    category?: TimelineCategory,
  ) => {
    if (!restaurantId || !cursorRef.current || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const { data, error } = await buildQuery(customerId, category)
        .lt('event_date', cursorRef.current)
        .limit(PAGE_SIZE + 1)
      if (error) throw error

      const items: TimelineEvent[] = data ?? []
      const hasMoreItems = items.length > PAGE_SIZE
      const page = hasMoreItems ? items.slice(0, PAGE_SIZE) : items
      setEvents(prev => [...prev, ...page])
      setHasMore(hasMoreItems)
      cursorRef.current = hasMoreItems ? page[page.length - 1].event_date : null
    } finally {
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  return {
    events,
    loading,
    loadingMore,
    hasMore,
    fetchFirst,
    fetchMore,
  }
}
