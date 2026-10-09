import { useId } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldBase {
  /** Etiqueta real (<label>), siempre visible */
  label: string
  hint?: string
  error?: string
}
type InputField = FieldBase & InputHTMLAttributes<HTMLInputElement> & { multiline?: false }
type TextareaField = FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true }
export type FieldProps = InputField | TextareaField

/** Campo con label real, ayuda y error anunciados (aria-describedby). 46 px de alto y texto de 16 px. */
export function Field(props: FieldProps) {
  const auto = useId()
  const { label, hint, error, multiline, id = auto, className, ...rest } = props
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const described = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    className: ['my-field-input', className].filter(Boolean).join(' '),
    'aria-describedby': described,
    'aria-invalid': error ? true : undefined,
  }
  return (
    <div className="my-field">
      <label className="my-field-label" htmlFor={id}>{label}</label>
      {multiline
        ? <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} {...common} />
        : <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} {...common} />}
      {hint && <span id={hintId} className="my-field-hint">{hint}</span>}
      {error && <span id={errorId} className="my-field-error" role="alert">{error}</span>}
    </div>
  )
}
