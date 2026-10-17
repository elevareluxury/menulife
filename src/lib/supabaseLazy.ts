// El cliente de Supabase pesa ~50 KB (gzip). Lo que corre al abrir cualquier página (sesión, preferencias, errores,
// métricas, interruptores de la landing) lo pide con `loadSupabase()` en vez de importarlo: así no frena la primera
// pantalla y baja en paralelo. Las pantallas que lo usan de entrada (Studio, Life OS, Business) lo siguen importando.
import type { supabase as Client } from './supabase'

let client: Promise<typeof Client> | null = null

export function loadSupabase(): Promise<typeof Client> {
  return (client ??= import('./supabase').then(m => m.supabase))
}
