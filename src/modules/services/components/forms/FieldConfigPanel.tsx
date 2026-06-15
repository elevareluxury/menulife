import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { FormField } from '../../forms/formTypes'
import { FIELD_TYPE_CONFIG } from '../../forms/formTypes'
import { getFieldOptions, hasOptions } from '../../forms/formUtils'

interface FieldConfigPanelProps {
  field:    FormField | null
  onUpdate: (id: string, patch: Partial<Pick<FormField, 'label' | 'placeholder' | 'help_text' | 'required' | 'settings_json'>>) => Promise<boolean>
}

export function FieldConfigPanel({ field, onUpdate }: FieldConfigPanelProps) {
  const [label,       setLabel]       = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [helpText,    setHelpText]    = useState('')
  const [options,     setOptions]     = useState<string[]>([])

  useEffect(() => {
    setLabel(field?.label ?? '')
    setPlaceholder(field?.placeholder ?? '')
    setHelpText(field?.help_text ?? '')
    setOptions(field ? getFieldOptions(field) : [])
  }, [field?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <span className="text-xl">←</span>
        </div>
        <p className="text-xs font-semibold text-white mb-1">Seleccioná un campo</p>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Hacé clic en cualquier campo del constructor para editarlo.
        </p>
      </div>
    )
  }

  const cfg = FIELD_TYPE_CONFIG[field.type]
  const Icon = cfg.icon

  const saveOptions = (newOptions: string[]) => {
    onUpdate(field.id, { settings_json: { ...field.settings_json, options: newOptions } })
  }

  const addOption = () => {
    const newOpts = [...options, `Opción ${options.length + 1}`]
    setOptions(newOpts)
    saveOptions(newOpts)
  }

  const updateOption = (idx: number, val: string) => {
    const newOpts = options.map((o, i) => i === idx ? val : o)
    setOptions(newOpts)
  }

  const saveOptionBlur = () => saveOptions(options)

  const removeOption = (idx: number) => {
    const newOpts = options.filter((_, i) => i !== idx)
    setOptions(newOpts)
    saveOptions(newOpts)
  }

  const showPlaceholder = !['checkbox', 'boolean', 'rating', 'signature', 'file', 'select', 'multiselect', 'radio'].includes(field.type)

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      {/* Field type header */}
      <div className="flex items-center gap-2.5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(244,112,90,0.12)' }}
        >
          <Icon className="w-4 h-4" style={{ color: '#F4705A' }} />
        </div>
        <div>
          <p className="text-xs font-bold text-white">{cfg.label}</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{cfg.description}</p>
        </div>
      </div>

      {/* Label */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Etiqueta <span style={{ color: '#F4705A' }}>*</span>
        </label>
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={() => label !== field.label && onUpdate(field.id, { label })}
          className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Placeholder */}
      {showPlaceholder && (
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Placeholder
          </label>
          <input
            value={placeholder}
            onChange={e => setPlaceholder(e.target.value)}
            onBlur={() => onUpdate(field.id, { placeholder: placeholder || null })}
            placeholder="Texto guía..."
            className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none placeholder:text-white/20"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      )}

      {/* Help text */}
      <div>
        <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Texto de ayuda
        </label>
        <input
          value={helpText}
          onChange={e => setHelpText(e.target.value)}
          onBlur={() => onUpdate(field.id, { help_text: helpText || null })}
          placeholder="Instrucción adicional..."
          className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none placeholder:text-white/20"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Required toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white">Requerido</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>No se puede dejar vacío</p>
        </div>
        <button
          onClick={() => onUpdate(field.id, { required: !field.required })}
          className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
          style={{ background: field.required ? '#F4705A' : 'rgba(255,255,255,0.12)' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: field.required ? '22px' : '2px' }}
          />
        </button>
      </div>

      {/* Options editor — select / multiselect / radio */}
      {hasOptions(field.type) && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Opciones
            </label>
            <button
              onClick={addOption}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
            >
              <Plus className="w-3 h-3" />
              Agregar
            </button>
          </div>
          <div className="space-y-1.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  value={opt}
                  onChange={e => updateOption(idx, e.target.value)}
                  onBlur={saveOptionBlur}
                  className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                />
                {options.length > 1 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
                    style={{ color: 'rgba(239,68,68,0.5)' }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating max */}
      {field.type === 'rating' && (
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Máximo de estrellas
          </label>
          <select
            value={(field.settings_json?.max as number) ?? 5}
            onChange={e => onUpdate(field.id, { settings_json: { ...field.settings_json, max: parseInt(e.target.value) } })}
            className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {[3, 5, 7, 10].map(n => (
              <option key={n} value={n} style={{ background: '#13161C' }}>{n} estrellas</option>
            ))}
          </select>
        </div>
      )}

      {/* Currency selector */}
      {field.type === 'currency' && (
        <div>
          <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Moneda
          </label>
          <select
            value={(field.settings_json?.currency as string) ?? 'ARS'}
            onChange={e => onUpdate(field.id, { settings_json: { ...field.settings_json, currency: e.target.value } })}
            className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {['ARS','USD','EUR','BRL','CLP','COP','MXN'].map(c => (
              <option key={c} value={c} style={{ background: '#13161C' }}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Number min/max */}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Mínimo</label>
            <input
              type="number"
              value={(field.settings_json?.min as number) ?? ''}
              onChange={e => onUpdate(field.id, { settings_json: { ...field.settings_json, min: e.target.value ? Number(e.target.value) : null } })}
              placeholder="—"
              className="w-full px-2.5 py-2 rounded-xl text-xs text-white outline-none placeholder:text-white/20"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Máximo</label>
            <input
              type="number"
              value={(field.settings_json?.max as number) ?? ''}
              onChange={e => onUpdate(field.id, { settings_json: { ...field.settings_json, max: e.target.value ? Number(e.target.value) : null } })}
              placeholder="—"
              className="w-full px-2.5 py-2 rounded-xl text-xs text-white outline-none placeholder:text-white/20"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>
      )}

      {/* Signature: future note */}
      {field.type === 'signature' && (
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
        >
          <p className="text-[11px] font-semibold" style={{ color: '#8B5CF6' }}>Firma digital</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Se implementará en el módulo de Documentos.
          </p>
        </div>
      )}
    </div>
  )
}
