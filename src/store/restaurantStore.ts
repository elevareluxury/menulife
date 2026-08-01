import { create } from 'zustand'
import type { Restaurant, RestaurantPlan, BusinessType } from '@/types/restaurant'

interface RestaurantState {
  // Objeto completo de la BD
  restaurant: Restaurant | null

  // Shortcuts derivados — SIEMPRE sincronizados con restaurant
  restaurantId: string | null
  businessType: BusinessType | null
  plan: RestaurantPlan | null

  // Estado de inicialización
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Acciones
  setRestaurant: (restaurant: Restaurant | null) => void
  updateRestaurant: (updates: Partial<Restaurant>) => void
  clearRestaurant: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurant: null,
  restaurantId: null,
  businessType: null,
  plan: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setRestaurant: (restaurant) =>
    set({
      restaurant,
      restaurantId: restaurant?.id ?? null,
      businessType: (restaurant?.business_type as BusinessType) ?? null,
      plan: (restaurant?.plan as RestaurantPlan) ?? null,
      isInitialized: true,
      isLoading: false,
      error: null,
    }),

  updateRestaurant: (updates) =>
    set((state) => {
      if (!state.restaurant) return state
      const updated = { ...state.restaurant, ...updates }
      return {
        restaurant: updated,
        restaurantId: updated.id,
        businessType: updated.business_type as BusinessType,
        plan: updated.plan as RestaurantPlan,
      }
    }),

  clearRestaurant: () =>
    set({
      restaurant: null,
      restaurantId: null,
      businessType: null,
      plan: null,
      isInitialized: false,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}))

// Selector helpers para evitar re-renders innecesarios
export const selectRestaurant = (s: RestaurantState) => s.restaurant
export const selectRestaurantId = (s: RestaurantState) => s.restaurantId
export const selectBusinessType = (s: RestaurantState) => s.businessType
export const selectPlan = (s: RestaurantState) => s.plan
export const selectIsInitialized = (s: RestaurantState) => s.isInitialized
