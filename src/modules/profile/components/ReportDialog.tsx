import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { reportProfile, type ReportResult } from '../lib/profileApi'
import { REPORT_REASONS, ui, type ReportReason } from '../lib/profileI18n'
import type { ProfileLang } from '../lib/profileTypes'

/** "Denunciar" (Identity Fase 8): botón discreto + diálogo con motivo y detalle. Sin cuenta. */
export function ReportButton({ username, projectSlug, lang }: { username: string; projectSlug?: string; lang: ProfileLang }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const t = ui(lang)
  return (
    <>
      <button ref={trigger} type="button" className="mp-report-link" onClick={() => setOpen(true)}>{t.report}</button>
      {open && (
        <ReportDialog username={username} projectSlug={projectSlug} lang={lang}
          onClose={() => { setOpen(false); trigger.current?.focus() }} />
      )}
    </>
  )
}

function ReportDialog({ username, projectSlug, lang, onClose }: {
  username: string; projectSlug?: string; lang: ProfileLang; onClose: () => void
}) {
  const t = ui(lang)
  const titleId = useId()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | ReportResult | 'error'>('idle')
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function send() {
    if (!reason) return
    setState('sending')
    try {
      setState(await reportProfile(username, reason, details.trim(), projectSlug))
    } catch {
      setState('error')
    }
  }

  const done = state === 'ok' || state === 'duplicate' || state === 'own_profile' || state === 'not_found'
  const message = state === 'ok' || state === 'own_profile' || state === 'not_found' ? t.reportThanks
    : state === 'duplicate' ? t.reportDuplicate
      : state === 'rate_limited' ? t.reportLimit
        : state === 'error' || state === 'invalid' ? t.reportError : null

  return (
    <div className="mp-dialog-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="mp-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mp-dialog-head">
          <h2 id={titleId}>{projectSlug ? t.reportProjectTitle : t.reportTitle}</h2>
          <button type="button" className="mp-icon-btn" onClick={onClose} aria-label={t.close}><X size={18} /></button>
        </div>
        {done ? (
          <>
            <p role="status">{message}</p>
            <button type="button" className="mp-primary" onClick={onClose}>{t.close}</button>
          </>
        ) : (
          <>
            <p className="mp-dialog-intro">
              {t.reportIntro}{' '}
              <a href="/terminos#reglas" target="_blank" rel="noopener noreferrer">{t.rules}</a>
            </p>
            <fieldset className="mp-report-reasons">
              <legend>{t.reportReason}</legend>
              {REPORT_REASONS.map((r, i) => (
                <label key={r}>
                  <input ref={i === 0 ? first : undefined} type="radio" name="report-reason" value={r}
                    checked={reason === r} onChange={() => setReason(r)} />
                  {t.reportReasons[r]}
                </label>
              ))}
            </fieldset>
            <label className="mp-report-details">
              {t.reportDetails}
              <textarea rows={3} maxLength={1000} value={details} onChange={e => setDetails(e.target.value)} />
            </label>
            {message && <p className="mp-report-error" role="alert">{message}</p>}
            <div className="mp-dialog-actions">
              <button type="button" className="mp-btn-ghost" onClick={onClose}>{t.cancel}</button>
              <button type="button" className="mp-primary" disabled={!reason || state === 'sending'} onClick={send}>
                {state === 'sending' ? t.reportSending : t.reportSend}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
