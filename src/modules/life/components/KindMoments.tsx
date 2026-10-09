import { createElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles, Sunrise, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { colors, font, radius, ink, tint } from '../design-system'
import { useHabits } from '../hooks/useHabits'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { getHabitIcon } from '../lib/lifePalette'
import { dismissFresh, freshDismissed, freshStartOf } from '../lib/kindMoments'
import { dayKey } from '../hooks/useToday'
import { useAuthStore } from '@/store/authStore'
import { usePrefs } from '@/lib/prefs'
import { useLifeT } from '@/i18n/app/life'

// Momentos amables en "Mi día" (V1 · etapa 12). Nunca muestran rachas ni lo que no se hizo.

const card: React.CSSProperties = {
  position: 'relative', background: tint(colors.accent.default, 8), border: `1px solid ${tint(colors.accent.default, 30)}`,
  borderRadius: radius.xl, padding: '16px 48px 16px 16px',
}
const titleStyle: React.CSSProperties = { fontFamily: font, fontSize: '15px', fontWeight: 800, color: colors.text.primary, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }
const textStyle: React.CSSProperties = { fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: '6px 0 0', lineHeight: 1.5 }
const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 4, insetInlineEnd: 4, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'none', border: 'none', borderRadius: radius.full, color: colors.text.secondary, cursor: 'pointer',
}

/** "Qué bueno verte de vuelta": una sola sugerencia chica para hoy (un hábito programado, o una prioridad). */
export function WelcomeBack({ onClose }: { onClose: () => void }) {
  const t = useLifeT()
  const k = t.kind
  const { todayHabits, toggleToday } = useHabits()
  const suggestion = todayHabits.find(h => !h.completedToday && h.target_value == null) ?? todayHabits.find(h => !h.completedToday)
  const [done, setDone] = useState<string | null>(null)

  return (
    <section style={card} aria-labelledby="life-welcome">
      <h2 id="life-welcome" style={titleStyle}>
        <Sparkles size={16} aria-hidden="true" style={{ color: colors.accent.ink }} /> {k.welcomeTitle}
      </h2>
      <p style={textStyle}>{suggestion || done ? k.welcomeText : k.welcomeNoHabit}</p>
      {suggestion && !done && (
        <button type="button" onClick={() => {
          setDone(suggestion.name)
          toggleToday(suggestion.id, true)
            .then(() => window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'habits' } })))
            .catch(() => { setDone(null); toast.error(t.common.saveError) })
        }} aria-label={t.habits.markToday(suggestion.name)}
          style={{
            marginTop: 10, minHeight: 48, width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: radius.md, border: `1px solid ${colors.border.medium}`, background: colors.surface.base, cursor: 'pointer',
            color: colors.text.primary, fontFamily: font, fontSize: '14px', fontWeight: 600, textAlign: 'start',
          }}>
          <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: tint(ink(suggestion.color), 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {createElement(getHabitIcon(suggestion.icon), { size: 15, style: { color: ink(suggestion.color) }, strokeWidth: 2.2 })}
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.name}</span>
          <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${colors.border.medium}` }} />
        </button>
      )}
      {done && (
        <p style={{ ...textStyle, display: 'flex', alignItems: 'center', gap: 6, color: colors.text.primary, fontWeight: 600 }}>
          <Check className="life-pop" size={16} strokeWidth={3} aria-hidden="true" style={{ color: colors.semantic.success }} /> {done}
        </p>
      )}
      <button type="button" onClick={onClose} aria-label={k.gotIt} style={closeBtn}><X size={18} aria-hidden="true" /></button>
    </section>
  )
}

/** Primer día de la semana o del mes: una tarjeta breve para mirar las metas. Se cierra y no vuelve ese día. */
export function FreshStart() {
  const t = useLifeT()
  const k = t.kind
  const navigate = useNavigate()
  const uid = useAuthStore(s => s.user?.id)
  const weekStart = usePrefs(s => s.week_start)
  const today = dayKey()
  const kind = freshStartOf(today, weekStart)
  const [closed, setClosed] = useState(false)
  if (!kind || !uid || closed || freshDismissed(uid, today)) return null
  const close = () => { dismissFresh(uid, today); setClosed(true) }

  return (
    <section style={card} aria-labelledby="life-fresh">
      <h2 id="life-fresh" style={titleStyle}>
        <Sunrise size={16} aria-hidden="true" style={{ color: colors.accent.ink }} /> {kind === 'month' ? k.freshMonth : k.freshWeek}
      </h2>
      <p style={textStyle}>{k.freshText}</p>
      <button type="button" onClick={() => { close(); navigate('/life/goals') }}
        style={{
          marginTop: 10, minHeight: 40, padding: '8px 16px', borderRadius: radius.full, border: 'none', cursor: 'pointer',
          background: colors.accent.default, color: colors.accent.on, fontFamily: font, fontSize: '13px', fontWeight: 700,
        }}>{k.freshAction}</button>
      <button type="button" onClick={close} aria-label={k.dismiss} style={closeBtn}><X size={18} aria-hidden="true" /></button>
    </section>
  )
}
