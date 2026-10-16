import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Verificación de cuenta (después de la etapa 15): pedidos que llegan de Studio → Ajustes. Aprobar pone el tilde en
// todos los Spaces de la persona; "Quitar" lo saca. Todo por RPC que exigen ser super-admin.

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args)

interface VerificationItem {
  id: string
  message: string
  link: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
  user_id: string
  email: string | null
  verified: boolean
  profile: { username: string | null; display_name: string; status: string } | null
}

const STATUS: Record<VerificationItem['status'], string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }
const TEXT = '#F5F7FA'
const MUTED = '#98A2B3'
const CARD: React.CSSProperties = {
  background: '#0A0D12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', marginBottom: 14,
}
const BTN: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
  color: TEXT, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 40,
}
const OK: React.CSSProperties = { ...BTN, background: '#22C55E', border: 'none', color: '#05130A' }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}
const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
const safeLink = (url: string | null) => (url && /^https:\/\//i.test(url) ? url : null)

export function VerificationsTab() {
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')
  const [reload, setReload] = useState(0)
  const key = `${filter}#${reload}`
  const [result, setResult] = useState<{ key: string; items: VerificationItem[]; failed: boolean } | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    rpc('admin_list_verifications', { p_status: filter }).then(r => {
      if (!cancelled) setResult({ key, items: r.error ? [] : ((r.data as VerificationItem[] | null) ?? []), failed: !!r.error })
    })
    return () => { cancelled = true }
  }, [filter, key])

  async function act(id: string, fn: string, args: Record<string, unknown>) {
    setBusy(id); setActionError(null)
    const { error } = await rpc(fn, args)
    setBusy(null)
    if (error) { setActionError('No se pudo guardar. Probá de nuevo.'); return }
    setReload(n => n + 1)
  }

  const loading = !result || result.key !== key

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>Verificaciones</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: MUTED }}>
        Pedidos de verificación de cuenta. Aprobar muestra el tilde en todos los perfiles de la persona.
      </p>
      <div role="radiogroup" aria-label="Filtro" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['pending', 'resolved'] as const).map(f => (
          <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
            style={{ ...BTN, ...(filter === f ? { background: TEXT, color: '#0A0D12' } : {}) }}>
            {f === 'pending' ? 'Pendientes' : 'Revisados'}
          </button>
        ))}
      </div>
      {actionError && <p role="alert" style={{ color: '#FCA5A5' }}>{actionError}</p>}
      {loading ? <p role="status" style={{ color: MUTED }}>Cargando…</p>
        : result.failed ? <p role="alert" style={{ color: '#FCA5A5' }}>No se pudieron cargar. Revisá que la migración de verificación esté aplicada.</p>
          : result.items.length === 0 ? <p style={{ color: MUTED }}>{filter === 'pending' ? 'No hay pedidos pendientes.' : 'Todavía no hay pedidos revisados.'}</p>
            : result.items.map(item => {
              const link = safeLink(item.link)
              const handle = item.profile?.username
              return (
                <article key={item.id} style={CARD} aria-label={`Pedido de ${item.profile?.display_name ?? item.email ?? ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, color: TEXT, fontWeight: 700 }}>
                        {item.profile?.display_name ?? '—'} {item.verified && <span style={{ color: '#22C55E' }}>· verificada</span>}
                      </p>
                      <p style={{ margin: '2px 0 0', color: MUTED, fontSize: 13 }}>
                        {handle ? <a href={`/${handle}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>/{handle}</a> : 'Sin perfil'}
                        {item.email && <> · {item.email}</>} · {fmt(item.created_at)}
                      </p>
                    </div>
                    <span style={{ color: MUTED, fontSize: 13 }}>{STATUS[item.status]}</span>
                  </div>
                  <p style={{ margin: '12px 0 0', color: TEXT, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message}</p>
                  {link && <p style={{ margin: '8px 0 0' }}><a href={link} target="_blank" rel="noopener noreferrer nofollow" style={{ color: '#93C5FD', overflowWrap: 'anywhere' }}>{link}</a></p>}
                  {item.admin_note && <p style={{ margin: '8px 0 0', color: MUTED }}>Nota: {item.admin_note}</p>}
                  {item.status === 'pending' ? (
                    <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                      <input style={INPUT} placeholder="Nota para la persona (opcional, se ve en su Studio)" maxLength={300}
                        aria-label="Nota para la persona" value={notes[item.id] ?? ''}
                        onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" style={OK} disabled={busy === item.id}
                          onClick={() => { void act(item.id, 'admin_resolve_verification', { p_id: item.id, p_approve: true, p_note: notes[item.id] ?? null }) }}>
                          Aprobar
                        </button>
                        <button type="button" style={BTN} disabled={busy === item.id}
                          onClick={() => { void act(item.id, 'admin_resolve_verification', { p_id: item.id, p_approve: false, p_note: notes[item.id] ?? null }) }}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ) : item.verified && (
                    <button type="button" style={{ ...BTN, marginTop: 12 }} disabled={busy === item.id}
                      onClick={() => { void act(item.id, 'admin_set_verified', { p_user_id: item.user_id, p_verified: false }) }}>
                      Quitar la verificación
                    </button>
                  )}
                </article>
              )
            })}
    </div>
  )
}
