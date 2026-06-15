import { Star } from 'lucide-react'
import type { FormField } from '../../forms/formTypes'
import { FIELD_TYPE_CONFIG } from '../../forms/formTypes'
import { getFieldOptions } from '../../forms/formUtils'

interface FormRendererProps {
  fields:   FormField[]
  values:   Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  readonly?: boolean
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25 disabled:opacity-50"
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }

export function FormRenderer({ fields, values, onChange, readonly = false }: FormRendererProps) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Este formulario no tiene campos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {fields.map(field => {
        const value   = values[field.id]
        const options = getFieldOptions(field)
        const cfg     = FIELD_TYPE_CONFIG[field.type]
        const Icon    = cfg.icon

        return (
          <div key={field.id}>
            {/* Label */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <label className="text-sm font-semibold text-white">
                {field.label}
                {field.required && <span className="ml-1" style={{ color: '#F4705A' }}>*</span>}
              </label>
            </div>
            {field.help_text && (
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{field.help_text}</p>
            )}

            {/* Input */}
            {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'url') && (
              <input
                type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
                value={(value as string) ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                placeholder={field.placeholder ?? ''}
                disabled={readonly}
                className={inputCls}
                style={inputStyle}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                value={(value as string) ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                placeholder={field.placeholder ?? ''}
                rows={(field.settings_json?.rows as number) ?? 4}
                disabled={readonly}
                className={`${inputCls} resize-none`}
                style={inputStyle}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={(value as number) ?? ''}
                onChange={e => onChange(field.id, e.target.value ? Number(e.target.value) : '')}
                placeholder={field.placeholder ?? ''}
                min={(field.settings_json?.min as number) ?? undefined}
                max={(field.settings_json?.max as number) ?? undefined}
                step={(field.settings_json?.step as number) ?? 1}
                disabled={readonly}
                className={inputCls}
                style={inputStyle}
              />
            )}

            {field.type === 'currency' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {(field.settings_json?.currency as string) ?? 'ARS'}
                </span>
                <input
                  type="number"
                  value={(value as number) ?? ''}
                  onChange={e => onChange(field.id, e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  disabled={readonly}
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                />
              </div>
            )}

            {(field.type === 'date' || field.type === 'datetime') && (
              <input
                type={field.type === 'datetime' ? 'datetime-local' : 'date'}
                value={(value as string) ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                disabled={readonly}
                className={inputCls}
                style={inputStyle}
              />
            )}

            {field.type === 'select' && (
              <select
                value={(value as string) ?? ''}
                onChange={e => onChange(field.id, e.target.value)}
                disabled={readonly}
                className={inputCls}
                style={inputStyle}
              >
                <option value="" style={{ background: '#13161C' }}>
                  {field.placeholder ?? 'Seleccioná una opción...'}
                </option>
                {options.map(opt => (
                  <option key={opt} value={opt} style={{ background: '#13161C' }}>{opt}</option>
                ))}
              </select>
            )}

            {field.type === 'radio' && (
              <div className="space-y-2">
                {options.map(opt => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: value === opt ? '#F4705A' : 'rgba(255,255,255,0.2)',
                      }}
                      onClick={() => !readonly && onChange(field.id, opt)}
                    >
                      {value === opt && <div className="w-2 h-2 rounded-full" style={{ background: '#F4705A' }} />}
                    </div>
                    <span className="text-sm text-white">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'multiselect' && (
              <div className="space-y-2">
                {options.map(opt => {
                  const selected = Array.isArray(value) ? (value as string[]).includes(opt) : false
                  return (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer">
                      <div
                        className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          borderColor: selected ? '#F4705A' : 'rgba(255,255,255,0.2)',
                          background:  selected ? '#F4705A' : 'transparent',
                        }}
                        onClick={() => {
                          if (readonly) return
                          const cur = Array.isArray(value) ? (value as string[]) : []
                          onChange(field.id, selected ? cur.filter(v => v !== opt) : [...cur, opt])
                        }}
                      >
                        {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                      <span className="text-sm text-white">{opt}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {field.type === 'checkbox' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: value ? '#F4705A' : 'rgba(255,255,255,0.2)',
                    background:  value ? '#F4705A' : 'transparent',
                  }}
                  onClick={() => !readonly && onChange(field.id, !value)}
                >
                  {!!value && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-white">{field.placeholder ?? 'Marcar si aplica'}</span>
              </label>
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => !readonly && onChange(field.id, !value)}
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: value ? '#F4705A' : 'rgba(255,255,255,0.12)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: value ? '22px' : '2px' }}
                  />
                </button>
                <span className="text-sm text-white">{value ? 'Sí' : 'No'}</span>
              </div>
            )}

            {field.type === 'rating' && (
              <div className="flex items-center gap-1">
                {Array.from({ length: (field.settings_json?.max as number) ?? 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => !readonly && onChange(field.id, i + 1)}
                    disabled={readonly}
                  >
                    <Star
                      className="w-6 h-6 transition-colors"
                      style={{
                        color:  (value as number) >= i + 1 ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                        fill:   (value as number) >= i + 1 ? '#F59E0B' : 'none',
                      }}
                    />
                  </button>
                ))}
                {!!value && (
                  <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {String(value)}/{(field.settings_json?.max as number) ?? 5}
                  </span>
                )}
              </div>
            )}

            {field.type === 'file' && (
              <div
                className="rounded-xl px-4 py-6 text-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
              >
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Subida de archivos — disponible en Documents Engine
                </p>
              </div>
            )}

            {field.type === 'signature' && (
              <div
                className="rounded-xl px-4 py-6 text-center"
                style={{ background: 'rgba(139,92,246,0.06)', border: '1px dashed rgba(139,92,246,0.2)' }}
              >
                <p className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>Firma digital</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Próximamente en Documents Engine
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
