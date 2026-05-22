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
    try {
      set({ loading: true })

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        set({ user: null, role: null, loading: false, initialized: true })
        return
      }

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      const role: UserRole = superAdmin ? 'super_admin' : 'restaurant_owner'

      set({ user, role, loading: false, initialized: true })
    } catch {
      set({ user: null, role: null, loading: false, initialized: true })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, role: null })
  },
}))
