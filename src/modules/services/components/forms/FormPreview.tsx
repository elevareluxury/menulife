import { useState } from 'react'
import { X } from 'lucide-react'
import type { FormTemplate, FormField } from '../../forms/formTypes'
import { FormRenderer } from './FormRenderer'

interface FormPreviewProps {
  open:     boolean
  onClose:  () => void
  template: FormTemplate
  fields:   FormField[]
}

export function FormPreview({ open, onClose, template, fields }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[520px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-3 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
              >
                Vista previa
              </span>
            </div>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-white mb-1">{template.name}</h2>
          {template.description && (
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>{template.description}</p>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
            <FormRenderer
              fields={fields}
              values={values}
              onChange={(id, val) => setValues(prev => ({ ...prev, [id]: val }))}
            />
          </div>

          {fields.length > 0 && (
            <button
              className="w-full mt-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: '#F4705A', color: '#fff' }}
              onClick={onClose}
            >
              Cerrar vista previa
            </button>
          )}
        </div>
      </div>
    </>
  )
}
