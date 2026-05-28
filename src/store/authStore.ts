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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),

  checkAuth: async () => {
    // Pure role resolver — never touches loading state.
    // useAuth hook owns loading; this only fills in the role after session is confirmed.
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      set({ role: superAdmin ? 'super_admin' : 'restaurant_owner' })
    } catch {
      // Silently fail — role defaults stay, not worth blocking anything
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },
}))
