import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Registro de errores propio (Lanzamiento L5): lo que falla en los navegadores, agrupado por huella.
// Todo pasa por RPC que exigen ser super-admin; las tablas no se leen directo.

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args)

type Status = 'open' | 'resolved' | 'ignored'
interface AppError {
  id: string; area: string; message: string; stack: string | null; path: string | null; release: string | null
  browser: string | null; count: number; first_seen: string; last_seen: string; status: Status; note: string | null
  resolved_at: string | null; reopened: boolean; affected: number; affected_today: number
}
interface Summary { open: number; new_today: number; affected_today: number }

const AREAS: Record<string, string> = {
  landing: 'Landing', auth: 'Acceso', profile: 'Página pública', studio: 'Studio', life: 'Life OS',
  business: 'Business', admin: 'Super-admin', other: 'Otro',
}
const FILTERS: Array<{ key: Status | 'all'; label: string }> = [
  { key: 'open', label: 'Abiertos' }, { key: 'resolved', label: 'Resueltos' }, { key: 'ignored', label: 'Ignorados' }, { key: 'all', label: 'Todos' },
]

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
const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)', color: TEXT, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
}
const TAG: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: TEXT }

const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

export function ErrorsTab() {
  const [filter, setFilter] = useState<Status | 'all'>('open')
  const [area, setArea] = useState<string>('')
  const [reload, setReload] = useState(0)
  const key = `${filter}#${reload}`
  const [result, setResult] = useState<{ key: string; errors: AppError[]; summary: Summary | null; failed: boolean } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all([rpc('admin_list_errors', { p_status: filter }), rpc('admin_error_summary')]).then(([r, s]) => {
      if (cancelled) return
      setResult({ key, failed: !!r.error, errors: r.error ? [] : r.data as AppError[], summary: s.error ? null : s.data as Summary })
    })
    return () => { cancelled = true }
  }, [filter, key])

  const current = result?.key === key ? result : null
  const errors = current ? current.errors.filter(e => !area || e.area === area) : null
  const error = current?.failed ? 'No pudimos cargar los errores. ¿La migración de L5 está aplicada?' : actionError

  const setStatus = useCallback(async (id: string, status: Status, note?: string) => {
    setBusy(id); setActionError(null)
    const { error: e } = await rpc('admin_set_error_status', { p_error_id: id, p_status: status, p_note: note ?? null })
    setBusy(null)
    if (e) { setActionError('No se pudo completar la acción. Probá de nuevo.'); return }
    setReload(n => n + 1)
  }, [])

  const summary = current?.summary

  return (
    <div style={{ color: TEXT, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Errores</h1>
      <p style={{ color: MUTED, margin: '0 0 18px', fontSize: 14 }}>
        Lo que falla en el navegador de las personas, agrupado: el mismo error en distintas versiones cuenta como uno.
        "Personas" es un conteo anónimo por día (sin IP ni datos personales). Si un error resuelto vuelve a pasar, se reabre solo.
      </p>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[['Abiertos', summary.open], ['Nuevos hoy', summary.new_today], ['Personas afectadas hoy', summary.affected_today]].map(([label, n]) => (
            <div key={label as string} style={{ ...CARD, marginBottom: 0, padding: '12px 16px', minWidth: 150 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="group" aria-label="Estado" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
              style={{ ...BTN, ...(filter === f.key ? { background: `${ACCENT}22`, color: ACCENT, borderColor: `${ACCENT}55` } : {}) }}>
              {f.label}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
          Zona
          <select value={area} onChange={e => setArea(e.target.value)} style={{ ...INPUT, width: 'auto', minHeight: 40 }}>
            <option value="">Todas</option>
            {Object.entries(AREAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" style={{ color: ACCENT }}>{error}</p>}
      {errors === null && <p style={{ color: MUTED }}>Cargando…</p>}
      {errors?.length === 0 && !error && (
        <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{filter === 'open' ? 'No hay errores abiertos. 🎉' : 'No hay errores en esta vista.'}</p></div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Errores">
        {errors?.map(e => (
          <li key={e.id} style={CARD} aria-label={e.message}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={TAG}>{AREAS[e.area] ?? e.area}</span>
              {e.reopened && <span style={{ ...TAG, background: `${ACCENT}22`, color: ACCENT }}>Volvió a pasar</span>}
              {e.status !== 'open' && <span style={{ ...TAG, color: MUTED }}>{e.status === 'resolved' ? 'Resuelto' : 'Ignorado'}</span>}
            </div>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontFamily: 'ui-monospace, monospace', fontSize: 14, wordBreak: 'break-word' }}>{e.message}</p>
            <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
              {e.count} {e.count === 1 ? 'vez' : 'veces'} · {e.affected} {e.affected === 1 ? 'persona' : 'personas'} ({e.affected_today} hoy)
              · última {fmt(e.last_seen)} · primera {fmt(e.first_seen)}
            </p>
            <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13 }}>
              {[e.path, e.browser, e.release && `versión ${e.release}`].filter(Boolean).join(' · ')}
            </p>
            {e.note && <p style={{ margin: '6px 0 0', fontSize: 13 }}>Nota: {e.note}</p>}
            {e.stack && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: 'pointer', color: MUTED, fontSize: 13 }}>Ver detalle técnico</summary>
                <pre style={{ marginTop: 8, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', color: '#D0D5DD' }}>{e.stack}</pre>
              </details>
            )}

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {e.status === 'open' && (
                <label style={{ fontSize: 13, color: MUTED }}>
                  Nota (opcional: qué se hizo)
                  <input style={{ ...INPUT, marginTop: 6 }} value={notes[e.id] ?? ''} maxLength={300}
                    onChange={ev => setNotes(n => ({ ...n, [e.id]: ev.target.value }))} />
                </label>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {e.status === 'open' ? (
                  <>
                    <button type="button" style={{ ...BTN, background: ACCENT, border: 'none', color: '#fff' }} disabled={busy !== null}
                      onClick={() => setStatus(e.id, 'resolved', notes[e.id])}>Marcar resuelto</button>
                    <button type="button" style={BTN} disabled={busy !== null}
                      onClick={() => setStatus(e.id, 'ignored', notes[e.id])}>Ignorar</button>
                  </>
                ) : (
                  <button type="button" style={BTN} disabled={busy !== null} onClick={() => setStatus(e.id, 'open')}>Reabrir</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
