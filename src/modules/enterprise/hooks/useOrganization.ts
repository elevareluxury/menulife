import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useOrganizationStore } from '@/store/organizationStore'
import type { Organization, LocationSummary } from '../enterpriseTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export function useOrganization() {
  const { restaurant }   = useRestaurant()
  const store            = useOrganizationStore()
  const [loading, setLoading] = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  const load = useCallback(async () => {
    if (!restaurant?.id || loaded) return
    setLoading(true)
    try {
      // 1. Get organization_id for this restaurant
      const { data: rest } = await db
        .from('restaurants')
        .select('id, name, organization_id')
        .eq('id', restaurant.id)
        .single()

      if (!rest?.organization_id) {
        // Single-location business — no org
        setLoaded(true)
        return
      }

      // 2. Fetch organization
      const { data: org } = await db
        .from('organizations')
        .select('*')
        .eq('id', rest.organization_id)
        .single()

      if (!org) { setLoaded(true); return }
      store.setOrganization(org as Organization)

      // 3. Fetch all restaurants in org (as locations)
      const { data: rests } = await db
        .from('restaurants')
        .select('id, name, organization_id')
        .eq('organization_id', rest.organization_id)
        .order('name', { ascending: true })

      const locations: LocationSummary[] = (rests ?? []).map((r: { id: string; name: string }) => ({
        id:         r.id,
        name:       r.name,
        city:       null,   // populated via organization_locations join in future
        status:     'active' as const,
        sort_order: 0,
      }))

      // Enrich with organization_locations metadata if available
      const { data: locMeta } = await db
        .from('organization_locations')
        .select('restaurant_id, city, status, sort_order')
        .eq('organization_id', rest.organization_id)

      if (locMeta?.length) {
        const metaMap = new Map(
          (locMeta as { restaurant_id: string; city: string | null; status: string; sort_order: number }[])
            .map(m => [m.restaurant_id, m])
        )
        locations.forEach(loc => {
          const meta = metaMap.get(loc.id)
          if (meta) {
            loc.city       = meta.city
            loc.status     = meta.status as LocationSummary['status']
            loc.sort_order = meta.sort_order
          }
        })
        locations.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      }

      store.setLocations(locations)

      // Default: current restaurant is selected location
      if (!store.currentLocationId) {
        store.setCurrentLocation(restaurant.id)
      }

      setLoaded(true)
    } catch {
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, loaded])

  useEffect(() => { load() }, [load])

  const isMultiLocation = store.locations.length > 1
  const isAllLocations  = store.currentLocationId === null && isMultiLocation

  const currentLocation = store.locations.find(l => l.id === store.currentLocationId)
    ?? (store.locations.length === 1 ? store.locations[0] : null)

  return {
    organization:      store.organization,
    locations:         store.locations,
    currentLocationId: store.currentLocationId,
    currentLocation,
    isMultiLocation,
    isAllLocations,
    loading,
    setCurrentLocation: store.setCurrentLocation,
  }
}
