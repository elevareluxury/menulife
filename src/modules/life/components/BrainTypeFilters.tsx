import { Lightbulb, StickyNote, CheckSquare } from 'lucide-react'
import { colors, font, radius, ink, tint } from '../design-system'

interface Props {
  selected: string[]
  onChange: (types: string[]) => void
  counts?: Record<string, number>
}

const TYPES = [
  { key: 'idea', label: 'Ideas',  icon: Lightbulb,    color: colors.area.brain },
  { key: 'note', label: 'Notas',  icon: StickyNote,   color: colors.area.goals },
  { key: 'task', label: 'Tareas', icon: CheckSquare,  color: colors.semantic.success },
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
              background: active ? `${tint(ink(t.color), 13)}` : colors.surface.high,
              border: `1px solid ${active ? tint(ink(t.color), 38) : colors.border.medium}`,
              color: active ? ink(t.color) : colors.text.secondary,
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
                background: active ? ink(t.color) : colors.border.medium,
                color: active ? colors.accent.on : colors.text.tertiary,
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
