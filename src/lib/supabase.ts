import { isNativeApp } from '@/lib/platform'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// En la app de iOS/Android el acceso vuelve por un link de mycen.id que abre la app (no carga la página): flujo PKCE y
// el código se canjea en /auth/callback (AuthCallback), sin leer la dirección al iniciar.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey,
  isNativeApp() ? { auth: { flowType: 'pkce', detectSessionInUrl: false } } : undefined)
