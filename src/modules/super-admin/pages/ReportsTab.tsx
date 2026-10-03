import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Moderación (Identity Fase 8): denuncias de perfiles y proyectos. Todo pasa por RPC que exigen
// ser super-admin (super_admins); la tabla de denuncias no se lee directo.

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args)

interface Report {
  id: string
  reason: string
  details: string | null
  status: 'open' | 'dismissed' | 'actioned'
  created_at: string
  resolution_note: string | null
  resolved_at: string | null
  project: { slug: string; title: string } | null
  profile: {
    id: string; username: string; display_name: string; status: string
    suspended_at: string | null; suspension_reason: string | null; open_reports: number
  }
}

interface Suspended { id: string; username: string; display_name: string; suspended_at: string; suspension_reason: string | null }

const REASONS: Record<string, string> = {
  spam: 'Spam o publicidad engañosa', scam: 'Estafa o fraude', impersonation: 'Suplantación de identidad',
  hate: 'Odio o acoso', violence: 'Violencia o amenazas', sexual: 'Contenido sexual', illegal: 'Algo ilegal', other: 'Otro motivo',
}
const STATUS: Record<Report['status'], string> = { open: 'Abierta', dismissed: 'Descartada', actioned: 'Perfil suspendido' }

const TEXT = '#F5F7FA'
const MUTED = '#98A2B3'
const ACCENT = '#FF6B7A'
const CARD: React.CSSProperties = {
  background: '#0A0D12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px', marginBottom: 14,
}
const BTN: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
  color: TEXT, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 40,
}
const DANGER: React.CSSProperties = { ...BTN, background: ACCENT, border: 'none', color: '#fff' }
const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

export function ReportsTab() {
  const [filter, setFilter] = useState<'open' | 'resolved'>('open')
  const [reload, setReload] = useState(0)
  const key = `${filter}#${reload}`
  const [result, setResult] = useState<{ key: string; reports: Report[]; suspended: Suspended[]; failed: boolean } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([rpc('admin_list_reports', { p_status: filter }), rpc('admin_list_suspended')]).then(([r, s]) => {
      if (cancelled) return
      const failed = !!(r.error || s.error)
      setResult({ key, failed, reports: failed ? [] : r.data as Report[], suspended: failed ? [] : s.data as Suspended[] })
    })
    return () => { cancelled = true }
  }, [filter, key])

  const current = result?.key === key ? result : null
  const reports = current ? current.reports : null
  const suspended = current?.suspended ?? []
  const error = current?.failed ? 'No pudimos cargar las denuncias. ¿La migración de la Fase 8 está aplicada?' : actionError

  const act = useCallback(async (id: string, fn: string, args: Record<string, unknown>) => {
    setBusy(id); setActionError(null)
    const { error: e } = await rpc(fn, args)
    setBusy(null)
    if (e) { setActionError('No se pudo completar la acción. Probá de nuevo.'); return }
    setReload(n => n + 1)
  }, [])

  return (
    <div style={{ color: TEXT, maxWidth: 860 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Denuncias</h1>
      <p style={{ color: MUTED, margin: '0 0 18px', fontSize: 14 }}>
        Perfiles y proyectos denunciados por visitantes. Suspender un perfil lo oculta por completo (página, proyectos, vCard)
        y cierra todas sus denuncias abiertas. El dueño ve el motivo en Studio.
      </p>

      <div role="group" aria-label="Filtro" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['open', 'resolved'] as const).map(f => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            style={{ ...BTN, ...(filter === f ? { background: `${ACCENT}22`, color: ACCENT, borderColor: `${ACCENT}55` } : {}) }}>
            {f === 'open' ? 'Abiertas' : 'Resueltas'}
          </button>
        ))}
      </div>

      {error && <p role="alert" style={{ color: ACCENT }}>{error}</p>}
      {reports === null && <p style={{ color: MUTED }}>Cargando…</p>}
      {reports?.length === 0 && !error && (
        <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{filter === 'open' ? 'No hay denuncias abiertas.' : 'Todavía no hay denuncias resueltas.'}</p></div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Denuncias">
        {reports?.map(r => (
          <li key={r.id} style={CARD} aria-label={`Denuncia a ${r.profile.display_name}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{r.profile.display_name}</strong>{' '}
                <a href={`/${r.profile.username}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>@{r.profile.username}</a>
                {r.project && (
                  <> · <a href={`/${r.profile.username}/projects/${r.project.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>
                    Proyecto: {r.project.title}</a></>
                )}
                {r.profile.suspended_at && <span style={{ marginInlineStart: 8, color: ACCENT, fontSize: 12, fontWeight: 700 }}>SUSPENDIDO</span>}
              </div>
              <span style={{ color: MUTED, fontSize: 13 }}>{fmt(r.created_at)}</span>
            </div>
            <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>{REASONS[r.reason] ?? r.reason}</p>
            {r.details && <p style={{ margin: '0 0 6px', color: '#D0D5DD', whiteSpace: 'pre-line' }}>{r.details}</p>}
            <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
              {r.status === 'open'
                ? `${r.profile.open_reports} ${r.profile.open_reports === 1 ? 'denuncia abierta' : 'denuncias abiertas'} sobre este perfil`
                : `${STATUS[r.status]}${r.resolved_at ? ` · ${fmt(r.resolved_at)}` : ''}${r.resolution_note ? ` · ${r.resolution_note}` : ''}`}
            </p>

            {r.status === 'open' && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 13, color: MUTED }}>
                  Nota (el motivo de la suspensión lo ve el dueño)
                  <input style={{ ...INPUT, marginTop: 6 }} value={notes[r.id] ?? ''} maxLength={300}
                    onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={BTN} disabled={busy !== null}
                    onClick={() => act(r.id, 'admin_resolve_report', { p_report_id: r.id, p_action: 'dismiss', p_note: notes[r.id] ?? null })}>
                    Descartar
                  </button>
                  <button type="button" style={DANGER} disabled={busy !== null}
                    onClick={() => act(r.id, 'admin_resolve_report', { p_report_id: r.id, p_action: 'suspend', p_note: notes[r.id] || REASONS[r.reason] })}>
                    Suspender perfil
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2 style={{ fontSize: 18, margin: '28px 0 10px' }}>Perfiles suspendidos</h2>
      {suspended.length === 0
        ? <div style={CARD}><p style={{ margin: 0, color: MUTED }}>No hay perfiles suspendidos.</p></div>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Perfiles suspendidos">
            {suspended.map(p => (
              <li key={p.id} style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{p.display_name}</strong> <span style={{ color: MUTED }}>@{p.username}</span>
                  <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13 }}>
                    Desde {fmt(p.suspended_at)}{p.suspension_reason ? ` · ${p.suspension_reason}` : ''}
                  </p>
                </div>
                <button type="button" style={BTN} disabled={busy !== null}
                  onClick={() => act(p.id, 'admin_set_suspension', { p_profile_id: p.id, p_suspended: false })}>
                  Levantar suspensión
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
