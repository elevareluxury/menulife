import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DriverInfo {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
  phone: string | null
}

interface DeliveryAuthState {
  token: string | null
  driver: DriverInfo | null
  restaurantSlug: string | null
  setAuth: (token: string, driver: DriverInfo, slug: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useDeliveryAuthStore = create<DeliveryAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      driver: null,
      restaurantSlug: null,
      setAuth: (token, driver, slug) => set({ token, driver, restaurantSlug: slug }),
      logout: () => set({ token: null, driver: null, restaurantSlug: null }),
      isAuthenticated: () => !!get().token && !!get().driver,
    }),
    { name: 'delivery-auth' }
  )
)
