import { isNativeApp } from '@/lib/platform'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { nativeAuthStorage } from '@/lib/nativeAuthStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Flujo PKCE en la web y en la app (sin tokens en la dirección): Google/Apple vuelven a /auth/callback con un `code`
// que AuthCallback canjea (sabe si era recuperar la contraseña), y los mails traen `token_hash` (verifyOtp, sirve en
// cualquier dispositivo). Por eso el cliente no lee la dirección al iniciar. En la app de iOS/Android el link de mycen.id
// abre la app y la sesión se respalda en las preferencias nativas (`nativeAuthStorage`).
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, ...(isNativeApp() ? { storage: nativeAuthStorage } : {}) },
})
