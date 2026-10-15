import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft, BookLock, ChevronLeft, ChevronRight, LockKeyhole, NotebookPen, Pencil, Search, Trash2, X } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { useAuthStore } from '@/store/authStore'
import { LifeScreenContainer, LifeCard, LifeEmptyState, LifeSectionHeader, colors, font, radius, tint } from '../design-system'
import { ActionMenu } from '../components/ActionMenu'
import { JournalLockScreen } from '../components/JournalLock'
import { useJournal, JournalError, JOURNAL_MAX, type JournalEntry, type JournalSaveError } from '../hooks/useJournal'
import { dayKey, useToday } from '../hooks/useToday'
import { deleteWithUndo } from '../lib/undo'
import { monthKeyOf, shiftMonth } from '../lib/moneyInsights'
import { isIdle, readLock, writeLock, type JournalLock } from '../lib/journalLock'

// Diario privado (V1.1, FEATURES.journal). Entradas por día, editar, borrar con "Deshacer", buscar y lista por mes.
// Si la persona activó el bloqueo en este dispositivo, primero se desbloquea; se vuelve a bloquear al salir, al pasar
// a segundo plano y tras 5 minutos sin uso. Mientras está bloqueado no se pide nada a la base.

const roundBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: radius.full, flexShrink: 0, background: 'transparent',
  border: `1px solid ${colors.border.subtle}`, color: colors.text.secondary, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const textareaStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 140, padding: '12px 14px', borderRadius: radius.md, resize: 'none',
  background: colors.surface.high, border: `1px solid ${colors.border.medium}`, color: colors.text.primary,
  fontFamily: font, fontSize: 16, lineHeight: 1.55, outline: 'none', overflow: 'hidden',
}
const dateStyle: React.CSSProperties = {
  minHeight: 44, padding: '8px 12px', borderRadius: radius.md, background: colors.surface.high,
  border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: 16, colorScheme: 'inherit',
}
const primaryBtn: React.CSSProperties = {
  minHeight: 44, padding: '10px 18px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
  background: colors.accent.default, color: colors.accent.on, fontFamily: font, fontSize: 14, fontWeight: 700,
}
const secondaryBtn: React.CSSProperties = {
  minHeight: 44, padding: '10px 18px', borderRadius: radius.full, cursor: 'pointer', background: 'transparent',
  border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: 14, fontWeight: 600,
}

/** El área de texto crece con lo escrito (sin scroll adentro). */
function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return ref
}

function useErrorText() {
  const t = useLifeT()
  return (e: unknown) => {
    const kind: JournalSaveError = e instanceof JournalError ? e.kind : 'save'
    return { day_full: t.journal.dayFull, total_full: t.journal.totalFull, too_long: t.journal.tooLong, empty: t.journal.empty, save: t.common.saveError }[kind]
  }
}

