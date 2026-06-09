import { useRestaurantStore } from '@/store/restaurantStore'

type Feature =
  | 'menu' | 'orders' | 'tables' | 'waiters' | 'kitchen'
  | 'delivery' | 'reservations' | 'crm' | 'pos' | 'caja'
  | 'inventory' | 'catalog' | 'analytics_advanced'

const PLAN_FEATURES: Record<string, Feature[]> = {
  hub_free:      [],
  os_gastronomy: ['menu','orders','tables','waiters','kitchen','delivery','reservations','crm','pos','caja','analytics_advanced'],
  os_retail:     ['inventory','catalog','crm','pos','caja','analytics_advanced'],
  os_full:       ['menu','orders','tables','waiters','kitchen','delivery','reservations','crm','pos','caja','inventory','catalog','analytics_advanced'],
}

export const usePlanGuard = () => {
  const plan = useRestaurantStore(state => state.plan) ?? 'hub_free'

  const hasFeature = (feature: Feature): boolean =>
    PLAN_FEATURES[plan]?.includes(feature) ?? false

  const requireFeature = (feature: Feature): boolean => {
    if (!hasFeature(feature)) {
      window.dispatchEvent(new CustomEvent('show-upgrade-modal', { detail: { feature } }))
      return false
    }
    return true
  }

  return {
    hasFeature,
    requireFeature,
    plan,
    isHubFree: plan === 'hub_free',
    isOS: plan !== 'hub_free',
  }
}
