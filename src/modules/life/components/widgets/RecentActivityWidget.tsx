import { useNavigate } from 'react-router-dom'
import { Activity, Target, Trophy } from 'lucide-react'
import { LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius } from '../../design-system'
import type { ActivityItem } from '../../hooks/useLifeData'

interface RecentActivityWidgetProps {
  activity: ActivityItem[]
}

const kindMeta: Record<ActivityItem['kind'], { icon: typeof Activity; route: string }> = {
  goal:        { icon: Target,   route: '/life/goals'  },
  habit:       { icon: Activity, route: '/life/habits' },
  money:       { icon: Activity, route: '/life/money'  },
  brain:       { icon: Activity, route: '/life/brain'  },
  achievement: { icon: Trophy,   route: '/life/goals'  },
}

export function RecentActivityWidget({ activity }: RecentActivityWidgetProps) {
  const navigate = useNavigate()

  return (
    <LifeCard>
      <LifeSectionHeader title="Actividad reciente" />

      {activity.length === 0 ? (
        <LifeEmptyState
          icon={Activity}
          iconColor={colors.text.tertiary}
          title="Nada por aquí todavía"
          subtitle="Tu actividad de metas, hábitos y logros aparecerá acá"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {activity.map(item => {
            const { icon: Icon, route } = kindMeta[item.kind]
            return (
              <button
                key={item.id}
                onClick={() => navigate(route)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '9px 8px', borderRadius: radius.sm,
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = colors.surface.elevated }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: radius.sm, flexShrink: 0,
                  background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} style={{ color: item.color }} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: font, fontSize: '13px', fontWeight: 600,
                    color: colors.text.primary, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {item.title}
                  </p>
                  <p style={{
                    fontFamily: font, fontSize: '11px', fontWeight: 500,
                    color: colors.text.tertiary, margin: '1px 0 0',
                  }}>
                    {item.subtitle}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </LifeCard>
  )
}
