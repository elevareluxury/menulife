import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PortalSession } from '../portalTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const sessionKey = (restaurantId: string) => `portal_session_${restaurantId}`

function loadSession(restaurantId: string): PortalSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(restaurantId))
    if (!raw) return null
    const s = JSON.parse(raw) as PortalSession
    if (new Date(s.expires_at) < new Date()) {
      localStorage.removeItem(sessionKey(restaurantId))
      return null
    }
    return s
  } catch { return null }
}

export function usePortalAuth(restaurantId: string | undefined) {
  const [session, setSession]   = useState<PortalSession | null>(null)
  const [loading, setLoading]   = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (restaurantId) setSession(loadSession(restaurantId))
  }, [restaurantId])

  const requestMagicLink = useCallback(async (
    email: string
  ): Promise<{ success: boolean; devCode?: string; customerName?: string; error?: string }> => {
    if (!restaurantId) return { success: false, error: 'Sin restaurante' }
    setLoading(true)
    setAuthError(null)
    try {
      const { data, error } = await db.rpc('portal_request_magic_link', {
        p_email:         email.toLowerCase().trim(),
        p_restaurant_id: restaurantId,
      })
      if (error) throw error
      const res = data as { success: boolean; error?: string; dev_code?: string; customer_name?: string }
      if (!res.success) {
        const msg = res.error === 'email_not_found'
          ? 'No encontramos una cuenta con ese email.'
          : 'Error al enviar el código.'
        setAuthError(msg)
        return { success: false, error: msg }
      }
      return { success: true, devCode: res.dev_code, customerName: res.customer_name }
    } catch {
      const msg = 'Error de conexión. Intentá de nuevo.'
      setAuthError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const verifyCode = useCallback(async (
    email: string,
    code:  string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!restaurantId) return { success: false, error: 'Sin restaurante' }
    setLoading(true)
    setAuthError(null)
    try {
      const { data, error } = await db.rpc('portal_verify_code', {
        p_email:         email.toLowerCase().trim(),
        p_code:          code.trim(),
        p_restaurant_id: restaurantId,
      })
      if (error) throw error
      const res = data as {
        success: boolean; error?: string
        token?: string; customer_id?: string; customer_name?: string
      }
      if (!res.success || !res.token) {
        const msg = res.error === 'invalid_or_expired_code'
          ? 'Código incorrecto o expirado.'
          : 'Error al verificar.'
        setAuthError(msg)
        return { success: false, error: msg }
      }
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)
      const newSession: PortalSession = {
        token:          res.token,
        customer_id:    res.customer_id!,
        customer_name:  res.customer_name ?? 'Cliente',
        customer_email: email.toLowerCase().trim(),
        restaurant_id:  restaurantId,
        expires_at:     expiresAt.toISOString(),
      }
      localStorage.setItem(sessionKey(restaurantId), JSON.stringify(newSession))
      setSession(newSession)
      return { success: true }
    } catch {
      const msg = 'Error de conexión. Intentá de nuevo.'
      setAuthError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const logout = useCallback(() => {
    if (restaurantId) localStorage.removeItem(sessionKey(restaurantId))
    setSession(null)
    setAuthError(null)
  }, [restaurantId])

  const clearError = useCallback(() => setAuthError(null), [])

  return { session, loading, authError, requestMagicLink, verifyCode, logout, clearError }
}
