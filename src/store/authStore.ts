import { create } from 'zustand'
import { loadSupabase } from '@/lib/supabaseLazy'
import { isNativeApp } from '@/lib/platform'
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
      const supabase = await loadSupabase()
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
    // Los avisos push de este dispositivo se dan de baja en signOutDevice (vale para todas las salidas)
    // En la app: los recordatorios programados en el teléfono eran de esta cuenta (auditoría N7)
    if (isNativeApp()) {
      await import('@/modules/life/lib/nativeReminders').then(m => m.cancelAllNativeReminders()).catch(() => undefined)
    }
    const { signOutDevice } = await import('@/lib/signOutDevice')
    const clean = await signOutDevice(await loadSupabase())
    set({ user: null, role: null })
    // Sin respuesta del servidor la sesión ya se borró del dispositivo: se recarga para soltar el cliente en memoria
    if (!clean) window.location.replace('/login')
  },
}))
