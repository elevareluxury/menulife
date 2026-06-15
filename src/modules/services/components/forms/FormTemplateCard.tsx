import { useState } from 'react'
import { MoreVertical, Edit2, Archive, Eye, Hammer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { FormTemplate } from '../../forms/formTypes'
import { FORM_STATUS_CONFIG } from '../../forms/formTypes'

interface FormTemplateCardProps {
  template:     FormTemplate
  fieldCount?:  number
  onArchive?:   (id: string) => void
  onPreview?:   (template: FormTemplate) => void
}

export function FormTemplateCard({ template, fieldCount = 0, onArchive, onPreview }: FormTemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const statusCfg = FORM_STATUS_CONFIG[template.status]

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-white leading-tight truncate">{template.name}</h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
          {template.description && (
            <p className="text-xs line-clamp-1 mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {fieldCount} campo{fieldCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
                .format(new Date(template.created_at))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {onPreview && (
            <button
              onClick={() => onPreview(template)}
              className="p-2 rounded-xl hover:bg-white/6 transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              title="Vista previa"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => navigate(`/dashboard/services/forms/${template.id}/builder`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
          >
            <Hammer className="w-3 h-3" />
            Constructor
          </button>

          {onArchive && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-2 rounded-xl hover:bg-white/6 transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-9 z-20 rounded-xl py-1 min-w-[140px]"
                    style={{ background: '#1C2028', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                  >
                    <button
                      onClick={() => { navigate(`/dashboard/services/forms/${template.id}/builder`); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => { onArchive(template.id); setMenuOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-white/5 transition-colors"
                      style={{ color: '#EF4444' }}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archivar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
