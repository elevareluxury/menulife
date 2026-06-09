import { create } from 'zustand'

interface RestaurantState {
  businessType: 'gastronomy' | 'retail'
  plan: 'hub_free' | 'os_gastronomy' | 'os_full' | null
  setBusinessType: (type: 'gastronomy' | 'retail') => void
  setPlan: (plan: 'hub_free' | 'os_gastronomy' | 'os_full' | null) => void
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  businessType: 'gastronomy',
  plan: null,
  setBusinessType: (type) => set({ businessType: type }),
  setPlan: (plan) => set({ plan }),
}))
