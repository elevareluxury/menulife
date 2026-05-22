import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const { user, role, loading, initialized, checkAuth, signOut } = useAuthStore()

  useEffect(() => {
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkAuth()
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, role: null, initialized: true, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [checkAuth])

  return {
    user,
    role,
    loading,
    initialized,
    isAuthenticated: !!user,
    isSuperAdmin: role === 'super_admin',
    isRestaurantOwner: role === 'restaurant_owner',
    signOut,
  }
}
