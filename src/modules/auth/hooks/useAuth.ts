import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Absolute safety net — loading can never stay true beyond 8 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted) useAuthStore.setState({ loading: false, initialized: true })
    }, 8_000)

    // getSession() reads from localStorage — fast, no network round-trip.
    // Set loading:false IMMEDIATELY once we know the session state.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return
        clearTimeout(safetyTimeout)
        useAuthStore.setState({
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        })
        // Role check runs in background — doesn't block navigation
        if (session?.user) store.checkAuth()
      })
      .catch(() => {
        if (!mounted) return
        clearTimeout(safetyTimeout)
        useAuthStore.setState({ loading: false, initialized: true })
      })

    // Listen for auth changes — only update user/loading, never set loading:true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      clearTimeout(safetyTimeout)
      useAuthStore.setState({
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      })
      if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ role: null })
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Role check in background — only on actual sign-in, not INITIAL_SESSION
        store.checkAuth()
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user: store.user,
    role: store.role,
    loading: store.loading,
    initialized: store.initialized,
    isAuthenticated: !!store.user,
    isSuperAdmin: store.role === 'super_admin',
    isRestaurantOwner: store.role === 'restaurant_owner',
    signOut: store.signOut,
  }
}
