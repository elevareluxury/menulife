import { useLifeT } from '@/i18n/app/life'
import { colors, font, radius } from '../design-system'
import { useGoalOptions } from '../hooks/useGoalOptions'

/** Selector de meta (opcional) para hábitos, movimientos y notas. Sin metas activas no se muestra. */
export function GoalSelect({ id, value, onChange, enabled = true }: {
  id: string
  value: string | null | undefined
  onChange: (goalId: string | null) => void
  enabled?: boolean
}) {
  const t = useLifeT()
  const goals = useGoalOptions(enabled).filter(g => g.status !== 'completed' || g.id === value)
  if (goals.length === 0) return null
  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor={id} style={{
        fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
        letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
      }}>{t.taskSheet.goal}</label>
      <select id={id} value={value ?? ''} onChange={e => onChange(e.target.value || null)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: radius.md,
          background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
          color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none', colorScheme: 'dark',
        }}>
        <option value="">{t.taskSheet.noGoal}</option>
        {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
  )
}
