import { useCallback, useEffect, useState } from 'react'
import { useAdminT } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, BTN, CARD, INPUT, MUTED, OK_COLOR, TEXT, WARN_COLOR } from '../lib/adminRpc'

// Nombres reservados para talentos (PR E): el equipo reserva el username de un talento antes de que abra su Mycen. Con
// su email, esa persona lo toma al crear su perfil; sin email, nadie. Todo por RPC (admin_*_talent_reservation).

interface Reservation {
  username: string
  talent_name: string
  email: string | null
  note: string | null
  created_at: string
  claimed_at: string | null
  claimed_username: string | null
}

type SaveResult = 'saved' | 'invalid' | 'taken' | 'system'

const LABEL: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 13, color: MUTED }

export function ReservationsTab() {
  const t = useAdminT()
  const r = t.reservations
  const { dateTime } = useAdminFormat()
  const [q, setQ] = useState('')
  const [list, setList] = useState<Reservation[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [form, setForm] = useState({ username: '', talentName: '', email: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [bulk, setBulk] = useState('')

  const load = useCallback(async (query: string) => {
    const { data, error } = await adminRpc('admin_list_talent_reservations', { p_q: query || null })
    setFailed(!!error)
    setList(error ? [] : (data as Reservation[]))
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => { void load(q) }, 250)
    return () => window.clearTimeout(id)
  }, [q, load])

  const save = async (username: string, talentName: string, email: string, note: string): Promise<SaveResult | 'error'> => {
    const { data, error } = await adminRpc('admin_save_talent_reservation', {
      p_username: username.trim().replace(/^@/, ''), p_talent_name: talentName.trim(), p_email: email.trim() || null, p_note: note.trim() || null,
    })
    return error ? 'error' : data as SaveResult
  }

  const message = (res: SaveResult | 'error') => (res === 'error' ? t.common.actionFailed : r[res])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const res = await save(form.username, form.talentName, form.email, form.note)
    setBusy(false)
    setMsg({ text: message(res), ok: res === 'saved' })
    if (res === 'saved') { setForm({ username: '', talentName: '', email: '', note: '' }); void load(q) }
  }

  // Varios a la vez: "usuario, nombre, email" por línea
  async function submitBulk() {
    const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean)
    if (!rows.length) return
    setBusy(true); setMsg(null)
    let ok = 0
    const bad: string[] = []
    for (const line of rows) {
      const [username = '', name = '', email = ''] = line.split(/[,;\t]/).map(s => s.trim())
      const res = await save(username, name || username, email, '')
      if (res === 'saved') ok++
      else bad.push(line)
    }
    setBusy(false)
    setBulk(bad.join('\n'))
    setMsg({ text: r.bulkDone(ok, bad.length), ok: bad.length === 0 })
    void load(q)
  }

  async function remove(username: string) {
    if (!window.confirm(r.removeConfirm(username))) return
    const { error } = await adminRpc('admin_delete_talent_reservation', { p_username: username })
    if (error) { setMsg({ text: t.common.actionFailed, ok: false }); return }
    void load(q)
  }

  const field = (key: keyof typeof form, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={LABEL}>
      <span style={{ color: TEXT, fontWeight: 600 }}>{label}</span>
      <input style={INPUT} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...extra} />
    </label>
  )

  return (
    <div style={{ maxWidth: 900, color: TEXT }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>{r.title}</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: MUTED }}>{r.intro}</p>

      <form style={CARD} onSubmit={submit} aria-label={r.save}>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {field('username', r.username, { required: true, autoCapitalize: 'off', spellCheck: false, maxLength: 31 })}
          {field('talentName', r.talentName, { required: true, maxLength: 120 })}
          {field('email', r.email, { type: 'email', autoComplete: 'off', maxLength: 254 })}
          {field('note', r.note, { maxLength: 300 })}
        </div>
        <button type="submit" style={{ ...BTN, marginTop: 12 }} disabled={busy}>{busy ? r.saving : r.save}</button>
      </form>

      <section style={CARD} aria-labelledby="res-bulk">
        <h2 id="res-bulk" style={{ margin: '0 0 4px', fontSize: 16 }}>{r.bulkTitle}</h2>
        <label style={LABEL}>
          <span>{r.bulkHelp}</span>
          <textarea style={{ ...INPUT, minHeight: 110, fontFamily: 'ui-monospace, monospace' }} value={bulk}
            onChange={e => setBulk(e.target.value)} spellCheck={false} />
        </label>
        <button type="button" style={{ ...BTN, marginTop: 12 }} disabled={busy || !bulk.trim()} onClick={() => { void submitBulk() }}>
          {busy ? r.saving : r.bulkSave}
        </button>
      </section>

      <p role="status" style={{ minHeight: '1.4em', fontSize: 13.5, color: msg?.ok ? OK_COLOR : WARN_COLOR }}>{msg?.text ?? ''}</p>

      <input style={{ ...INPUT, marginBottom: 12 }} type="search" placeholder={r.search} aria-label={r.search} value={q}
        onChange={e => setQ(e.target.value)} />

      {failed && <p role="alert" style={{ color: WARN_COLOR }}>{r.loadFailed}</p>}
      {list === null ? <p role="status" style={{ color: MUTED }}>{t.common.loading}</p>
        : list.length === 0 && !failed ? <div style={CARD}><p style={{ margin: 0, color: MUTED }}>{r.empty}</p></div>
          : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label={r.title}>
              {list.map(x => (
                <li key={x.username} data-testid={`reservation-${x.username}`} style={{ ...CARD, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                    <p style={{ margin: 0, overflowWrap: 'anywhere' }}><strong>@{x.username}</strong> · {x.talent_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: MUTED, overflowWrap: 'anywhere' }}>
                      {[x.email, x.note, dateTime(x.created_at)].filter(Boolean).join(' · ')}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: x.claimed_at ? OK_COLOR : x.email ? MUTED : WARN_COLOR }}>
                      {x.claimed_at ? `${r.claimed} · ${dateTime(x.claimed_at)}` : x.email ? r.pending : r.noEmail}
                    </p>
                  </div>
                  <button type="button" style={BTN} onClick={() => { void remove(x.username) }}>{r.remove}</button>
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}
