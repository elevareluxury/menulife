import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const { user, role, loading, initialized, checkAuth, signOut } = useAuthStore()

  useEffect(() => {
    // Safety timeout — loading can never stay true beyond 10 s
    const timeout = setTimeout(() => {
      useAuthStore.setState({ loading: false, initialized: true })
    }, 10_000)

    // Kick off the initial auth check (reads from localStorage via getSession)
    checkAuth().then(() => clearTimeout(timeout))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeout)

      if (
        event === 'SIGNED_IN'      ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        // Set user IMMEDIATELY from the session that comes with the event.
        // This prevents route guards from seeing user=null after a login
        // while the async role-check is still in flight.
        useAuthStore.setState({
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        })
        // Role check runs in the background — doesn't block navigation
        if (session?.user) await checkAuth()
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, role: null, loading: false, initialized: true })
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
