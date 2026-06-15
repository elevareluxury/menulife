import type { FieldType } from '../../forms/formTypes'
import { FIELD_TYPE_CONFIG, FIELD_TYPE_GROUPS } from '../../forms/formTypes'

interface FieldTypePaletteProps {
  onAdd: (type: FieldType) => void
}

export function FieldTypePalette({ onAdd }: FieldTypePaletteProps) {
  return (
    <div className="p-3 space-y-4">
      {FIELD_TYPE_GROUPS.map(group => {
        const groupTypes = (Object.entries(FIELD_TYPE_CONFIG) as [FieldType, typeof FIELD_TYPE_CONFIG[FieldType]][])
          .filter(([, cfg]) => cfg.group === group.id)

        return (
          <div key={group.id}>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2 px-1"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {groupTypes.map(([type, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={type}
                    onClick={() => onAdd(type)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/8 transition-colors group"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight">{cfg.label}</p>
                    </div>
                    <span
                      className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
                      style={{ color: '#F4705A' }}
                    >
                      + Agregar
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
