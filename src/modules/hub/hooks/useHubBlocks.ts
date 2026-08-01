import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel'
import type { HubBlock } from '../lib/blocksConfig'
import { BLOCK_DEFINITIONS } from '../lib/blocksConfig'

interface UseHubBlocksOptions {
  restaurantId: string | null | undefined
  activeOnly?: boolean
  ensureAllTypes?: boolean
}

export function useHubBlocks({
  restaurantId,
  activeOnly = false,
  ensureAllTypes = false,
}: UseHubBlocksOptions) {
  const [blocks, setBlocks] = useState<HubBlock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBlocks = useCallback(async () => {
    if (!restaurantId) {
      setBlocks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let query = (supabase as any)
      .from('hub_blocks')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setError(queryError.message)
      setIsLoading(false)
      return
    }

    let result: HubBlock[] = data || []

    if (ensureAllTypes && !activeOnly) {
      const existingTypes = new Set(result.map(b => b.block_type))
      const missing = Object.values(BLOCK_DEFINITIONS).filter(
        def => !existingTypes.has(def.type),
      )

      if (missing.length > 0) {
        const toInsert = missing.map(def => ({
          restaurant_id: restaurantId,
          block_type: def.type,
          sort_order: def.defaultOrder,
          is_active: def.alwaysActive || def.dataSource === 'table',
          config: {},
        }))

        const { data: inserted } = await (supabase as any)
          .from('hub_blocks')
          .insert(toInsert)
          .select()

        if (inserted) {
          result = [...result, ...inserted].sort(
            (a, b) => a.sort_order - b.sort_order,
          )
        }
      }
    }

    setBlocks(result)
    setError(null)
    setIsLoading(false)
  }, [restaurantId, activeOnly, ensureAllTypes])

  useEffect(() => {
    fetchBlocks()
  }, [fetchBlocks])

  // Realtime solo en Hub público (activeOnly = true). El editor recarga manualmente.
  useRealtimeChannel({
    channelName: `hub_blocks_${restaurantId ?? 'none'}`,
    enabled: !!restaurantId && activeOnly,
    changes: [{
      event: '*',
      table: 'hub_blocks',
      filter: `restaurant_id=eq.${restaurantId}`,
    }],
    onEvent: () => {
      fetchBlocks()
    },
  })

  const updateBlock = useCallback(async (
    blockId: string,
    updates: Partial<Pick<HubBlock, 'is_active' | 'sort_order' | 'config'>>,
  ) => {
    const { error: err } = await (supabase as any)
      .from('hub_blocks')
      .update(updates)
      .eq('id', blockId)
    if (err) throw err
    await fetchBlocks()
  }, [fetchBlocks])

  const reorderBlocks = useCallback(async (orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((id, idx) =>
        (supabase as any)
          .from('hub_blocks')
          .update({ sort_order: (idx + 1) * 10 })
          .eq('id', id),
      ),
    )
    await fetchBlocks()
  }, [fetchBlocks])

  return {
    blocks,
    isLoading,
    error,
    updateBlock,
    reorderBlocks,
    refetch: fetchBlocks,
  }
}

export type UseHubBlocksReturn = ReturnType<typeof useHubBlocks>
