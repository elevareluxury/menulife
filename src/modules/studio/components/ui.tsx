import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Check, ImagePlus, Trash2, X } from 'lucide-react'
import type { SaveState } from '../lib/studioTypes'
import { useStudioT } from '@/i18n/app/studio'

// ── Botón ───────────────────────────────────────────────────────────────────

export function Button({
  variant = 'secondary', size, block, loading, disabled, children, className = '', type = 'button', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm'
  block?: boolean
  loading?: boolean
}) {
  const cls = ['st-btn', `st-btn-${variant}`, size === 'sm' && 'st-btn-sm', block && 'st-btn-block', className]
    .filter(Boolean).join(' ')
  return (
    <button {...props} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && <span className="st-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

// ── Campo con label, ayuda y error ──────────────────────────────────────────

export function Field({ label, required, help, error, counter, children, htmlFor }: {
  label: ReactNode
  required?: boolean
  help?: ReactNode
  error?: string | null
  counter?: { value: number; max: number }
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="st-field">
      <label className="st-label" htmlFor={htmlFor}>
        {label}{required && <span className="st-req" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <span className="st-error" role="alert"><AlertCircle size={14} aria-hidden="true" /> {error}</span>}
      {!error && help && <span className="st-help">{help}</span>}
      {counter && <span className="st-counter">{counter.value}/{counter.max}</span>}
    </div>
  )
}

export function TextField({ label, value, onChange, required, help, error, maxLength, multiline, type = 'text', placeholder, inputMode, autoFocus, onEnter }: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  required?: boolean
  help?: ReactNode
  error?: string | null
  maxLength?: number
  multiline?: boolean
  type?: string
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoFocus?: boolean
  /** Enter en un input de una línea */
  onEnter?: () => void
}) {
  const id = useId()
  const common = {
    id, value, placeholder, maxLength, autoFocus,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  }
  return (
    <Field label={label} required={required} help={help} error={error} htmlFor={id}
      counter={multiline && maxLength ? { value: value.length, max: maxLength } : undefined}>
      {multiline
        ? <textarea className="st-textarea" rows={4} {...common} />
        : <input className="st-input" type={type} inputMode={inputMode} {...common}
            onKeyDown={onEnter ? e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } } : undefined} />}
    </Field>
  )
}

export function SelectField({ label, value, onChange, options, required, error }: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
  error?: string | null
}) {
  const id = useId()
  const t = useStudioT()
  return (
    <Field label={label} required={required} error={error} htmlFor={id}>
      <select id={id} className="st-select" value={value} onChange={e => onChange(e.target.value)}>
        {!required && <option value="">—</option>}
        {required && !value && <option value="" disabled>{t.common.chooseOption}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  )
}

// ── Interruptor accesible ───────────────────────────────────────────────────

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="st-toggle-row">
      <div>
        <p id={id} style={{ fontWeight: 500, fontSize: 14.5 }}>{label}</p>
        {description && <p className="st-help" style={{ marginTop: 2 }}>{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} disabled={disabled}
        className="st-toggle" onClick={() => onChange(!checked)}>
        <span aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Indicador de guardado (Saving / Saved / Error) ──────────────────────────

export function SaveIndicator({ state, error, onRetry }: { state: SaveState; error?: string | null; onRetry?: () => void }) {
  const t = useStudioT().common
  if (state === 'idle') return null
  if (state === 'saving') return <span className="st-save" role="status"><span className="st-spinner" aria-hidden="true" /> {t.saving}</span>
  if (state === 'saved') return <span className="st-save" role="status"><Check size={14} aria-hidden="true" /> {t.saved}</span>
  return (
    <span className="st-save is-error" role="alert">
      <AlertCircle size={14} aria-hidden="true" /> {error ?? t.saveError}
      {onRetry && <> · <button type="button" onClick={onRetry}>{t.retry}</button></>}
    </span>
  )
}

// ── Subida de imagen ────────────────────────────────────────────────────────

export function ImageField({ label, value, onUpload, onClear, shape = 'square', help }: {
  label: string
  value: string | null | undefined
  onUpload: (file: File) => Promise<void>
  onClear: () => void
  shape?: 'square' | 'round' | 'wide'
  help?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const t = useStudioT().common

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true); setError(null)
    try { await onUpload(file) }
    catch (e) { setError((e as Error).message || t.uploadError) }
    finally { setBusy(false) }
  }

  return (
    <Field label={label} help={help} error={error} htmlFor={id}>
      <div className="st-image-field">
        {value
          ? <img className={`st-image-thumb${shape === 'round' ? ' is-round' : shape === 'wide' ? ' is-wide' : ''}`} src={value} alt="" />
          : <div className={`st-image-thumb${shape === 'round' ? ' is-round' : shape === 'wide' ? ' is-wide' : ''}`} aria-hidden="true" />}
        <div className="st-row" style={{ flexWrap: 'wrap' }}>
          <Button size="sm" loading={busy} onClick={() => ref.current?.click()}>
            <ImagePlus size={15} aria-hidden="true" /> {value ? t.change : t.upload}
          </Button>
          {value && !busy && (
            <Button size="sm" variant="ghost" onClick={onClear} aria-label={t.removeLabel(label.toLowerCase())}>
              <Trash2 size={15} aria-hidden="true" /> {t.remove}
            </Button>
          )}
        </div>
        <input id={id} ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden
          onChange={e => { void handle(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </Field>
  )
}

// ── Drawer (panel lateral) ──────────────────────────────────────────────────

export function Drawer({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()
  const t = useStudioT().common
  useEscape(onClose)
  return (
    <div className="st-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="st-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="st-drawer-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="st-icon-btn" onClick={onClose} aria-label={t.close}><X size={18} /></button>
        </div>
        <div className="st-drawer-body">{children}</div>
        {footer && <div className="st-drawer-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ── Diálogo de confirmación ─────────────────────────────────────────────────

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel, loading }: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  const titleId = useId()
  const t = useStudioT().common
  useEscape(onCancel)
  return (
    <div className="st-dialog-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="st-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="st-row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel} autoFocus>{t.cancel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

function useEscape(onEscape: () => void) {
  const cb = useRef(onEscape)
  useEffect(() => { cb.current = onEscape })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cb.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="st-topbar">
      <div>
        <h1 className="st-title">{title}</h1>
        {subtitle && <p className="st-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="st-row">{actions}</div>}
    </div>
  )
}
