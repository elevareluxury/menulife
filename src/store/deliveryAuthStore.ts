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
  setAuth: (token: string, driver: DriverInfo) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useDeliveryAuthStore = create<DeliveryAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      driver: null,
      setAuth: (token, driver) => set({ token, driver }),
      logout: () => set({ token: null, driver: null }),
      isAuthenticated: () => !!get().token && !!get().driver,
    }),
    { name: 'delivery-auth' }
  )
)
