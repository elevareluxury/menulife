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
  setAuth: (token: string, waiter: WaiterInfo) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useWaiterAuthStore = create<WaiterAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      waiter: null,

      setAuth: (token, waiter) => set({ token, waiter }),

      logout: () => set({ token: null, waiter: null }),

      isAuthenticated: () => !!get().token && !!get().waiter,
    }),
    { name: 'waiter-auth' }
  )
)
