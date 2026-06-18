import { useNavigate } from 'react-router-dom'
import { Flame, CheckCircle2, Circle } from 'lucide-react'
import { LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius } from '../../design-system'
import type { TodayHabit } from '../../hooks/useLifeData'

interface HabitsWidgetProps {
  habits: TodayHabit[]
  completedCount: number
  totalCount: number
}

export function HabitsWidget({ habits, completedCount, totalCount }: HabitsWidgetProps) {
  const navigate = useNavigate()

  return (
    <LifeCard>
      <LifeSectionHeader
        title="Hábitos de hoy"
        action={habits.length > 0 ? { label: 'Ver todos', to: '/life/habits' } : undefined}
      />

      {habits.length === 0 ? (
        <LifeEmptyState
          icon={Flame}
          iconColor={colors.area.habits}
          title="Sin hábitos aún"
          subtitle="Los pequeños hábitos construyen la vida que querés"
          action={{ label: 'Crear hábito', onClick: () => navigate('/life/habits') }}
        />
      ) : (
        <>
          {/* Progress summary */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '14px',
          }}>
            <div style={{ flex: 1, height: '5px', borderRadius: radius.full, background: colors.border.subtle, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%',
                background: colors.area.habits,
                borderRadius: radius.full,
                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
            <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.area.habits, flexShrink: 0 }}>
              {completedCount}/{totalCount}
            </span>
          </div>

          {/* Habit list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {habits.map(habit => (
              <button
                key={habit.id}
                onClick={() => navigate('/life/habits')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 8px', borderRadius: radius.sm,
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                {habit.completedToday
                  ? <CheckCircle2 size={18} style={{ color: habit.color, flexShrink: 0 }} strokeWidth={2} />
                  : <Circle size={18} style={{ color: colors.text.quaternary, flexShrink: 0 }} strokeWidth={1.8} />
                }
                <span style={{
                  fontFamily: font, fontSize: '13px', fontWeight: 600,
                  color: habit.completedToday ? colors.text.secondary : colors.text.tertiary,
                  textDecoration: habit.completedToday ? 'line-through' : 'none',
                }}>
                  {habit.name}
                </span>
                {habit.completedToday && (
                  <div style={{
                    marginLeft: 'auto',
                    padding: '2px 8px', borderRadius: radius.full,
                    background: `color-mix(in srgb, ${habit.color} 14%, transparent)`,
                  }}>
                    <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: habit.color }}>
                      Hecho
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </LifeCard>
  )
}
