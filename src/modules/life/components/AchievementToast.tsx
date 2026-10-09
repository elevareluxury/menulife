import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Target, Star, CheckCircle2, Lightbulb, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLifeStore } from '@/store/lifeStore'
import { colors, font, radius, ink, tint } from '../design-system'
import { useLifeT } from '@/i18n/app/life'

const ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  first_brain_item:      { icon: Lightbulb,    color: colors.area.brain },
  ideas_10:              { icon: Lightbulb,    color: colors.area.brain },
  ideas_50:              { icon: Lightbulb,    color: colors.area.brain },
  tasks_10:              { icon: CheckCircle2, color: colors.semantic.success },
  tasks_50:              { icon: CheckCircle2, color: colors.semantic.success },
  first_habit_completed: { icon: Flame,        color: colors.area.habits },
  habit_streak_7:        { icon: Flame,        color: colors.area.habits },
  habit_streak_30:       { icon: Flame,        color: colors.area.habits },
  first_goal:            { icon: Target,       color: colors.area.goals },
  first_goal_completed:  { icon: Target,       color: colors.area.goals },
  goals_5:               { icon: Star,         color: colors.area.goals },
  first_transaction:     { icon: Wallet,       color: colors.semantic.success },
  first_positive_month:  { icon: Wallet,       color: colors.semantic.success },
}

export function AchievementToast() {
  const { achievementToast, clearAchievement } = useLifeStore()
  const t = useLifeT()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (achievementToast) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(clearAchievement, 3800)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [achievementToast, clearAchievement])

  const meta = achievementToast ? (ICON_MAP[achievementToast.type] ?? { icon: Trophy, color: colors.area.habits }) : null

  return (
    <AnimatePresence>
      {achievementToast && meta && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={clearAchievement}
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            left: 0,
            right: 0,
            marginInline: 'auto',
            width: 'fit-content',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px 12px 14px',
            borderRadius: radius.xl,
            background: colors.surface.elevated,
            border: `1px solid ${tint(ink(meta.color), 19)}`,
            boxShadow: `0 8px 32px var(--my-scrim), 0 0 0 1px ${tint(ink(meta.color), 8)}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            cursor: 'pointer',
            maxWidth: '320px',
            minWidth: '260px',
          }}
        >
          {/* Icon */}
          <div style={{
            width: 40, height: 40, borderRadius: radius.md, flexShrink: 0,
            background: `${tint(ink(meta.color), 9)}`,
            border: `1px solid ${tint(ink(meta.color), 19)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <meta.icon size={20} style={{ color: ink(meta.color) }} strokeWidth={2} />
          </div>

          {/* Text */}
          <div>
            <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: ink(meta.color), margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {t.achievements.unlocked}
            </p>
            <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary, margin: 0 }}>
              {t.achievements.titles[achievementToast.type] ?? achievementToast.title}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
