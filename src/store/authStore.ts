import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

interface AuthState {
  user: User | null
  role: UserRole | null
  loading: boolean
  initialized: boolean

  setUser: (user: User | null) => void
  setRole: (role: UserRole | null) => void
  checkAuth: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),

  checkAuth: async () => {
    // Only show the full-screen spinner on the very first load
    if (!get().initialized) {
      set({ loading: true })
    }

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      set({ user: null, role: null, loading: false, initialized: true })
    }, 10_000)

    try {
      // getSession() reads from localStorage — fast, no network round-trip.
      // This unblocks route guards immediately instead of waiting for getUser().
      const { data: { session } } = await supabase.auth.getSession()
      if (timedOut) return

      if (!session?.user) {
        clearTimeout(timer)
        set({ user: null, role: null, loading: false, initialized: true })
        return
      }

      // Unblock UI right away — user is authenticated
      set({ user: session.user, loading: false, initialized: true })

      // Role check in background — doesn't delay rendering
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (timedOut) return
      clearTimeout(timer)

      set({ role: superAdmin ? 'super_admin' : 'restaurant_owner' })
    } catch {
      clearTimeout(timer)
      if (!timedOut) set({ user: null, role: null, loading: false, initialized: true })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },
}))
