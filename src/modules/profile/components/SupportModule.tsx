import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Coffee, Copy, HeartHandshake, Landmark, Link2, Wallet } from 'lucide-react'
import { tr } from '../lib/profileI18n'
import { isCopyKind, readSupportMethods, SUPPORT_BRAND, supportHref, type SupportKind, type SupportMethod } from '../lib/support'
import { supportListenStrings } from '../lib/supportListenI18n'
import type { ModuleProps } from './ProfileModules'
import './supportListen.css'

const ICONS: Record<SupportKind, typeof Wallet> = {
  mercadopago: Wallet, paypal: Wallet, kofi: Coffee, buymeacoffee: Coffee, pix: Landmark, alias: Landmark, link: Link2,
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * "Apoyame" (V1.1): cómo apoyar o pagarle a la persona. Los links llevan a su cuenta en cada plataforma y el alias o
 * la clave Pix se copian. Mycen no cobra ni procesa pagos: acá no se piden montos ni datos de nadie.
 */
export function SupportModule({ module, lang, onAction }: ModuleProps) {
  const t = supportListenStrings(lang)
  const methods = readSupportMethods(module.content.methods)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!methods.length) return null

  const title = tr(module.title, module.translations, 'title', lang) || t.supportTitle
  const message = tr(str(module.content.message), module.translations, 'message', lang)
  const amounts = tr(str(module.content.amounts), module.translations, 'amounts', lang)
  const headingId = `support-${module.id}`

  const nameOf = (m: SupportMethod) => {
    if (m.label) return m.label
    if (m.kind === 'alias') return t.supportAlias
    if (m.kind === 'pix') return t.supportPix
    return SUPPORT_BRAND[m.kind] ?? new URL(m.value).hostname.replace(/^www\./, '')
  }

  async function copy(value: string) {
    let ok = false
    try {
      await navigator.clipboard.writeText(value)
      ok = true
    } catch { /* clipboard no disponible */ }
    // Se vacía y se vuelve a poner para que el lector de pantalla lo anuncie también la segunda vez
    setStatus('')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setStatus(ok ? t.copied : t.copyFailed)
      timer.current = setTimeout(() => setStatus(''), 4000)
    }, 30)
    if (ok) onAction(module.id)
  }

  // El primer link va con el color de acento
  const firstLink = methods.findIndex(m => !isCopyKind(m.kind))
  return (
    <section className="mp-card mp-support" aria-labelledby={headingId}>
      <div className="mp-support-head">
        <span className="mp-support-badge" aria-hidden="true"><HeartHandshake size={20} /></span>
        <h2 id={headingId} className="mp-support-title">{title}</h2>
      </div>
      {message && <p className="mp-support-message">{message}</p>}
      {amounts && <p className="mp-support-amounts"><span>{t.suggested}</span> {amounts}</p>}
      <div className="mp-support-list">
        {methods.map((m, i) => {
          const Icon = ICONS[m.kind]
          const name = nameOf(m)
          if (isCopyKind(m.kind)) {
            return (
              <div key={i} className="mp-support-copy">
                <span className="mp-support-icon" aria-hidden="true"><Icon size={18} /></span>
                <span className="mp-support-copy-text">
                  <span className="mp-support-copy-label">{name}</span>
                  <span className="mp-support-value" translate="no">{m.value}</span>
                </span>
                <button type="button" className="mp-support-copy-btn" aria-label={t.copyAria.replace('{label}', name)}
                  onClick={() => copy(m.value)}>
                  <Copy size={16} aria-hidden="true" /> {t.copy}
                </button>
              </div>
            )
          }
          const href = supportHref(m.kind, m.value)
          if (!href) return null
          return (
            <a key={i} className={`mp-support-link${i === firstLink ? ' is-primary' : ''}`} href={href} target="_blank" rel="noopener noreferrer"
              onClick={() => onAction(module.id)}>
              <span className="mp-support-icon" aria-hidden="true"><Icon size={18} /></span>
              <span className="mp-support-link-name">{name}</span>
              <ArrowUpRight size={18} aria-hidden="true" className="mp-support-arrow" />
            </a>
          )
        })}
      </div>
      <p className="mp-support-status" role="status" aria-live="polite">{status}</p>
      <p className="mp-support-note">{t.supportNote}</p>
    </section>
  )
}
