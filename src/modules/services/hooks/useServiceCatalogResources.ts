import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface CatalogResourceEntry {
  resource_type_id: string
  quantity: number
  is_required: boolean
}

export interface CatalogResourceEntryFull extends CatalogResourceEntry {
  id: string
  catalog_id: string
  resource_type?: { id: string; name: string; icon: string; color: string } | null
}

export function useServiceCatalogResources(restaurantId: string | undefined) {
  const fetchByCatalog = useCallback(async (catalogId: string): Promise<CatalogResourceEntryFull[]> => {
    if (!restaurantId) return []
    const { data } = await db
      .from('service_catalog_resources')
      .select('*, resource_type:service_resource_types(id, name, icon, color)')
      .eq('catalog_id', catalogId)
      .eq('restaurant_id', restaurantId)
    return data ?? []
  }, [restaurantId])

  const setForCatalog = useCallback(async (
    catalogId: string,
    entries: CatalogResourceEntry[],
  ): Promise<boolean> => {
    if (!restaurantId) return false
    try {
      await db.from('service_catalog_resources').delete().eq('catalog_id', catalogId)
      if (entries.length > 0) {
        const { error } = await db.from('service_catalog_resources').insert(
          entries.map(e => ({
            catalog_id:       catalogId,
            resource_type_id: e.resource_type_id,
            restaurant_id:    restaurantId,
            quantity:         e.quantity,
            is_required:      e.is_required,
          }))
        )
        if (error) throw error
      }
      return true
    } catch { return false }
  }, [restaurantId])

  return { fetchByCatalog, setForCatalog }
}
