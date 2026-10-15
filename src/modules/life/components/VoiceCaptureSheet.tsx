import { useEffect, useState } from 'react'
import { Mic, RotateCcw } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius, tint } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { useSpeech } from '../hooks/useSpeech'
import { parseVoice, type VoiceKind, type VoiceResult } from '../lib/voiceParse'

// V1.1 (beta voiceCapture): dictar y confirmar. Se guarda sólo después de que la persona lo revisa.

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: radius.md, background: colors.surface.high,
  border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', colorScheme: 'inherit',
}
const label: React.CSSProperties = { fontFamily: font, fontSize: 11, fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' }

export function VoiceCaptureSheet({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (r: VoiceResult) => Promise<void>
}) {
  const t = useLifeT()
  const v = t.voice
  const lang = useAppLang(s => s.lang)
  const speech = useSpeech(langLocale(lang))
  const [draft, setDraft] = useState<VoiceResult | null>(null)
  const [amountStr, setAmountStr] = useState('')
  const [saving, setSaving] = useState(false)
  const { start, stop } = speech

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- arranca a escuchar al abrir y se limpia al cerrar */
    if (open) { setDraft(null); start() } else stop()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, start, stop])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- el texto final se interpreta una vez */
    if (speech.final) {
      const r = parseVoice(speech.final, lang)
      setDraft(r)
      setAmountStr(r.amount != null ? String(r.amount) : '')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [speech.final, lang])

  const kinds: [VoiceKind, string][] = [['expense', t.tx.expense], ['income', t.tx.income], ['task', t.capture.task], ['idea', t.capture.idea]]
  const money = draft?.kind === 'expense' || draft?.kind === 'income'
  const amount = Number(amountStr.replace(',', '.'))
  const canSave = !!draft && draft.text.trim().length > 0 && (!money || amount > 0)

  async function save() {
    if (!draft || !canSave) return
    setSaving(true)
    try {
      await onSave({ ...draft, text: draft.text.trim(), amount: money ? Math.round(amount * 100) / 100 : null })
      onClose()
    } finally { setSaving(false) }
  }

  const errorText = speech.error === 'denied' ? v.denied : speech.error === 'no-speech' ? v.noSpeech : speech.error ? v.failed : ''

  return (
    <LifeSheet open={open} onClose={onClose} title={v.title}>
      {!draft && (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <button type="button" onClick={() => (speech.listening ? stop() : start())} aria-label={speech.listening ? v.stop : v.retry} aria-pressed={speech.listening}
            className={speech.listening ? 'life-pop' : undefined}
            style={{
              width: 76, height: 76, borderRadius: radius.full, border: 'none', cursor: 'pointer',
              background: speech.listening ? colors.accent.default : tint(colors.accent.default, 14),
              color: speech.listening ? colors.accent.on : colors.accent.ink,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: speech.listening ? `0 0 0 10px ${tint(colors.accent.default, 14)}` : 'none',
            }}>
            <Mic size={30} aria-hidden="true" />
          </button>
          <p role="status" style={{ fontFamily: font, fontSize: 15, fontWeight: 600, color: colors.text.primary, margin: '14px 0 6px', minHeight: 22 }}>
            {speech.text || (speech.listening ? v.listening : errorText)}
          </p>
          {!speech.text && <p style={{ fontFamily: font, fontSize: 12.5, color: colors.text.tertiary, margin: 0, lineHeight: 1.5 }}>{v.hint}</p>}
        </div>
      )}

      {draft && (
        <div>
          <p style={{ fontFamily: font, fontSize: 12.5, color: colors.text.tertiary, margin: '0 0 12px' }}>
            {v.heard} “{speech.final}”
          </p>
          <p style={label}>{v.what}</p>
          <div role="radiogroup" aria-label={v.what} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {kinds.map(([k, text]) => (
              <button key={k} type="button" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })}
                style={{
                  minHeight: 36, padding: '6px 14px', borderRadius: radius.full, cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 700,
                  background: draft.kind === k ? colors.accent.soft : colors.surface.high,
                  border: `1px solid ${draft.kind === k ? colors.accent.default : colors.border.subtle}`,
                  color: draft.kind === k ? colors.accent.ink : colors.text.secondary,
                }}>{text}</button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="voice-text" style={label}>{v.text}</label>
            <input id="voice-text" value={draft.text} maxLength={200} onChange={e => setDraft({ ...draft, text: e.target.value })} style={field} />
          </div>
          {money && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="voice-amount" style={label}>{v.amount}</label>
              <input id="voice-amount" inputMode="decimal" dir="ltr" value={amountStr} onChange={e => setAmountStr(e.target.value.replace(/[^0-9.,]/g, ''))} style={field} />
            </div>
          )}
          {draft.kind === 'task' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="voice-date" style={label}>{v.date}</label>
                <input id="voice-date" type="date" value={draft.date ?? ''} onChange={e => setDraft({ ...draft, date: e.target.value || null })} style={field} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="voice-time" style={label}>{v.time}</label>
                <input id="voice-time" type="time" value={draft.time ?? ''} disabled={!draft.date} onChange={e => setDraft({ ...draft, time: e.target.value || null })} style={field} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <LifeButton variant="secondary" onClick={() => { setDraft(null); start() }} style={{ flex: 1 }}>
              <RotateCcw size={15} aria-hidden="true" /> {v.retry}
            </LifeButton>
            <LifeButton onClick={() => void save()} disabled={!canSave || saving} style={{ flex: 1 }}>
              {saving ? t.common.saving : v.save}
            </LifeButton>
          </div>
        </div>
      )}
    </LifeSheet>
  )
}
