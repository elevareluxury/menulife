import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { loadPrefs } from '@/lib/prefs'

/** Carga idioma, moneda y zona horaria de la cuenta al iniciar sesión. */
export function PrefsInit() {
  const userId = useAuthStore(s => s.user?.id)
  useEffect(() => { if (userId) void loadPrefs(userId) }, [userId])
  return null
}
