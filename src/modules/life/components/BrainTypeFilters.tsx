import { Lightbulb, StickyNote, CheckSquare } from 'lucide-react'
import { colors, font, radius } from '../design-system'

interface Props {
  selected: string[]
  onChange: (types: string[]) => void
  counts?: Record<string, number>
}

const TYPES = [
  { key: 'idea', label: 'Ideas',  icon: Lightbulb,    color: '#8B5CF6' },
  { key: 'note', label: 'Notas',  icon: StickyNote,   color: '#3B82F6' },
  { key: 'task', label: 'Tareas', icon: CheckSquare,  color: '#22C55E' },
] as const

export function BrainTypeFilters({ selected, onChange, counts }: Props) {
  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }

  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 14,
      overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {TYPES.map(t => {
        const active = selected.includes(t.key)
        const Icon = t.icon
        const count = counts?.[t.key]
        return (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 13px', borderRadius: radius.full,
              background: active ? `${t.color}20` : colors.surface.high,
              border: `1px solid ${active ? t.color + '60' : colors.border.medium}`,
              color: active ? t.color : colors.text.secondary,
              fontFamily: font, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <Icon size={12} strokeWidth={2} />
            {t.label}
            {count !== undefined && count > 0 && (
              <span style={{
                marginLeft: 2, padding: '1px 5px', borderRadius: 999,
                background: active ? t.color : 'rgba(255,255,255,0.10)',
                color: active ? '#0A0B0F' : colors.text.tertiary,
                fontSize: 10, fontWeight: 800,
              }}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
