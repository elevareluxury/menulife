import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '@/design/components/Field'
import { subscribeProfile, type SubscribeResult } from '../lib/profileApi'
import { tr } from '../lib/profileI18n'
import { subscribeStrings } from '../lib/subscribeI18n'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'

type Status = 'idle' | 'sending' | 'sent' | 'error' | Exclude<SubscribeResult, 'ok' | 'not_found'>

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * "Suscribirse" (módulos de bio, V1.1): el visitante deja su email (y su nombre si el dueño lo pide) con
 * consentimiento explícito. La lista queda en Studio → Suscriptores; Mycen no le manda nada.
 * Contra bots, igual que el formulario de contacto: campo trampa y 3 segundos mínimos (lo controla la base).
 */
export function SubscribeModule({ module, lang, onAction }: ModuleProps) {
  const t = subscribeStrings(lang)
  const ctx = useProfileModule()
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const consentId = useId()
  const owner = ctx?.displayName?.trim() || (ctx?.handle ? `@${ctx.handle}` : 'Mycen')
  const askName = module.content.ask_name === true
  const title = tr(module.title, module.translations, 'title', lang) || t.title
  const text = tr(typeof module.content.text === 'string' ? module.content.text : '', module.translations, 'text', lang)
  const button = tr(typeof module.content.button === 'string' ? module.content.button : '', module.translations, 'button', lang) || t.send
  const headingId = `sub-${module.id}`

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!ctx || ctx.preview || status === 'sending') return
    if (!EMAIL_RE.test(email.trim()) || email.trim().length > 254) { setStatus('invalid'); return }
    if (!consent) { setStatus('consent_required'); return }
    setStatus('sending')
    try {
      const r = await subscribeProfile(ctx.handle, {
        moduleId: module.id, email: email.trim(), name: askName ? name.trim() : '', consent, trap,
        elapsedMs: Date.now() - startedAt.current, locale: lang,
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
        <p className="mp-form-done" role="status">{t.done}</p>
        <p className="mp-form-note">{t.note(owner)}</p>
      </section>
    )
  }

  const errorText = status === 'invalid' ? t.invalid
    : status === 'consent_required' ? t.consentRequired
    : status === 'rate_limited' ? t.limit
    : status === 'full' ? t.full
    : status === 'error' ? t.error
    : null

  return (
    <section className="mp-card mp-form" aria-labelledby={headingId}>
      <h2 id={headingId} className="mp-form-title">{title}</h2>
      {text && <p className="mp-form-intro">{text}</p>}
      <form onSubmit={send} noValidate className="mp-form-fields">
        <Field label={t.email} type="email" inputMode="email" autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)} maxLength={254} required />
        {askName && (
          <Field label={t.name} value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" />
        )}
        <label className="mp-sub-consent" htmlFor={consentId}>
          <input id={consentId} type="checkbox" checked={consent} required
            onChange={e => { setConsent(e.target.checked); if (status === 'consent_required') setStatus('idle') }} />
          <span>{t.consent(owner)}</span>
        </label>
        {/* Trampa para bots: una persona no la ve ni la completa */}
        <div className="mp-form-trap" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></label>
        </div>
        {errorText && <p className="mp-form-error" role="alert">{errorText}</p>}
        <button type="submit" className="mp-primary" disabled={status === 'sending' || !!ctx?.preview}>
          {status === 'sending' ? t.sending : button}
        </button>
        <p className="mp-form-note">
          {ctx?.preview ? t.preview : <a className="mp-sub-privacy" href="/privacidad#datos" target="_blank" rel="noopener noreferrer">{t.privacy}</a>}
        </p>
      </form>
    </section>
  )
}
