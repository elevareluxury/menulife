import { TrendingUp, TrendingDown, Zap, Calendar } from 'lucide-react'
import { colors, font, radius, ink, tint } from '../design-system'
import { useGoalCheckins, type GoalCheckin } from '../hooks/useGoalCheckins'

const ANSWER_META: Record<string, {
  label: string
  icon: React.ComponentType<{ size?: number }>
  color: string
}> = {
  si:      { label: 'Avancé bien', icon: TrendingUp,   color: colors.semantic.success },
  un_poco: { label: 'Un poco',     icon: Zap,          color: colors.area.habits },
  no:      { label: 'No avancé',   icon: TrendingDown, color: colors.semantic.error },
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  const fmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })
  return `${fmt.format(d)} — ${fmt.format(end)}`
}

export function GoalCheckinHistory({ goalId }: { goalId: string }) {
  const { checkins, loading } = useGoalCheckins({ goalId, limit: 8 })

  if (loading) {
    return (
      <p style={{ fontFamily: font, fontSize: 13, color: colors.text.tertiary, textAlign: 'center' }}>
        Cargando historial...
      </p>
    )
  }

  if (checkins.length === 0) {
    return (
      <div style={{
        padding: '20px', textAlign: 'center',
        background: colors.surface.base,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: radius.lg,
      }}>
        <Calendar size={20} style={{ color: colors.text.tertiary, marginBottom: 8 }} />
        <p style={{ fontFamily: font, fontSize: 14, color: colors.text.secondary, margin: 0 }}>
          Sin check-ins todavía
        </p>
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '4px 0 0' }}>
          Los viernes te recordamos hacer uno
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checkins.map(c => <CheckinRow key={c.id} checkin={c} />)}
    </div>
  )
}

function CheckinRow({ checkin }: { checkin: GoalCheckin }) {
  const meta = ANSWER_META[checkin.progress_answer] ?? ANSWER_META['no']
  const Icon = meta.icon

  return (
    <div style={{
      padding: 14, borderRadius: radius.lg,
      background: colors.surface.base,
      border: `1px solid ${colors.border.subtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: checkin.did_text || checkin.obstacle_text || checkin.next_text ? 10 : 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${tint(ink(meta.color), 13)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: ink(meta.color), flexShrink: 0,
        }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: font, fontSize: 13, fontWeight: 700,
            color: colors.text.primary, margin: 0,
          }}>
            {meta.label}
          </p>
          <p style={{
            fontFamily: font, fontSize: 11,
            color: colors.text.tertiary, margin: '2px 0 0',
          }}>
            {formatWeekLabel(checkin.week_start_date)}
          </p>
        </div>
      </div>

      {checkin.did_text && <TextBlock label="Hizo" value={checkin.did_text} />}
      {checkin.obstacle_text && <TextBlock label="Obstáculo" value={checkin.obstacle_text} />}
      {checkin.next_text && <TextBlock label="Próxima semana" value={checkin.next_text} />}
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{
        fontFamily: font, fontSize: 10, fontWeight: 700,
        color: colors.text.tertiary, letterSpacing: '0.08em',
        textTransform: 'uppercase', margin: '0 0 3px',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: font, fontSize: 13, lineHeight: 1.5,
        color: colors.text.primary, margin: 0, whiteSpace: 'pre-wrap',
      }}>
        {value}
      </p>
    </div>
  )
}
