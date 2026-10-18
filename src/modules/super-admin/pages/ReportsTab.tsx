import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminT } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'

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
    /** handle: "ana" o "ana/estudio" (Space secundario) */
    id: string; username: string; handle?: string; display_name: string; status: string
    suspended_at: string | null; suspension_reason: string | null; open_reports: number
  }
}

interface Suspended { id: string; username: string; handle?: string; display_name: string; suspended_at: string; suspension_reason: string | null }


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

export function ReportsTab() {
  const t = useAdminT()
  const { dateTime: fmt } = useAdminFormat()
  const tr = t.reports
  const reasonOf = (reason: string) => (tr.reasons as Record<string, string>)[reason] ?? reason
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
  const error = current?.failed ? tr.loadFailed : actionError

  const act = useCallback(async (id: string, fn: string, args: Record<string, unknown>) => {
    setBusy(id); setActionError(null)
    const { error: e } = await rpc(fn, args)
    setBusy(null)
    if (e) { setActionError(t.common.actionFailed); return }
    setReload(n => n + 1)
  }, [t])

  return (
    <div style={{ color: TEXT, maxWidth: 860 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>{tr.title}</h1>
      <p style={{ color: MUTED, margin: '0 0 18px', fontSize: 14 }}>
        {tr.intro}
      </p>

      <div role="group" aria-label={t.common.filter} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['open', 'resolved'] as const).map(f => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            style={{ ...BTN, ...(filter === f ? { background: `${ACCENT}22`, color: ACCENT, borderColor: `${ACCENT}55` } : {}) }}>
            {f === 'open' ? tr.open : tr.resolved}
          </button>
        ))}
      </div>

      {error && <p role="alert" style={{ color: ACCENT }}>{error}</p>}
      {reports === null && <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>}
      {reports?.length === 0 && !error && (
        <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{filter === 'open' ? tr.noneOpen : tr.noneResolved}</p></div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={tr.list}>
        {reports?.map(r => (
          <li key={r.id} style={CARD} aria-label={tr.reportOf(r.profile.display_name)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{r.profile.display_name}</strong>{' '}
                <a href={`/${r.profile.handle ?? r.profile.username}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>@{r.profile.handle ?? r.profile.username}</a>
                {r.project && (
                  <> · <a href={`/${r.profile.username}/projects/${r.project.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>
                    {tr.project(r.project.title)}</a></>
                )}
                {r.profile.suspended_at && <span style={{ marginInlineStart: 8, color: ACCENT, fontSize: 12, fontWeight: 700 }}>{tr.suspendedTag}</span>}
              </div>
              <span style={{ color: MUTED, fontSize: 13 }}>{fmt(r.created_at)}</span>
            </div>
            <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>{reasonOf(r.reason)}</p>
            {r.details && <p style={{ margin: '0 0 6px', color: '#D0D5DD', whiteSpace: 'pre-line' }}>{r.details}</p>}
            <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
              {r.status === 'open'
                ? tr.openCount(r.profile.open_reports)
                : `${tr.status[r.status]}${r.resolved_at ? ` · ${fmt(r.resolved_at)}` : ''}${r.resolution_note ? ` · ${r.resolution_note}` : ''}`}
            </p>

            {r.status === 'open' && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 13, color: MUTED }}>
                  {tr.noteLabel}
                  <input style={{ ...INPUT, marginTop: 6 }} value={notes[r.id] ?? ''} maxLength={300}
                    onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" style={BTN} disabled={busy !== null}
                    onClick={() => act(r.id, 'admin_resolve_report', { p_report_id: r.id, p_action: 'dismiss', p_note: notes[r.id] ?? null })}>
                    {tr.dismiss}
                  </button>
                  <button type="button" style={DANGER} disabled={busy !== null}
                    onClick={() => act(r.id, 'admin_resolve_report', { p_report_id: r.id, p_action: 'suspend', p_note: notes[r.id] || reasonOf(r.reason) })}>
                    {tr.suspend}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <MessageReports filter={filter} />

      <h2 style={{ fontSize: 18, margin: '28px 0 10px' }}>{tr.suspendedTitle}</h2>
      {suspended.length === 0
        ? <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{tr.noneSuspended}</p></div>
        : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={tr.suspendedTitle}>
            {suspended.map(p => (
              <li key={p.id} style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{p.display_name}</strong> <span style={{ color: MUTED }}>@{p.handle ?? p.username}</span>
                  <p style={{ margin: '4px 0 0', color: MUTED, fontSize: 13 }}>
                    {tr.since(fmt(p.suspended_at))}{p.suspension_reason ? ` · ${p.suspension_reason}` : ''}
                  </p>
                </div>
                <button type="button" style={BTN} disabled={busy !== null}
                  onClick={() => act(p.id, 'admin_set_suspension', { p_profile_id: p.id, p_suspended: false })}>
                  {tr.lift}
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

interface MessageReport {
  id: string
  reason: string
  status: 'open' | 'dismissed' | 'actioned'
  created_at: string
  sender_name: string
  sender_contact: string
  message: string
  resolution_note: string | null
  resolved_at: string | null
  profile: { id: string; handle: string | null; display_name: string }
}

/** Mensajes que la persona dueña reportó desde Studio → Mensajes (tiendas, App Store 1.2). Quien escribió ya quedó
 *  bloqueado en ese perfil; acá se marca como revisado o se descarta. */
function MessageReports({ filter }: { filter: 'open' | 'resolved' }) {
  const t = useAdminT()
  const { dateTime: fmt } = useAdminFormat()
  const tr = t.reports
  const reasonOf = (reason: string) => (tr.reasons as Record<string, string>)[reason] ?? reason
  const [reload, setReload] = useState(0)
  const key = `${filter}#${reload}`
  const [result, setResult] = useState<{ key: string; items: MessageReport[]; failed: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    rpc('admin_list_message_reports', { p_status: filter }).then(r => {
      if (!cancelled) setResult({ key, failed: !!r.error, items: r.error ? [] : r.data as MessageReport[] })
    })
    return () => { cancelled = true }
  }, [filter, key])

  const current = result?.key === key ? result : null
  const resolve = async (id: string, action: 'dismiss' | 'action') => {
    setBusy(true); setFailed(false)
    const { error } = await rpc('admin_resolve_message_report', { p_report_id: id, p_action: action })
    setBusy(false)
    if (error) { setFailed(true); return }
    setReload(n => n + 1)
  }

  return (
    <section aria-labelledby="message-reports-title">
      <h2 id="message-reports-title" style={{ fontSize: 18, margin: '28px 0 6px' }}>{tr.msgTitle}</h2>
      <p style={{ color: MUTED, margin: '0 0 12px', fontSize: 14 }}>{tr.msgIntro}</p>
      {(current?.failed || failed) && <p role="alert" style={{ color: ACCENT }}>{current?.failed ? tr.loadFailed : t.common.actionFailed}</p>}
      {!current && <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>}
      {current && current.items.length === 0 && !current.failed && (
        <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{tr.msgNone}</p></div>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={tr.msgTitle}>
        {current?.items.map(r => (
          <li key={r.id} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong dir="auto">{tr.msgFrom}: {r.sender_name}</strong>{' '}
                <span style={{ color: MUTED }} dir="ltr">{r.sender_contact}</span>
                <div style={{ color: MUTED, fontSize: 13 }}>
                  {tr.msgTo}: {r.profile.handle
                    ? <a href={`/${r.profile.handle}`} target="_blank" rel="noopener noreferrer" style={{ color: MUTED }}>@{r.profile.handle}</a>
                    : r.profile.display_name}
                </div>
              </div>
              <span style={{ color: MUTED, fontSize: 13 }}>{fmt(r.created_at)}</span>
            </div>
            <p style={{ margin: '10px 0 4px', fontWeight: 600 }}>{reasonOf(r.reason)}</p>
            <p style={{ margin: '0 0 6px', color: '#D0D5DD', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }} dir="auto">{r.message}</p>
            {r.status === 'open' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button type="button" style={BTN} disabled={busy} onClick={() => { void resolve(r.id, 'dismiss') }}>{tr.dismiss}</button>
                <button type="button" style={BTN} disabled={busy} onClick={() => { void resolve(r.id, 'action') }}>{tr.msgReviewed}</button>
              </div>
            ) : (
              <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
                {`${tr.status[r.status]}${r.resolved_at ? ` · ${fmt(r.resolved_at)}` : ''}${r.resolution_note ? ` · ${r.resolution_note}` : ''}`}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
