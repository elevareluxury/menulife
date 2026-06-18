import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius } from '../../design-system'
import type { ActiveGoal } from '../../hooks/useLifeData'

interface GoalsProgressWidgetProps {
  goals: ActiveGoal[]
}

export function GoalsProgressWidget({ goals }: GoalsProgressWidgetProps) {
  const navigate = useNavigate()

  return (
    <LifeCard>
      <LifeSectionHeader
        title="Metas activas"
        action={goals.length > 0 ? { label: 'Ver todas', to: '/life/goals' } : undefined}
      />

      {goals.length === 0 ? (
        <LifeEmptyState
          icon={Target}
          iconColor={colors.area.goals}
          title="Sin metas por ahora"
          subtitle="Definí hacia dónde vas y seguí tu progreso cada día"
          action={{ label: 'Agregar meta', onClick: () => navigate('/life/goals') }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {goals.map(goal => (
            <button
              key={goal.id}
              onClick={() => navigate('/life/goals')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px', borderRadius: radius.sm,
                textAlign: 'left', width: '100%',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: goal.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 600, color: colors.text.primary }}>
                    {goal.name}
                  </span>
                </div>
                <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: goal.color }}>
                  {goal.progress}%
                </span>
              </div>
              {/* Progress track */}
              <div style={{
                height: '4px', borderRadius: radius.full,
                background: colors.border.subtle, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${goal.progress}%`,
                  borderRadius: radius.full,
                  background: goal.color,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </LifeCard>
  )
}
