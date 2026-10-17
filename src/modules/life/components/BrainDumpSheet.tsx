import { useEffect, useState } from 'react'
import { CheckSquare, Lightbulb, Mic, Square, TrendingDown, TrendingUp, X } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius, tint, ink } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { featureOn } from '@/lib/features'
import { speechSupported, useSpeech } from '../hooks/useSpeech'
import { useCategoryMemory } from '../hooks/useCategoryMemory'
import { useCategoryLabels } from '../hooks/useCategories'
import { suggestCategory } from '../lib/moneyInsights'
import { parseDump, DUMP_MAX_CHARS, type DumpItem } from '../lib/brainDump'
import type { VoiceKind } from '../lib/voiceParse'
import { lifeNow } from '../lib/zonedTime'

// "Vaciar la cabeza": todo junto en un texto (o dictado) → lista para revisar → "Guardar todo". Cada cosa se
// interpreta en el dispositivo con las reglas del dictado; nada se guarda sin pasar por la revisión.

/** Lo que se guarda: tareas e ideas en Brain, gastos e ingresos en Dinero (con la categoría sugerida u "Otros"). */
export interface DumpSaveItem extends DumpItem {
  category: string
}

const KIND_ORDER: VoiceKind[] = ['task', 'expense', 'income', 'idea']
const KIND_ICON = { task: CheckSquare, expense: TrendingDown, income: TrendingUp, idea: Lightbulb } as const
const KIND_COLOR = { task: colors.semantic.success, expense: colors.area.money, income: colors.area.money, idea: colors.area.brain } as const

const label: React.CSSProperties = { fontFamily: font, fontSize: 11, fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', margin: '0 0 8px' }
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: radius.md, background: colors.surface.high,
  border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
}
const small: React.CSSProperties = { fontFamily: font, fontSize: 12.5, color: colors.text.tertiary, margin: 0, lineHeight: 1.45 }

interface Row extends DumpItem { amountStr: string }

const toAmount = (s: string) => Math.round(Number(s.replace(',', '.')) * 100) / 100
const isMoney = (k: VoiceKind) => k === 'expense' || k === 'income'
const rowReady = (r: Row) => r.text.trim().length > 0 && (!isMoney(r.kind) || toAmount(r.amountStr) > 0)

export function BrainDumpSheet({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  /** Guarda todo; devuelve los ids que no se pudieron guardar (quedan en la lista) */
  onSave: (items: DumpSaveItem[]) => Promise<string[]>
}) {
  const t = useLifeT()
  const d = t.dump
  const lang = useAppLang(s => s.lang)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [canDictate] = useState(() => featureOn('voiceCapture') && speechSupported())
  const speech = useSpeech(langLocale(lang))
  const { stop } = speech

  // Al abrir, de cero; al cerrar, se deja de escuchar
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- se limpia al abrir */
    if (open) { setText(''); setRows(null); setError('') } else stop()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, stop])

  // Lo dictado se suma como una línea más
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- cada dictado terminado se agrega una vez */
    if (speech.final) setText(prev => (prev.trim() ? `${prev.replace(/\s+$/, '')}\n${speech.final}` : speech.final!).slice(0, DUMP_MAX_CHARS))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [speech.final])

  const review = () => {
    const items = parseDump(text, lang, lifeNow())
    if (!items.length) { setError(d.nothing); return }
    setError('')
    stop()
    setRows(items.map(i => ({ ...i, amountStr: i.amount != null ? String(i.amount) : '' })))
  }

  return (
    <LifeSheet open={open} onClose={onClose} title={d.title} maxHeight="92dvh">
      {!rows ? (
        <div>
          <p style={{ ...small, fontSize: 13.5, color: colors.text.secondary, margin: '0 0 14px' }}>{d.intro}</p>
          <label htmlFor="dump-text" style={label}>{d.label}</label>
          <textarea id="dump-text" value={text} rows={8} maxLength={DUMP_MAX_CHARS} placeholder={d.placeholder}
            aria-describedby="dump-hint" aria-invalid={!!error}
            onChange={e => { setText(e.target.value); if (error) setError('') }}
            style={{ ...field, resize: 'vertical', minHeight: 180, lineHeight: 1.5, padding: '12px 14px' }} />
          <p id="dump-hint" style={{ ...small, marginTop: 6 }}>{d.hint}</p>
          {canDictate && (
            <button type="button" onClick={() => (speech.listening ? stop() : speech.start())} aria-pressed={speech.listening}
              style={{
                marginTop: 12, minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: radius.full, cursor: 'pointer', fontFamily: font, fontSize: 14, fontWeight: 700,
                background: speech.listening ? colors.accent.default : tint(colors.accent.default, 12),
                border: `1px solid ${tint(colors.accent.default, 30)}`,
                color: speech.listening ? colors.accent.on : colors.accent.ink,
              }}>
              {speech.listening ? <Square size={15} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
              {speech.listening ? d.stopDictating : d.dictate}
            </button>
          )}
          {canDictate && (
            <p role="status" style={{ ...small, marginTop: 8, minHeight: 18 }}>
              {speech.listening ? speech.text || d.listening : speech.error === 'denied' ? t.voice.denied : speech.error === 'no-speech' ? t.voice.noSpeech : speech.error ? t.voice.failed : ''}
            </p>
          )}
          {error && <p role="alert" style={{ fontFamily: font, fontSize: 13, color: colors.semantic.error, margin: '10px 0 0' }}>{error}</p>}
          <LifeButton onClick={review} disabled={!text.trim()} style={{ width: '100%', marginTop: 16 }}>{d.review}</LifeButton>
        </div>
      ) : (
        <DumpReview rows={rows} setRows={setRows} onBack={() => setRows(null)} onSave={onSave} onDone={onClose} />
      )}
    </LifeSheet>
  )
}

