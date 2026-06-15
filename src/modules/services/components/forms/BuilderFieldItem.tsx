import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react'
import type { FormField } from '../../forms/formTypes'
import { FIELD_TYPE_CONFIG } from '../../forms/formTypes'

interface BuilderFieldItemProps {
  field:      FormField
  isSelected: boolean
  isFirst:    boolean
  isLast:     boolean
  onSelect:   () => void
  onMoveUp:   () => void
  onMoveDown: () => void
  onDelete:   () => void
}

export function BuilderFieldItem({
  field, isSelected, isFirst, isLast, onSelect, onMoveUp, onMoveDown, onDelete,
}: BuilderFieldItemProps) {
  const cfg  = FIELD_TYPE_CONFIG[field.type]
  const Icon = cfg.icon

  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all"
      style={{
        background: isSelected ? 'rgba(244,112,90,0.08)' : 'rgba(255,255,255,0.03)',
        border:     `1px solid ${isSelected ? 'rgba(244,112,90,0.30)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Drag handle (visual only — DnD Fase 11+) */}
      <GripVertical
        className="w-4 h-4 flex-shrink-0 opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      />

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isSelected ? 'rgba(244,112,90,0.15)' : 'rgba(255,255,255,0.06)' }}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{ color: isSelected ? '#F4705A' : 'rgba(255,255,255,0.4)' }}
        />
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{field.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {cfg.label}
          </span>
          {field.required && (
            <span className="text-[10px] font-semibold" style={{ color: '#F4705A' }}>
              Requerido
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-20"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
          style={{ color: 'rgba(239,68,68,0.5)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
