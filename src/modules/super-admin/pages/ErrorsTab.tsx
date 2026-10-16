import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminT } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'

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

const FILTERS: Array<Status | 'all'> = ['open', 'resolved', 'ignored', 'all']

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

export function ErrorsTab() {
  const t = useAdminT()
  const te = t.errors
  const areas = te.areas as Record<string, string>
  const { dateTime: fmt } = useAdminFormat()
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
  const error = current?.failed ? te.loadFailed : actionError

  const setStatus = useCallback(async (id: string, status: Status, note?: string) => {
    setBusy(id); setActionError(null)
    const { error: e } = await rpc('admin_set_error_status', { p_error_id: id, p_status: status, p_note: note ?? null })
    setBusy(null)
    if (e) { setActionError(t.common.actionFailed); return }
    setReload(n => n + 1)
  }, [t])

  const summary = current?.summary

  return (
    <div style={{ color: TEXT, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>{te.title}</h1>
      <p style={{ color: MUTED, margin: '0 0 18px', fontSize: 14 }}>
        {te.intro}
      </p>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[[te.summaryOpen, summary.open], [te.summaryNewToday, summary.new_today], [te.summaryAffectedToday, summary.affected_today]].map(([label, n]) => (
            <div key={label as string} style={{ ...CARD, marginBottom: 0, padding: '12px 16px', minWidth: 150 }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{n}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div role="group" aria-label={te.statusGroup} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              style={{ ...BTN, ...(filter === f ? { background: `${ACCENT}22`, color: ACCENT, borderColor: `${ACCENT}55` } : {}) }}>
              {te.filters[f]}
            </button>
          ))}
        </div>
        <label style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
          {te.area}
          <select value={area} onChange={e => setArea(e.target.value)} style={{ ...INPUT, width: 'auto', minHeight: 40 }}>
            <option value="">{te.allAreas}</option>
            {Object.entries(areas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" style={{ color: ACCENT }}>{error}</p>}
      {errors === null && <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>}
      {errors?.length === 0 && !error && (
        <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{filter === 'open' ? te.noneOpen : te.noneHere}</p></div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={te.list}>
        {errors?.map(e => (
          <li key={e.id} style={CARD} aria-label={e.message}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={TAG}>{areas[e.area] ?? e.area}</span>
              {e.reopened && <span style={{ ...TAG, background: `${ACCENT}22`, color: ACCENT }}>{te.reopened}</span>}
              {e.status !== 'open' && <span style={{ ...TAG, color: MUTED }}>{e.status === 'resolved' ? te.resolvedTag : te.ignoredTag}</span>}
            </div>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontFamily: 'ui-monospace, monospace', fontSize: 14, wordBreak: 'break-word' }}>{e.message}</p>
            <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
              {[te.times(e.count), te.people(e.affected, e.affected_today), te.last(fmt(e.last_seen)), te.first(fmt(e.first_seen))].join(' · ')}
            </p>
            <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13 }}>
              {[e.path, e.browser, e.release && te.version(e.release)].filter(Boolean).join(' · ')}
            </p>
            {e.note && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.common.note(e.note)}</p>}
            {e.stack && (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: 'pointer', color: MUTED, fontSize: 13 }}>{te.details}</summary>
                <pre tabIndex={0} aria-label={te.stackLabel} style={{ marginTop: 8, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', color: '#D0D5DD' }}>{e.stack}</pre>
              </details>
            )}

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {e.status === 'open' && (
                <label style={{ fontSize: 13, color: MUTED }}>
                  {te.noteLabel}
                  <input style={{ ...INPUT, marginTop: 6 }} value={notes[e.id] ?? ''} maxLength={300}
                    onChange={ev => setNotes(n => ({ ...n, [e.id]: ev.target.value }))} />
                </label>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {e.status === 'open' ? (
                  <>
                    <button type="button" style={{ ...BTN, background: ACCENT, border: 'none', color: '#fff' }} disabled={busy !== null}
                      onClick={() => setStatus(e.id, 'resolved', notes[e.id])}>{te.markResolved}</button>
                    <button type="button" style={BTN} disabled={busy !== null}
                      onClick={() => setStatus(e.id, 'ignored', notes[e.id])}>{te.ignore}</button>
                  </>
                ) : (
                  <button type="button" style={BTN} disabled={busy !== null} onClick={() => setStatus(e.id, 'open')}>{te.reopen}</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
