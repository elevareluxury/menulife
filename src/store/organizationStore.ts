import { create } from 'zustand'
import type { Organization, LocationSummary } from '@/modules/enterprise/enterpriseTypes'

interface OrganizationState {
  organization:      Organization | null
  locations:         LocationSummary[]
  // null = "Todas las sucursales" (enterprise consolidated view)
  // string = restaurant_id of selected location
  currentLocationId: string | null

  setOrganization:    (org: Organization | null) => void
  setLocations:       (locs: LocationSummary[]) => void
  setCurrentLocation: (id: string | null) => void
  reset:              () => void
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organization:      null,
  locations:         [],
  currentLocationId: null,

  setOrganization:    (organization) => set({ organization }),
  setLocations:       (locations)    => set({ locations }),
  setCurrentLocation: (id)           => set({ currentLocationId: id }),
  reset: () => set({ organization: null, locations: [], currentLocationId: null }),
}))
