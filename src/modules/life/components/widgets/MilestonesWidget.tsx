import { useNavigate } from 'react-router-dom'
import { Trophy, Star, Zap, Flame, Target, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius } from '../../design-system'
import type { Achievement } from '../../hooks/useLifeData'

interface MilestonesWidgetProps {
  achievements: Achievement[]
}

const ACHIEVEMENT_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  first_goal_completed: { icon: Target,      color: colors.area.goals   },
  habit_streak_7:       { icon: Flame,       color: colors.area.habits  },
  habit_streak_30:      { icon: Flame,       color: '#FF6B2C'           },
  first_transaction:    { icon: Star,        color: colors.area.money   },
  goals_5:              { icon: Zap,         color: colors.area.brain   },
  tasks_complete:       { icon: CheckCircle2,color: colors.accent.default },
}

function getAchievementMeta(type: string) {
  return ACHIEVEMENT_ICONS[type] ?? { icon: Trophy, color: '#F59E0B' }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function MilestonesWidget({ achievements }: MilestonesWidgetProps) {
  const navigate = useNavigate()

  return (
    <LifeCard>
      <LifeSectionHeader title="Logros recientes" />

      {achievements.length === 0 ? (
        <LifeEmptyState
          icon={Trophy}
          iconColor="#F59E0B"
          title="Tus logros aparecerán acá"
          subtitle="Completá hábitos, alcanzá metas y desbloquea reconocimientos"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {achievements.map(a => {
            const { icon: Icon, color } = getAchievementMeta(a.type)
            return (
              <button
                key={a.id}
                onClick={() => navigate('/life/goals')}
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
                  width: 36, height: 36, borderRadius: radius.sm, flexShrink: 0,
                  background: `color-mix(in srgb, ${color} 15%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} style={{ color }} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: font, fontSize: '13px', fontWeight: 700, color: colors.text.primary, margin: 0 }}>
                    {a.title}
                  </p>
                </div>
                <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.quaternary, flexShrink: 0 }}>
                  {formatDate(a.achieved_at)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </LifeCard>
  )
}
