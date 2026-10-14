import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Verificación de cuenta (después de la etapa 15): si la identidad está verificada y el último pedido.
// Pedir: RPC request_verification (la base valida y pone los topes). Ver supabase/migrations/20261025000001_v1_verification.sql.

const db = supabase as unknown as SupabaseClient

export interface VerificationRequest {
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
}
export type VerificationResult = 'ok' | 'invalid' | 'pending' | 'verified' | 'limited' | 'error'

export function useVerification(userId: string | undefined) {
  const [verified, setVerified] = useState(false)
  const [last, setLast] = useState<VerificationRequest | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void Promise.all([
      db.from('identities').select('verified_at').eq('user_id', userId).maybeSingle(),
      db.from('verification_requests').select('status,admin_note,created_at').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(1),
    ]).then(([i, r]) => {
      if (cancelled) return
      // Sin la migración (o sin conexión) no se muestra nada raro: queda sin verificar
      setVerified(!i.error && !!(i.data as { verified_at: string | null } | null)?.verified_at)
      setLast(r.error ? null : ((r.data ?? [])[0] as VerificationRequest | undefined) ?? null)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [userId, version])

  const request = useCallback(async (message: string, link: string): Promise<VerificationResult> => {
    const { data, error } = await db.rpc('request_verification', { p_message: message.trim(), p_link: link.trim() || null })
    if (error) return 'error'
    setVersion(v => v + 1)
    return data as VerificationResult
  }, [])

  return { verified, last, loaded, request }
}
