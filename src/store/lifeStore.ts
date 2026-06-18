import { create } from 'zustand'

export interface AchievementToastData {
  type: string
  title: string
}

interface LifeState {
  hasRestaurant: boolean
  setHasRestaurant: (v: boolean) => void
  restaurantName: string | null
  setRestaurantName: (v: string | null) => void
  restaurantSlug: string | null
  setRestaurantSlug: (v: string | null) => void
  achievementToast: AchievementToastData | null
  showAchievement: (a: AchievementToastData) => void
  clearAchievement: () => void
}

export const useLifeStore = create<LifeState>((set) => ({
  hasRestaurant: false,
  setHasRestaurant: (v) => set({ hasRestaurant: v }),
  restaurantName: null,
  setRestaurantName: (v) => set({ restaurantName: v }),
  restaurantSlug: null,
  setRestaurantSlug: (v) => set({ restaurantSlug: v }),
  achievementToast: null,
  showAchievement: (a) => set({ achievementToast: a }),
  clearAchievement: () => set({ achievementToast: null }),
}))
