import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// RPC del panel (todas exigen super-admin en la base) y estilos compartidos de las pantallas de Mycen.

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
export const adminRpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args)

export const TEXT = '#F5F7FA'
export const MUTED = '#98A2B3'
export const OK_COLOR = '#22C55E'
export const WARN_COLOR = '#FCA5A5'
export const CARD: React.CSSProperties = {
  background: '#0A0D12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', marginBottom: 14,
}
export const BTN: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
  color: TEXT, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 44,
}
export const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', minHeight: 44,
}

export interface PendingCounts { reports: number; verifications: number; errors: number }

// Se pide al abrir el panel y al cambiar de pantalla (así baja el número al resolver algo)
export function usePendingCounts(refreshKey: string): PendingCounts | null {
  const [counts, setCounts] = useState<PendingCounts | null>(null)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve(adminRpc('admin_pending_counts')).then(({ data, error }) => {
      if (!cancelled && !error && data) setCounts(data as PendingCounts)
    })
    return () => { cancelled = true }
  }, [refreshKey])
  return counts
}
