import { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdminT } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, BTN, CARD, INPUT, MUTED, OK_COLOR, TEXT, WARN_COLOR } from '../lib/adminRpc'

// Personas (auditoría del panel): buscar una cuenta por email, usuario o nombre y ver su ficha — Spaces, verificación,
// suspensión, denuncias, mensajes, suscriptores y cuántas cosas tiene en Life OS (nunca su contenido). Desde la ficha
// se suspende un Space o se verifica la cuenta con las RPC de siempre (quedan en "Actividad del equipo").
// La búsqueda y la cuenta abierta van en la URL (?q=, ?id=) para volver atrás sin perderlas.

interface AccountRow {
  user_id: string; email: string | null; created_at: string; last_sign_in_at: string | null
  display_name: string | null; username: string | null; suspended: boolean; verified: boolean
  spaces: number; has_business: boolean
}

interface SpaceRow {
  id: string; handle: string | null; display_name: string; status: string; is_primary: boolean
  published_at: string | null; suspended_at: string | null; suspension_reason: string | null
  open_reports: number; messages: number; subscribers: number
}

interface AccountDetail {
  user_id: string; email: string | null; created_at: string; last_sign_in_at: string | null
  is_admin: boolean; verified_at: string | null; has_business: boolean; verification_pending: boolean
  spaces: SpaceRow[]
  life: { tasks: number; captures: number; habits: number; transactions: number; last_activity: string | null }
}

