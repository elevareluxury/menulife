import { create } from 'zustand'

interface RestaurantState {
  businessType: 'gastronomy' | 'retail'
  setBusinessType: (type: 'gastronomy' | 'retail') => void
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  businessType: 'gastronomy',
  setBusinessType: (type) => set({ businessType: type }),
}))