// ── Formulario (nueva entrada y editar) ──────────────────────────────────────
function EntryForm({ body, date, onBody, onDate, onSubmit, onCancel, submitLabel, busy, error, autoFocus }: {
  body: string; date: string; onBody: (v: string) => void; onDate: (v: string) => void
  onSubmit: () => void; onCancel?: () => void; submitLabel: string; busy: boolean; error: string | null; autoFocus?: boolean
}) {
  const t = useLifeT()
  const today = useToday()
  const locale = langLocale(useAppLang(s => s.lang))
  const ref = useAutoGrow(body)
  const bodyId = useId()
  const dateId = useId()
  const countId = useId()
  const errId = useId()
  const tooLong = body.length > JOURNAL_MAX
  const nf = new Intl.NumberFormat(locale)
  const submit = (e: FormEvent) => { e.preventDefault(); if (!busy && body.trim() && !tooLong) onSubmit() }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={bodyId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        {t.journal.entryLabel}
      </label>
      <textarea id={bodyId} ref={ref} value={body} onChange={e => onBody(e.target.value)} placeholder={t.journal.placeholder}
        autoFocus={autoFocus} aria-describedby={`${countId} ${errId}`} aria-invalid={tooLong || undefined} rows={5}
        style={{ ...textareaStyle, borderColor: tooLong ? colors.semantic.error : colors.border.medium }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor={dateId} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text.secondary }}>{t.journal.date}</label>
          <input id={dateId} type="date" value={date} max={today} min="1900-01-01" required
            onChange={e => { if (e.target.value) onDate(e.target.value) }} style={dateStyle} />
        </div>
        <span id={countId} style={{ fontFamily: font, fontSize: 12, color: tooLong ? colors.semantic.error : colors.text.tertiary }}>
          {body.length > JOURNAL_MAX * 0.8 ? t.journal.chars(nf.format(body.length), nf.format(JOURNAL_MAX)) : ''}
        </span>
      </div>
      <div id={errId} aria-live="polite">
        {(error || tooLong) && <p role="alert" style={{ fontFamily: font, fontSize: 13.5, color: colors.semantic.error, margin: 0 }}>{tooLong ? t.journal.tooLong : error}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" onClick={onCancel} style={secondaryBtn}>{t.common.cancel}</button>}
        <button type="submit" disabled={busy || !body.trim() || tooLong}
          style={{ ...primaryBtn, opacity: busy || !body.trim() || tooLong ? 0.5 : 1, cursor: busy || !body.trim() || tooLong ? 'default' : 'pointer' }}>
          {busy ? t.common.saving : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ── Una entrada ──────────────────────────────────────────────────────────────
function EntryCard({ entry, onSave, onDelete }: {
  entry: JournalEntry
  onSave: (patch: { entry_date: string; body: string }) => Promise<void>
  onDelete: () => void
}) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const errorText = useErrorText()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(entry.body)
  const [date, setDate] = useState(entry.entry_date)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const long = entry.body.length > 320 || entry.body.split('\n').length > 6
  const time = new Date(entry.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  if (editing) {
    return (
      <LifeCard style={{ padding: 14 }}>
        <h3 style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: colors.text.secondary, margin: '0 0 8px' }}>{t.journal.editTitle}</h3>
        <EntryForm body={body} date={date} onBody={v => { setBody(v); setError(null) }} onDate={setDate} busy={busy} error={error} autoFocus
          submitLabel={t.common.save}
          onCancel={() => { setEditing(false); setBody(entry.body); setDate(entry.entry_date); setError(null) }}
          onSubmit={() => {
            setBusy(true)
            onSave({ entry_date: date, body })
              .then(() => { setEditing(false); toast.success(t.common.saved) })
              .catch(e => setError(errorText(e)))
              .finally(() => setBusy(false))
          }} />
      </LifeCard>
    )
  }

  return (
    <LifeCard style={{ padding: '10px 6px 12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
          <p style={{ fontFamily: font, fontSize: 11.5, fontWeight: 600, color: colors.text.tertiary, margin: '0 0 4px' }}>{time}</p>
          <p style={{
            fontFamily: font, fontSize: 15, lineHeight: 1.6, color: colors.text.primary, margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
            ...(long && !expanded ? { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
          }}>
            {entry.body}
          </p>
          {long && (
            <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
              style={{ marginTop: 4, padding: '4px 0', minHeight: 32, background: 'none', border: 'none', cursor: 'pointer', fontFamily: font, fontSize: 12.5, fontWeight: 700, color: colors.accent.ink }}>
              {expanded ? t.journal.readLess : t.journal.readMore}
            </button>
          )}
        </div>
        <ActionMenu label={t.journal.options} actions={[
          { icon: Pencil, label: t.common.edit, onSelect: () => setEditing(true) },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ]} />
      </div>
    </LifeCard>
  )
}

// ── Diario (desbloqueado) ────────────────────────────────────────────────────
function JournalBody({ draft, setDraft }: { draft: { body: string; date: string }; setDraft: (d: { body: string; date: string }) => void }) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const today = useToday()
  const errorText = useErrorText()
  const [month, setMonth] = useState(() => monthKeyOf(new Date()))
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { entries, loading, error: loadError, searching, reload, create, update, hideLocally, remove } =
    useJournal({ month, query: searchOpen ? query : '', enabled: true })

  const isCurrent = month === monthKeyOf(new Date())
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
  const Prev = rtl ? ChevronRight : ChevronLeft
  const Next = rtl ? ChevronLeft : ChevronRight
  const rawMonth = new Date(`${month}-15T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const monthName = rawMonth.charAt(0).toLocaleUpperCase(locale) + rawMonth.slice(1)

  const groups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
    for (const e of entries) {
      if (!map.has(e.entry_date)) map.set(e.entry_date, [])
      map.get(e.entry_date)!.push(e)
    }
    return [...map.entries()]
  }, [entries])

  const dayTitle = (d: string) => (d === today ? t.brain.today : new Date(`${d}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', ...(d.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) }))

  const save = () => {
    setSaving(true)
    create({ entry_date: draft.date, body: draft.body })
      .then(entry => {
        setDraft({ body: '', date: today })
        setError(null)
        toast.success(t.journal.saved)
        // Si se escribió para otro mes, se muestra ese mes
        if (!searching && !entry.entry_date.startsWith(`${month}-`)) setMonth(entry.entry_date.slice(0, 7))
      })
      .catch(e => setError(errorText(e)))
      .finally(() => setSaving(false))
  }

  const del = (entry: JournalEntry) => {
    hideLocally(entry.id)
    deleteWithUndo({ message: t.journal.deleted, commit: () => remove(entry.id), restore: reload })
  }

  const q = query.trim()

  return (
    <>
      <LifeCard style={{ padding: 14, marginBottom: 14 }}>
        <EntryForm body={draft.body} date={draft.date} busy={saving} error={error} submitLabel={t.journal.save}
          onBody={v => { setDraft({ ...draft, body: v }); setError(null) }} onDate={v => setDraft({ ...draft, date: v })} onSubmit={save} />
      </LifeCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {searchOpen ? (
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} autoFocus
            placeholder={t.journal.searchPlaceholder} aria-label={t.journal.search}
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '10px 14px', boxSizing: 'border-box', borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: 16, outline: 'none' }} />
        ) : (
          <>
            <button type="button" onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label={t.journal.prevMonth} title={t.journal.prevMonth} style={roundBtn}>
              <Prev size={18} aria-hidden="true" />
            </button>
            <h2 aria-live="polite" style={{ flex: 1, textAlign: 'center', fontFamily: font, fontSize: 16, fontWeight: 800, color: colors.text.primary, margin: 0 }}>
              {monthName}
            </h2>
            <button type="button" onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={isCurrent} aria-label={t.journal.nextMonth} title={t.journal.nextMonth}
              style={{ ...roundBtn, opacity: isCurrent ? 0.35 : 1, cursor: isCurrent ? 'default' : 'pointer' }}>
              <Next size={18} aria-hidden="true" />
            </button>
          </>
        )}
        <button type="button" onClick={() => { setSearchOpen(v => !v); setQuery('') }} aria-expanded={searchOpen}
          aria-label={searchOpen ? t.journal.closeSearch : t.journal.search} title={searchOpen ? t.journal.closeSearch : t.journal.search}
          style={{ ...roundBtn, background: searchOpen ? tint(colors.accent.default, 12) : 'transparent', color: searchOpen ? colors.accent.ink : colors.text.secondary }}>
          {searchOpen ? <X size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
        </button>
      </div>

      {searchOpen && q.length < 2 ? (
        <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: '0 0 12px' }}>{t.journal.searchHint}</p>
      ) : loading ? (
        <div aria-hidden="true" style={{ height: 96, borderRadius: radius.xl, background: colors.surface.base, border: `1px solid ${colors.border.subtle}` }} />
      ) : loadError ? (
        <LifeCard>
          <LifeEmptyState icon={AlertTriangle} iconColor={colors.semantic.error} title={t.journal.loadError} subtitle=""
            action={{ label: t.journal.retry, onClick: reload }} />
        </LifeCard>
      ) : entries.length === 0 ? (
        <LifeCard>
          {searching
            ? <LifeEmptyState icon={Search} title={t.journal.noResults(q)} subtitle="" />
            : <LifeEmptyState icon={NotebookPen} iconColor={colors.accent.ink} title={t.journal.emptyTitle} subtitle={t.journal.emptyText} />}
        </LifeCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groups.map(([d, list]) => (
            <section key={d} aria-label={dayTitle(d)}>
              <LifeSectionHeader title={dayTitle(d)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginBottom: 8 }}>
                {list.map(e => <EntryCard key={`${e.id}-${e.updated_at}`} entry={e} onSave={patch => update(e.id, patch)} onDelete={() => del(e)} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export function LifeJournalPage() {
  const t = useLifeT()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id) ?? ''
  const [lock, setLock] = useState<JournalLock | null>(() => (userId ? readLock(userId) : null))
  const [open, setOpen] = useState(() => !lock)
  const [draft, setDraft] = useState(() => ({ body: '', date: dayKey() }))
  const lastActivity = useRef(0)

  const relock = useCallback(() => {
    const current = userId ? readLock(userId) : null
    setLock(current)
    if (current) setOpen(false)
  }, [userId])

  // Se vuelve a bloquear al pasar a segundo plano y tras 5 minutos sin uso (al salir del Diario, el estado se pierde)
  useEffect(() => {
    if (!lock || !open) return
    lastActivity.current = Date.now()
    const touch = () => { lastActivity.current = Date.now() }
    const onVisibility = () => { if (document.visibilityState === 'hidden') relock() }
    const events = ['pointerdown', 'keydown', 'input', 'scroll', 'touchstart'] as const
    for (const ev of events) window.addEventListener(ev, touch, { passive: true, capture: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', relock)
    const id = window.setInterval(() => { if (isIdle(lastActivity.current, Date.now())) relock() }, 10_000)
    return () => {
      for (const ev of events) window.removeEventListener(ev, touch, { capture: true })
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', relock)
      window.clearInterval(id)
    }
  }, [lock, open, relock])

  const locked = !!lock && !open

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button type="button" onClick={() => navigate('/life/brain')} aria-label={t.journal.back} title={t.journal.back} style={roundBtn}>
            <ArrowLeft size={18} aria-hidden="true" className="flip-rtl" />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: colors.text.primary, margin: 0 }}>{t.journal.title}</h1>
            <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: 0 }}>{t.journal.subtitle}</p>
          </div>
        </div>
        {lock && open && (
          <button type="button" onClick={() => setOpen(false)} aria-label={t.journal.lockNow} title={t.journal.lockNow} style={roundBtn}>
            <LockKeyhole size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {locked && lock ? (
        <JournalLockScreen userId={userId} lock={lock}
          onUnlocked={next => { writeLock(userId, next); setLock(next); setOpen(true) }}
          onLockChange={setLock} />
      ) : (
        <JournalBody draft={draft} setDraft={setDraft} />
      )}

      <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontFamily: font, fontSize: 12.5, lineHeight: 1.5, color: colors.text.secondary, margin: '20px 4px 0' }}>
        <BookLock size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{t.journal.privacy}</span>
      </p>
    </LifeScreenContainer>
  )
}