/** La lista para revisar (se monta sólo al revisar: recién ahí trae categorías y memoria). */
function DumpReview({ rows, setRows, onBack, onSave, onDone }: {
  rows: Row[]
  setRows: (fn: (prev: Row[] | null) => Row[] | null) => void
  onBack: () => void
  onSave: (items: DumpSaveItem[]) => Promise<string[]>
  onDone: () => void
}) {
  const t = useLifeT()
  const d = t.dump
  const locale = langLocale(useAppLang(s => s.lang))
  const memory = useCategoryMemory(true)
  const { labelOf } = useCategoryLabels()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(0)

  const kindName = (k: VoiceKind) => (k === 'expense' ? t.tx.expense : k === 'income' ? t.tx.income : k === 'task' ? t.capture.task : t.capture.idea)
  const categoryOf = (r: Row) => (isMoney(r.kind) && memory && suggestCategory(memory, r.kind as 'income' | 'expense', r.text)) || 'Otros'
  const update = (id: string, patch: Partial<Row>) => setRows(prev => prev && prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const remove = (id: string) => setRows(prev => prev && prev.filter(r => r.id !== id))
  const cycle = (r: Row) => update(r.id, { kind: KIND_ORDER[(KIND_ORDER.indexOf(r.kind) + 1) % KIND_ORDER.length] })
  const when = (r: Row) => {
    if (!r.date) return d.noDate
    const day = new Date(`${r.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    return r.time ? `${day} · ${r.time}` : day
  }

  const ready = rows.length > 0 && rows.every(rowReady)

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    try {
      const items: DumpSaveItem[] = rows.map(r => ({
        ...r, text: r.text.trim().slice(0, 200),
        amount: isMoney(r.kind) ? toAmount(r.amountStr) : null,
        date: r.kind === 'task' ? r.date : null,
        time: r.kind === 'task' && r.date ? r.time : null,
        category: categoryOf(r),
      }))
      const failedIds = await onSave(items)
      if (!failedIds.length) { onDone(); return }
      setFailed(failedIds.length)
      setRows(prev => prev && prev.filter(r => failedIds.includes(r.id)))
    } finally { setSaving(false) }
  }

  if (!rows.length) {
    return (
      <div>
        <p style={{ ...small, fontSize: 14, color: colors.text.secondary, margin: '4px 0 16px' }}>{d.empty}</p>
        <LifeButton variant="secondary" onClick={onBack} style={{ width: '100%' }}>{d.back}</LifeButton>
      </div>
    )
  }

  return (
    <div>
      <h3 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: colors.text.primary, margin: '0 0 4px' }}>{d.found(rows.length)}</h3>
      <p style={{ ...small, margin: '0 0 12px' }}>{d.reviewHint}</p>
      {failed > 0 && <p role="alert" style={{ fontFamily: font, fontSize: 13, color: colors.semantic.error, margin: '0 0 12px' }}>{d.partial(failed)}</p>}
      <ul aria-label={d.found(rows.length)} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const Icon = KIND_ICON[r.kind]
          const c = ink(KIND_COLOR[r.kind])
          const money = isMoney(r.kind)
          const missingAmount = money && !(toAmount(r.amountStr) > 0)
          return (
            <li key={r.id} style={{ padding: 10, borderRadius: radius.lg, background: colors.surface.base, border: `1px solid ${colors.border.subtle}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => cycle(r)} aria-label={d.kindLabel(r.text || String(i + 1), kindName(r.kind))}
                  style={{
                    flexShrink: 0, minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    borderRadius: radius.full, cursor: 'pointer', fontFamily: font, fontSize: 12, fontWeight: 700,
                    background: tint(c, 12), border: `1px solid ${tint(c, 30)}`, color: c,
                  }}>
                  <Icon size={13} aria-hidden="true" /> {kindName(r.kind)}
                </button>
                <input value={r.text} maxLength={200} aria-label={d.itemText(i + 1)} onChange={e => update(r.id, { text: e.target.value })}
                  style={{ ...field, flex: 1, minWidth: 0, padding: '8px 10px' }} />
                <button type="button" onClick={() => remove(r.id)} aria-label={d.remove(r.text || String(i + 1))}
                  style={{ flexShrink: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, border: 'none', background: 'none', color: colors.text.secondary, cursor: 'pointer' }}>
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              {r.kind === 'task' && <p style={{ ...small, margin: '6px 2px 0' }}>{when(r)}</p>}
              {money && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <input value={r.amountStr} inputMode="decimal" dir="ltr" aria-label={d.amount(r.text || String(i + 1))} aria-invalid={missingAmount}
                    placeholder={t.voice.amount} onChange={e => update(r.id, { amountStr: e.target.value.replace(/[^0-9.,]/g, '') })}
                    style={{ ...field, width: 120, padding: '8px 10px', borderColor: missingAmount ? colors.semantic.error : colors.border.medium }} />
                  <span style={{ ...small, flex: 1, minWidth: 0 }}>{missingAmount ? d.noAmount : labelOf(categoryOf(r))}</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <LifeButton variant="secondary" onClick={onBack} style={{ flex: 1 }}>{d.back}</LifeButton>
        <LifeButton onClick={() => void save()} disabled={!ready || saving} style={{ flex: 1 }}>
          {saving ? t.common.saving : d.saveAll(rows.length)}
        </LifeButton>
      </div>
    </div>
  )
}