export function PeopleTab() {
  const t = useAdminT()
  const p = t.people
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const openId = params.get('id')
  const [draft, setDraft] = useState(q)
  const [result, setResult] = useState<{ q: string; rows: AccountRow[]; failed: boolean } | null>(null)
  const inputId = useId()

  useEffect(() => {
    if (q.trim().length < 2) return
    let cancelled = false
    void Promise.resolve(adminRpc('admin_search_accounts', { p_query: q, p_limit: 50 })).then(({ data, error }) => {
      if (!cancelled) setResult({ q, rows: error ? [] : (data as AccountRow[] | null) ?? [], failed: !!error })
    })
    return () => { cancelled = true }
  }, [q])

  const search = (e: React.FormEvent) => {
    e.preventDefault()
    setParams(draft.trim() ? { q: draft.trim() } : {})
  }
  const open = (id: string | null) => setParams(prev => {
    const next = new URLSearchParams(prev)
    if (id) next.set('id', id); else next.delete('id')
    return next
  })

  if (openId) return <AccountView userId={openId} onBack={() => open(null)} />

  const tooShort = q.trim().length < 2
  const loading = !tooShort && (!result || result.q !== q)

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>{p.title}</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: MUTED }}>{p.intro}</p>
      <form role="search" onSubmit={search} style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <label htmlFor={inputId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{p.search}</label>
        <input id={inputId} type="search" value={draft} onChange={e => setDraft(e.target.value)} placeholder={p.placeholder}
          style={INPUT} autoComplete="off" />
        <button type="submit" style={{ ...BTN, background: TEXT, color: '#0A0D12', border: 'none' }}>{p.search}</button>
      </form>

      {q && tooShort ? <p style={{ color: MUTED }}>{p.minChars}</p>
        : loading ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
          : result?.failed ? <p role="alert" style={{ color: WARN_COLOR }}>{p.loadFailed}</p>
            : result && result.rows.length === 0 ? <p style={{ color: MUTED }}>{p.noResults}</p>
              : result && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {result.rows.map(r => (
                    <li key={r.user_id}>
                      <button type="button" onClick={() => open(r.user_id)}
                        style={{ ...CARD, width: '100%', textAlign: 'start', cursor: 'pointer', color: TEXT, display: 'block' }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>
                          {r.display_name || r.email || r.user_id}
                          {r.username && <span style={{ color: MUTED, fontWeight: 500 }}> · /{r.username}</span>}
                        </span>
                        <span style={{ display: 'block', marginTop: 4, fontSize: 13, color: MUTED, overflowWrap: 'anywhere' }}>
                          {r.email} · {p.spaces(r.spaces)}
                        </span>
                        <Badges verified={r.verified} suspended={r.suspended} business={r.has_business} hasProfile={!!r.username} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
    </div>
  )
}

function Badges({ verified, suspended, business, hasProfile, admin }: { verified: boolean; suspended: boolean; business: boolean; hasProfile: boolean; admin?: boolean }) {
  const p = useAdminT().people
  const items = [
    verified && { text: p.verified, color: OK_COLOR },
    suspended && { text: p.suspended, color: WARN_COLOR },
    business && { text: p.business, color: MUTED },
    admin && { text: p.admin, color: '#93C5FD' },
    !hasProfile && { text: p.noProfile, color: MUTED },
  ].filter(Boolean) as { text: string; color: string }[]
  if (!items.length) return null
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {items.map(i => (
        <span key={i.text} style={{ fontSize: 12, fontWeight: 700, color: i.color, border: `1px solid ${i.color}55`, borderRadius: 999, padding: '2px 9px' }}>{i.text}</span>
      ))}
    </span>
  )
}

function AccountView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const t = useAdminT()
  const p = t.people
  const { dateTime, number } = useAdminFormat()
  const [reload, setReload] = useState(0)
  const key = `${userId}#${reload}`
  const [state, setState] = useState<{ key: string; data: AccountDetail | null; failed: boolean } | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve(adminRpc('admin_account_detail', { p_user_id: userId })).then(({ data, error: e }) => {
      if (!cancelled) setState({ key, data: e ? null : data as AccountDetail | null, failed: !!e })
    })
    return () => { cancelled = true }
  }, [userId, key])

  async function act(fn: string, args: Record<string, unknown>) {
    setBusy(true); setError(null)
    const { error: e } = await adminRpc(fn, args)
    setBusy(false)
    if (e) { setError(t.common.actionFailed); return }
    setReload(n => n + 1)
  }

  const d = state?.key === key ? state.data : null
  const statusLabel = (s: string) => ({ published: p.statusPublished, draft: p.statusDraft, unpublished: p.statusUnpublished, archived: p.statusArchived } as Record<string, string>)[s] ?? s

  return (
    <div style={{ maxWidth: 900 }}>
      <button type="button" onClick={onBack} style={{ ...BTN, marginBottom: 16 }}>← {p.back}</button>
      {!state || state.key !== key ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
        : !d ? <p role="alert" style={{ color: WARN_COLOR }}>{p.loadFailed}</p>
          : (
            <>
              <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: TEXT, overflowWrap: 'anywhere' }}>{d.spaces[0]?.display_name || d.email}</h1>
              <p style={{ margin: 0, color: MUTED, fontSize: 13.5, overflowWrap: 'anywhere' }}>
                {d.email} · {p.joined(dateTime(d.created_at))} · {d.last_sign_in_at ? p.lastSeen(dateTime(d.last_sign_in_at)) : p.never}
              </p>
              <Badges verified={!!d.verified_at} suspended={d.spaces.some(s => s.suspended_at)} business={d.has_business}
                hasProfile={d.spaces.length > 0} admin={d.is_admin} />
              {d.verification_pending && <p style={{ margin: '8px 0 0', color: '#FCD34D', fontSize: 13 }}>{p.verificationPending}</p>}

              {error && <p role="alert" style={{ color: WARN_COLOR }}>{error}</p>}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 18px' }}>
                <button type="button" style={BTN} disabled={busy || d.spaces.length === 0}
                  onClick={() => { void act('admin_set_verified', { p_user_id: d.user_id, p_verified: !d.verified_at }) }}>
                  {d.verified_at ? p.unverify : p.verify}
                </button>
              </div>

              <h2 style={{ margin: '0 0 10px', fontSize: 16, color: TEXT }}>{p.spacesTitle}</h2>
              {d.spaces.length === 0 && <p style={{ color: MUTED }}>{p.noProfile}</p>}
              {d.spaces.map(s => (
                <section key={s.id} style={CARD} aria-label={s.handle ?? s.display_name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: TEXT }}>{s.display_name || '—'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: MUTED }}>
                        {s.handle ? `/${s.handle}` : '—'} · {statusLabel(s.status)}
                      </p>
                    </div>
                    {s.handle && s.status === 'published' && (
                      <a href={`/${s.handle}`} target="_blank" rel="noopener noreferrer"
                        style={{ ...BTN, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{p.openProfile}</a>
                    )}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: MUTED }}>
                    {p.reportsOpen(s.open_reports)} · {p.messages(s.messages)} · {p.subscribers(s.subscribers)}
                  </p>
                  {s.suspended_at ? (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ margin: '0 0 8px', color: WARN_COLOR, fontSize: 13 }}>
                        {p.suspended} · {dateTime(s.suspended_at)}{s.suspension_reason ? ` · ${s.suspension_reason}` : ''}
                      </p>
                      <button type="button" style={BTN} disabled={busy}
                        onClick={() => { void act('admin_set_suspension', { p_profile_id: s.id, p_suspended: false, p_reason: null }) }}>
                        {p.unsuspend}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      <input style={INPUT} maxLength={300} aria-label={p.reasonLabel} placeholder={p.reasonLabel}
                        value={reasons[s.id] ?? ''} onChange={e => setReasons(r => ({ ...r, [s.id]: e.target.value }))} />
                      <div>
                        <button type="button" style={{ ...BTN, borderColor: `${WARN_COLOR}66`, color: WARN_COLOR }} disabled={busy}
                          onClick={() => { void act('admin_set_suspension', { p_profile_id: s.id, p_suspended: true, p_reason: reasons[s.id]?.trim() || null }) }}>
                          {p.suspend}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ))}

              <section style={CARD} aria-labelledby="acc-life">
                <h2 id="acc-life" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>{p.lifeTitle}</h2>
                <p style={{ margin: '0 0 12px', fontSize: 12.5, color: MUTED }}>{p.privacyNote}</p>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  {([[p.tasks, d.life.tasks], [p.captures, d.life.captures], [p.habits, d.life.habits], [p.transactions, d.life.transactions]] as const).map(([label, n]) => (
                    <div key={label}>
                      <dt style={{ fontSize: 12.5, color: MUTED }}>{label}</dt>
                      <dd style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>{number(n)}</dd>
                    </div>
                  ))}
                  <div>
                    <dt style={{ fontSize: 12.5, color: MUTED }}>{p.lastActivity}</dt>
                    <dd style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>{d.life.last_activity ? dateTime(d.life.last_activity) : p.none}</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
    </div>
  )
}
