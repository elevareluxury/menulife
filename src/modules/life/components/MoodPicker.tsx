import { useLifeT } from '@/i18n/app/life'
import { colors, font, radius } from '../design-system'
import { MOODS, type Mood } from '../lib/mood'
import { MOOD_ICONS } from '../lib/moodIcons'

// Ánimo de 5 segundos: 5 caritas (botones con nombre y aria-pressed). Opcional: tocar la elegida otra vez la borra.

export function MoodPicker({ value, onChange, disabled }: { value: Mood | null; onChange: (mood: Mood | null) => void; disabled?: boolean }) {
  const t = useLifeT().mood
  return (
    <div role="group" aria-labelledby="life-mood-question">
      <p id="life-mood-question" style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary, margin: '0 0 2px' }}>{t.question}</p>
      <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.secondary, margin: '0 0 8px' }}>{t.hint}</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {MOODS.map(m => {
          const Icon = MOOD_ICONS[m]
          const on = value === m
          return (
            <button key={m} type="button" aria-pressed={on} aria-label={t.levels[m - 1]} title={t.levels[m - 1]} disabled={disabled}
              onClick={() => onChange(on ? null : m)}
              style={{
                flex: 1, minWidth: 44, minHeight: 52, padding: '6px 2px', borderRadius: radius.md, cursor: disabled ? 'default' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                background: on ? colors.accent.soft : colors.surface.high,
                border: `${on ? 2 : 1}px solid ${on ? colors.accent.default : colors.border.subtle}`,
                color: on ? colors.accent.ink : colors.text.secondary,
              }}>
              <Icon className={on ? 'life-pop' : undefined} size={22} strokeWidth={on ? 2.4 : 1.8} aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <p aria-live="polite" style={{ fontFamily: font, fontSize: '12.5px', fontWeight: 600, color: colors.text.primary, margin: '6px 0 0', textAlign: 'center', minHeight: '1.4em' }}>
        {value ? t.levels[value - 1] : ''}
      </p>
    </div>
  )
}
