import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Pure routing logic — no Supabase calls. Testable in isolation. */
export function routeFromRole(
  isSuperAdmin: boolean,
  restaurant: { plan: string } | null,
  hasProfile: boolean,
): string {
  if (isSuperAdmin) return '/super-admin'
  if (!restaurant) return hasProfile ? '/life' : '/studio'
  if (restaurant.plan === 'hub_free') return '/studio'
  return '/dashboard'
}

/** Queries Supabase and returns the correct post-login route for the given user. */
export async function postLoginRoute(userId: string): Promise<string> {
  const [{ data: superAdmin }, { data: restaurant }] = await Promise.all([
    supabase.from('super_admins').select('id').eq('user_id', userId).maybeSingle(),
    supabase.from('restaurants').select('plan').eq('owner_id', userId).maybeSingle(),
  ])
  let hasProfile = false
  if (!restaurant) {
    // profiles is not yet in database.types.ts — cast to bypass type check
    const { data: profile } = await (supabase as unknown as SupabaseClient)
      .from('profiles').select('id').eq('user_id', userId).limit(1).maybeSingle()
    hasProfile = !!profile
  }
  return routeFromRole(!!superAdmin, restaurant, hasProfile)
}
