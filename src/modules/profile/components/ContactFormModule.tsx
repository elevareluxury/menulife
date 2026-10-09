import { useEffect, useRef, useState } from 'react'
import { Field } from '@/design/components/Field'
import { submitProfileMessage, type MessageResult } from '../lib/profileApi'
import { tr } from '../lib/profileI18n'
import { contactFormStrings } from '../lib/contactFormI18n'
import type { ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'

type Status = 'idle' | 'sending' | 'sent' | 'error' | Exclude<MessageResult, 'ok' | 'not_found'>

/**
 * Formulario de contacto (V1 · etapa 05): el mensaje llega a la bandeja de Studio (no se manda ningún email).
 * Contra bots: un campo trampa que una persona no ve ni completa, y un tiempo mínimo de 3 segundos (lo controla la
 * base, que a los bots les responde "ok" sin guardar nada).
 */
export function ContactFormModule({ module, lang, onAction }: ModuleProps) {
  const t = contactFormStrings(lang)
  const ctx = useProfileModule()
  // Cuándo empezó a completarlo (la base descarta lo que se envía en menos de 3 s)
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const title = tr(module.title, module.translations, 'title', lang) || t.formTitle
  const intro = tr(typeof module.content.intro === 'string' ? module.content.intro : '', module.translations, 'intro', lang)
  const headingId = `cf-${module.id}`

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!ctx || ctx.preview || status === 'sending') return
    if (!name.trim() || contact.trim().length < 3 || !message.trim()) { setStatus('invalid'); return }
    setStatus('sending')
    try {
      const r = await submitProfileMessage(ctx.handle, {
        name: name.trim(), contact: contact.trim(), message: message.trim(), trap, elapsedMs: Date.now() - startedAt.current,
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
        <p className="mp-form-done" role="status">{t.formSent}</p>
        <button type="button" className="mp-btn-ghost" onClick={() => {
          setMessage(''); setStatus('idle'); startedAt.current = Date.now()
        }}>{t.formSendAnother}</button>
      </section>
    )
  }

  const errorText = status === 'invalid' ? t.formInvalid
    : status === 'too_many_links' ? t.formLinks
    : status === 'rate_limited' ? t.formLimit
    : status === 'error' ? t.formError
    : null

  return (
    <section className="mp-card mp-form" aria-labelledby={headingId}>
      <h2 id={headingId} className="mp-form-title">{title}</h2>
      {intro && <p className="mp-form-intro">{intro}</p>}
      <form onSubmit={send} noValidate className="mp-form-fields">
        <Field label={t.formName} value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" required />
        <Field label={t.formContact} value={contact} onChange={e => setContact(e.target.value)} maxLength={120} autoComplete="email" required />
        <Field label={t.formMessage} multiline value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} required />
        {/* Trampa para bots: una persona no la ve ni la completa */}
        <div className="mp-form-trap" aria-hidden="true">
          <label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={e => setTrap(e.target.value)} /></label>
        </div>
        {errorText && <p className="mp-form-error" role="alert">{errorText}</p>}
        <button type="submit" className="mp-primary" disabled={status === 'sending' || !!ctx?.preview}>
          {status === 'sending' ? t.formSending : t.formSend}
        </button>
        <p className="mp-form-note">{ctx?.preview ? t.formPreview : t.formPrivate}</p>
      </form>
    </section>
  )
}
