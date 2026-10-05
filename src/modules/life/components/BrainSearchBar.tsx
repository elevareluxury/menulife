import { Search, X } from 'lucide-react'
import { colors, font, radius } from '../design-system'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function BrainSearchBar({
  value,
  onChange,
  placeholder = 'Buscar ideas, notas, tareas...',
}: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px',
      background: colors.surface.high,
      border: `1px solid ${value ? 'rgba(99,102,241,0.4)' : colors.border.medium}`,
      borderRadius: radius.lg,
      marginBottom: 12,
      transition: 'border-color 0.15s',
    }}>
      <Search size={15} style={{ color: colors.text.tertiary, flexShrink: 0 }} strokeWidth={2} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: colors.text.primary,
          fontFamily: font, fontSize: 14,
        }}
      />
      {value.length > 0 && (
        <button
          onClick={() => onChange('')}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(255,255,255,0.10)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text.secondary,
            flexShrink: 0,
          }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
