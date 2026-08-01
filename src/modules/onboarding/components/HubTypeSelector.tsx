import { Check } from 'lucide-react'
import * as Icons from 'lucide-react'
import type { HubTemplateId } from '@/modules/hub/lib/hubTemplates'
import { HUB_TEMPLATES } from '@/modules/hub/lib/hubTemplates'

const ACCENT = '#F4705A'

interface HubTypeSelectorProps {
  value: HubTemplateId | null
  onChange: (id: HubTemplateId) => void
}

export function HubTypeSelector({ value, onChange }: HubTypeSelectorProps) {
  const templates = Object.values(HUB_TEMPLATES)

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {templates.map(template => {
          const Icon = ((Icons as any)[template.icon] ?? Icons.Sparkles) as React.FC<{ size?: number; color?: string }>
          const isSelected = value === template.id

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id)}
              className="relative p-4 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: isSelected ? ACCENT : '#E5E7EB',
                background: isSelected ? 'rgba(244,112,90,0.05)' : '#fff',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? 'rgba(244,112,90,0.12)' : '#F9FAFB',
                  }}
                >
                  <Icon size={18} color={isSelected ? ACCENT : '#6B7280'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-0.5 leading-tight">
                    {template.label}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight">
                    {template.description}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: ACCENT }}
                >
                  <Check size={11} color="#fff" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Elegí el que más se parezca a lo que hacés. Podés cambiar la configuración después.
      </p>
    </div>
  )
}
