import { MoreVertical, Archive, Edit2, Clock, DollarSign } from 'lucide-react'
import { useState } from 'react'
import type { QuoteTemplate } from '../../quotes/quoteTypes'

interface QuoteTemplateCardProps {
  template: QuoteTemplate
  onEdit:   (t: QuoteTemplate) => void
  onArchive:(id: string) => void
}

export function QuoteTemplateCard({ template, onEdit, onArchive }: QuoteTemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const color = template.color ?? '#F4705A'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${color}28` }}
    >
      <div className="px-4 py-3.5 flex items-center gap-3" style={{ background: `${color}0D` }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${color}1A` }}
        >
          {template.icon ?? '📋'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight mb-1">{template.name}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <DollarSign className="w-3 h-3" />
              {template.currency}
            </span>
            {template.expiration_days && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <Clock className="w-3 h-3" />
                {template.expiration_days}d de vigencia
              </span>
            )}
            {template.description && (
              <span className="text-[11px] truncate max-w-[160px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {template.description}
              </span>
            )}
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[148px]"
                style={{ background: '#1C2028', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
              >
                <button
                  onClick={() => { onEdit(template); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left hover:bg-white/5 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => { onArchive(template.id); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-left hover:bg-white/5 transition-colors"
                  style={{ color: '#EF4444' }}
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archivar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
