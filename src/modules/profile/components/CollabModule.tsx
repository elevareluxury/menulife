import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '@/design/components/Field'
import { submitProfileCollab, type MessageResult } from '../lib/profileApi'
import { tr } from '../lib/profileI18n'
import { collabStrings } from '../lib/collabI18n'
import { COLLAB_DELIVERABLES, collabWebsite, isCollabDeliverable } from '../lib/collab'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'bad_website' | 'bad_deadline' | Exclude<MessageResult, 'ok' | 'not_found'>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Hoy en el dispositivo, AAAA-MM-DD (mínimo de la fecha límite) */
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Colaboraciones (V1.1): una marca propone una colaboración. Llega a Studio → Mensajes como "Colaboración" (no se
 * manda ningún email). Mismos controles que el formulario de contacto: campo trampa y 3 segundos mínimos (la base a
 * los bots les responde "ok" sin guardar nada); los límites por día cuentan mensajes y propuestas juntos.
 */
export function CollabModule({ module, lang, onAction }: ModuleProps) {
  const t = collabStrings(lang)
  const ctx = useProfileModule()
  const selectId = useId()
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [deliverable, setDeliverable] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  // Arranca cerrado: título, invitación y un botón; el formulario (8 campos) se abre en el lugar al tocarlo
  const [open, setOpen] = useState(false)
  const firstField = useRef<HTMLDivElement>(null)
  useEffect(() => { if (open) firstField.current?.querySelector('input')?.focus({ preventScroll: true }) }, [open])
  const text = (key: string) => tr(typeof module.content[key] === 'string' ? module.content[key] as string : '', module.translations, key, lang)
  const title = tr(module.title, module.translations, 'title', lang) || t.title
  const intro = text('intro')
  const rates = text('rates')
  const button = text('button') || t.send
  const headingId = `collab-${module.id}`

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!ctx || ctx.preview || status === 'sending') return
    if (!name.trim() || !EMAIL_RE.test(email.trim()) || !company.trim() || !isCollabDeliverable(deliverable) || !message.trim()) {
      setStatus('invalid'); return
    }
    if (website.trim() && !collabWebsite(website)) { setStatus('bad_website'); return }
    if (deadline && deadline < localToday()) { setStatus('bad_deadline'); return }
    setStatus('sending')
    try {
      const r = await submitProfileCollab(ctx.handle, {
        name: name.trim(), email: email.trim(), company: company.trim(), website: website.trim(), deliverable,
        budget: budget.trim(), deadline, message: message.trim(), trap, elapsedMs: Date.now() - startedAt.current,
      })
      if (r === 'ok') {
        setStatus('sent')
        onAction(module.id)
      } else {
        setStatus(r === 'not_found' ? 'error' : r)
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <section className="mp-card mp-form" aria-labelledby={headingId}>
        <h2 id={headingId} className="mp-form-title">{title}</h2>
        <p className="mp-form-done" role="status">{t.sent}</p>
        <button type="button" className="mp-btn-ghost" onClick={() => {
          setMessage(''); setStatus('idle'); startedAt.current = Date.now()
        }}>{t.sendAnother}</button>
      </section>
    )
  }

  const errorText = status === 'invalid' ? t.invalid
    : status === 'bad_website' ? t.badWebsite
    : status === 'bad_deadline' ? t.badDeadline
    : status === 'too_many_links' ? t.links
    : status === 'rate_limited' ? t.limit
    : status === 'error' ? t.error
    : null

  return (
    <section className="mp-card mp-form" aria-labelledby={headingId}>
      <h2 id={headingId} className="mp-form-title">{title}</h2>
      {intro && <p className="mp-form-intro">{intro}</p>}
      {rates && <p className="mp-collab-rates">{rates}</p>}
      {!open ? (
        <button type="button" className="mp-primary" aria-expanded={false} onClick={() => setOpen(true)}>
          {text('button') || t.propose}
        </button>
      ) : (
      <form onSubmit={send} noValidate className="mp-form-fields">
        <div ref={firstField} className="mp-form-first"><Field label={t.name} value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" required /></div>
        <Field label={t.email} type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} autoComplete="email" required />
        <Field label={t.company} value={company} onChange={e => setCompany(e.target.value)} maxLength={120} autoComplete="organization" required />
        <Field label={t.website} hint={t.websiteHint} type="url" inputMode="url" value={website} onChange={e => setWebsite(e.target.value)}
          maxLength={300} autoComplete="url" placeholder="https://" />
        <div className="my-field">
          <label className="my-field-label" htmlFor={selectId}>{t.deliverable}</label>
          <select id={selectId} className="my-field-input" value={deliverable} onChange={e => setDeliverable(e.target.value)} required>
            <option value="" disabled>{t.choose}</option>
            {COLLAB_DELIVERABLES.map(d => <option key={d} value={d}>{t.deliverables[d]}</option>)}
          </select>
        </div>
        <Field label={t.budget} hint={t.budgetHint} value={budget} onChange={e => setBudget(e.target.value)} maxLength={60} />
        <Field label={t.deadline} type="date" value={deadline} min={localToday()} onChange={e => setDeadline(e.target.value)} />
        <Field label={t.message} multiline value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} required />
        {/* Trampa para bots: una persona no la ve ni la completa */}
        <div className="mp-form-trap" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></label>
        </div>
        {errorText && <p className="mp-form-error" role="alert">{errorText}</p>}
        <button type="submit" className="mp-primary" disabled={status === 'sending' || !!ctx?.preview}>
          {status === 'sending' ? t.sending : button}
        </button>
        <p className="mp-form-note">{ctx?.preview ? t.preview : t.private}</p>
      </form>
      )}
    </section>
  )
}
