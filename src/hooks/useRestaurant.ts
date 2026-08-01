/**
 * useRestaurant — Lee el restaurant desde el store global.
 *
 * NO hace queries a Supabase. El objeto restaurant se hidrata
 * una sola vez en el layout del dashboard (app/routes/dashboard.tsx).
 *
 * Si necesitás forzar un refetch (ej: después de guardar cambios),
 * usá updateRestaurant() del store directamente.
 */
import { useRestaurantStore } from '@/store/restaurantStore'
import type { Restaurant } from '@/types/restaurant'

interface UseRestaurantReturn {
  restaurant: Restaurant | null
  restaurantId: string | null
  businessType: string | null
  plan: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  // Alias para compatibilidad con código existente
  loading: boolean
  data: Restaurant | null
}

export function useRestaurant(): UseRestaurantReturn {
  const {
    restaurant,
    restaurantId,
    businessType,
    plan,
    isLoading,
    isInitialized,
    error,
  } = useRestaurantStore()

  return {
    restaurant,
    restaurantId,
    businessType,
    plan,
    isLoading,
    isInitialized,
    error,
    loading: isLoading,
    data: restaurant,
  }
}
