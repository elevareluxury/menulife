import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTerminologyStore } from '@/store/terminologyStore'
import type { TerminologyTerms } from '../terminology/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/**
 * Loads terminology from DB into the Zustand store.
 * Call once in the dashboard layout — loads on first mount only.
 */
export function useLoadTerminology(restaurantId: string | undefined) {
  const loaded        = useTerminologyStore(s => s.loaded)
  const setTerminology = useTerminologyStore(s => s.setTerminology)

  useEffect(() => {
    if (!restaurantId || loaded) return

    db
      .from('service_terminology')
      .select('preset, terms')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
      .then(({ data }: { data: { preset: string | null; terms: Partial<TerminologyTerms> } | null }) => {
        setTerminology(data?.terms ?? {}, data?.preset ?? null)
      })
      .catch(() => {
        // Non-fatal: terminology will fall back to defaults
        setTerminology({}, null)
      })
  }, [restaurantId, loaded, setTerminology])
}
