import { useId, useState } from 'react'
import { Users, X } from 'lucide-react'
import { colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { cleanPerson, emptyDraft, MAX_PEOPLE, ME, personKey, planSplit, type SharedDraft } from '../lib/splits'
import { planMessage } from '../lib/splitMessage'

// "Compartido" en el formulario de un gasto nuevo: quién pagó, con quién y cómo se divide.
// Sin nada posicionado (los menús "⋯" de Dinero no quedan tapados).

const label: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em',
  textTransform: 'uppercase', display: 'block', margin: '0 0 8px',
}

const field: React.CSSProperties = {
  padding: '10px 14px', boxSizing: 'border-box', borderRadius: radius.md, background: colors.surface.high,
  border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: 16, outline: 'none',
}

function Pill({ checked, onClick, children, role = 'radio', label: aria }: {
  checked: boolean; onClick: () => void; children: React.ReactNode; role?: 'radio' | 'button'; label?: string
}) {
  return (
    <button type="button" role={role} aria-checked={role === 'radio' ? checked : undefined} aria-label={aria} onClick={onClick}
      style={{
        minHeight: 40, padding: '6px 14px', borderRadius: radius.full, cursor: 'pointer',
        background: checked ? colors.accent.soft : colors.surface.high,
        border: `1px solid ${checked ? colors.accent.default : colors.border.subtle}`,
        color: checked ? colors.accent.ink : colors.text.secondary,
        fontFamily: font, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
      {children}
    </button>
  )
}

export function SharedExpenseFields({ total, currency, locale, value, onChange, knownPeople }: {
  /** Total escrito en el monto (NaN si todavía no hay) */
  total: number
  currency: string
  locale: string
  /** null = no es compartido */
  value: SharedDraft | null
  onChange: (v: SharedDraft | null) => void
  /** Nombres ya usados, el más reciente primero */
  knownPeople: string[]
}) {
  const t = useLifeT()
  const s = t.shared
  const id = useId()
  const [typed, setTyped] = useState('')

  if (!value) {
    return (
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '16px', padding: '12px 14px', cursor: 'pointer',
        borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
      }}>
        <input type="checkbox" checked={false} onChange={() => onChange(emptyDraft())}
          style={{ width: 18, height: 18, marginTop: 2, accentColor: colors.accent.default }} />
        <span style={{ fontFamily: font }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
            <Users size={14} aria-hidden="true" /> {s.toggle}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>{s.toggleHint}</span>
        </span>
      </label>
    )
  }

  const draft = value
  const set = (patch: Partial<SharedDraft>) => onChange({ ...draft, ...patch })
  const payerIsMe = draft.payer === ME
  const has = (name: string) => draft.people.some(p => personKey(p) === personKey(name))

  const add = (raw: string) => {
    const name = cleanPerson(raw)
    if (!name || has(name) || personKey(name) === personKey(s.me) || draft.people.length >= MAX_PEOPLE) { setTyped(''); return }
    const people = [...draft.people, name]
    set({ people, payer: !payerIsMe && !draft.payer ? name : draft.payer })
    setTyped('')
  }
  const removePerson = (name: string) => {
    const people = draft.people.filter(p => p !== name)
    const manual = { ...draft.manual }
    delete manual[name]
    const payer = draft.payer === name ? (people[0] ?? '') : draft.payer
    set({ people, manual, payer })
  }

  const q = personKey(typed)
  const suggestions = knownPeople.filter(n => !has(n) && (!q || personKey(n).includes(q))).slice(0, 6)
  const plan = planSplit(total, draft)
  const msg = planMessage(plan, t, currency, locale)
  const participants = [ME, ...draft.people]

  return (
    <fieldset style={{
      margin: '0 0 16px', padding: '12px 14px', borderRadius: radius.md, minWidth: 0,
      background: colors.accent.muted, border: `1px solid ${colors.accent.default}`,
    }}>
      <legend className="sr-only">{s.toggle}</legend>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
        <input type="checkbox" checked onChange={() => onChange(null)}
          style={{ width: 18, height: 18, accentColor: colors.accent.default }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
          <Users size={14} aria-hidden="true" /> {s.toggle}
        </span>
      </label>

      <span id={`${id}-payer`} style={label}>{s.whoPaid}</span>
      <div role="radiogroup" aria-labelledby={`${id}-payer`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <Pill checked={payerIsMe} onClick={() => set({ payer: ME })}>{s.me}</Pill>
        <Pill checked={!payerIsMe} onClick={() => { if (payerIsMe) set({ payer: draft.people[0] ?? '' }) }}>{s.otherPerson}</Pill>
      </div>

      <label htmlFor={`${id}-person`} style={label}>{s.people}</label>
      {draft.people.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {draft.people.map(p => (
            <li key={p} style={{
              display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 0 0 12px', borderRadius: radius.full,
              background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, fontFamily: font, fontSize: 14,
              fontWeight: 600, color: colors.text.primary,
            }}>
              {p}
              <button type="button" onClick={() => removePerson(p)} aria-label={s.removePerson(p)} title={s.removePerson(p)}
                style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', color: colors.text.tertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input id={`${id}-person`} value={typed} maxLength={40} placeholder={s.personPlaceholder} autoComplete="off"
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(typed) } }}
          style={{ ...field, flex: 1, minWidth: 0 }} />
        <button type="button" onClick={() => add(typed)} disabled={!cleanPerson(typed)}
          style={{
            minHeight: 44, padding: '0 16px', borderRadius: radius.md, cursor: cleanPerson(typed) ? 'pointer' : 'default',
            background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary,
            fontFamily: font, fontSize: 14, fontWeight: 700, opacity: cleanPerson(typed) ? 1 : 0.5,
          }}>
          {s.addPerson}
        </button>
      </div>
      {suggestions.length > 0 && (
        <div role="group" aria-label={s.suggestions} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {suggestions.map(n => (
            <Pill key={n} role="button" checked={false} onClick={() => add(n)}>+ {n}</Pill>
          ))}
        </div>
      )}

      {!payerIsMe && draft.people.length > 1 && (
        <>
          <span id={`${id}-who`} style={{ ...label, marginTop: 6 }}>{s.whichPerson}</span>
          <div role="radiogroup" aria-labelledby={`${id}-who`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {draft.people.map(p => (
              <Pill key={p} checked={personKey(draft.payer) === personKey(p)} onClick={() => set({ payer: p })}>{p}</Pill>
            ))}
          </div>
        </>
      )}

      <span id={`${id}-how`} style={{ ...label, marginTop: 6 }}>{s.howSplit}</span>
      <div role="radiogroup" aria-labelledby={`${id}-how`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Pill checked={draft.mode === 'equal'} onClick={() => set({ mode: 'equal' })}>{s.equal}</Pill>
        <Pill checked={draft.mode === 'manual'} onClick={() => set({ mode: 'manual' })}>{s.manual}</Pill>
      </div>

      {draft.mode === 'manual' && draft.people.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {participants.map(p => {
            const name = p === ME ? s.myPart : s.partOf(p)
            return (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: font, fontSize: 14, color: colors.text.secondary }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                <input type="text" inputMode="decimal" dir="ltr" value={draft.manual[p] ?? ''} placeholder="0" aria-label={name}
                  onChange={e => set({ manual: { ...draft.manual, [p]: e.target.value.replace(/[^0-9.,]/g, '') } })}
                  style={{ ...field, width: 130, textAlign: 'end' }} />
              </label>
            )
          })}
        </div>
      )}

      <div role="status" aria-live="polite" style={{ fontFamily: font, fontSize: 13, lineHeight: 1.5 }}>
        {msg.lines.map((line, i) => (
          <p key={i} style={{
            margin: 0, fontWeight: msg.ok && i < msg.lines.length - 1 ? 700 : 500,
            color: msg.ok && i < msg.lines.length - 1 ? colors.text.primary : colors.text.secondary,
          }}>{line}</p>
        ))}
      </div>
    </fieldset>
  )
}
