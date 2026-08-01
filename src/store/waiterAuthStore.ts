import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WaiterInfo {
  id: string
  restaurant_id: string
  first_name: string
  last_name: string
}

interface WaiterAuthState {
  token: string | null
  waiter: WaiterInfo | null
  restaurantSlug: string | null
  setAuth: (token: string, waiter: WaiterInfo, slug: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useWaiterAuthStore = create<WaiterAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      waiter: null,
      restaurantSlug: null,

      setAuth: (token, waiter, slug) => set({ token, waiter, restaurantSlug: slug }),

      logout: () => set({ token: null, waiter: null, restaurantSlug: null }),

      isAuthenticated: () => !!get().token && !!get().waiter,
    }),
    { name: 'waiter-auth' }
  )
)
