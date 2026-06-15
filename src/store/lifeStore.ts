import { create } from 'zustand'

interface LifeState {
  hasRestaurant: boolean
  setHasRestaurant: (v: boolean) => void
}

export const useLifeStore = create<LifeState>((set) => ({
  hasRestaurant: false,
  setHasRestaurant: (v) => set({ hasRestaurant: v }),
}))
