import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { loadSupabase } from '@/lib/supabaseLazy'

export function useAuth() {
  const store = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    // Absolute safety net — loading can never stay true beyond 8 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted) useAuthStore.setState({ loading: false, initialized: true })
    }, 8_000)

    let unsubscribe: (() => void) | null = null
    // Sin sesión guardada ni vuelta de un link de acceso: es un visitante. Ya se sabe que no hay usuario y el cliente
    // de Supabase (~50 KB) se baja cuando la página terminó de dibujarse, sólo para escuchar si inicia sesión.
    const visitor = !hasStoredSession() && !/[#&?](access_token|code|error|type)=/.test(window.location.href)
    if (visitor) useAuthStore.setState({ user: null, loading: false, initialized: true })
    void whenIdle(visitor).then(loadSupabase).then(supabase => {
    if (!mounted) return
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

      // PASSWORD_RECOVERY fires when the email link is clicked. If Supabase's
      // redirect_to wasn't in the allowed-URLs list, it lands on '/' instead of
      // '/auth/callback'. Handle it here so the user always reaches /reset-password.
      if (event === 'PASSWORD_RECOVERY') {
        useAuthStore.setState({ user: session?.user ?? null, loading: false, initialized: true })
        const p = window.location.pathname
        if (p !== '/auth/callback' && p !== '/reset-password') {
          navigate('/reset-password', { replace: true })
        }
        return
      }

      // AuthCallback.tsx manages its own routing — update state but do NOT navigate
      if (window.location.pathname === '/auth/callback') {
        useAuthStore.setState({ user: session?.user ?? null, loading: false, initialized: true })
        return
      }
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
    unsubscribe = () => subscription.unsubscribe()
    }).catch(() => {
      if (!mounted) return
      clearTimeout(safetyTimeout)
      useAuthStore.setState({ loading: false, initialized: true })
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      unsubscribe?.()
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

/** supabase-js guarda la sesión en localStorage como sb-<ref>-auth-token */
function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true
    }
  } catch { /* sin almacenamiento: se trata como visitante */ }
  return false
}

function whenIdle(defer: boolean): Promise<void> {
  if (!defer) return Promise.resolve()
  return new Promise(resolve => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    const idle = () => {
      if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 3000 })
      else setTimeout(resolve, 1500)
    }
    // Después del evento load: en el perfil público, lo que pide index.html (página, estructura, imágenes) lo
    // demora, así que el cliente no le saca ancho de banda a la primera pantalla en un 4G lento
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
  })
}
