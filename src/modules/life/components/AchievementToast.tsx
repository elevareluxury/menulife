import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Target, Star, CheckCircle2, Lightbulb, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLifeStore } from '@/store/lifeStore'
import { colors, font, radius } from '../design-system'

const ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  first_brain_item:      { icon: Lightbulb,    color: '#8B5CF6' },
  ideas_10:              { icon: Lightbulb,    color: '#8B5CF6' },
  ideas_50:              { icon: Lightbulb,    color: '#8B5CF6' },
  tasks_10:              { icon: CheckCircle2, color: '#22C55E' },
  tasks_50:              { icon: CheckCircle2, color: '#22C55E' },
  first_habit_completed: { icon: Flame,        color: '#F59E0B' },
  habit_streak_7:        { icon: Flame,        color: '#F59E0B' },
  habit_streak_30:       { icon: Flame,        color: '#FF6B2C' },
  first_goal:            { icon: Target,       color: '#3B82F6' },
  first_goal_completed:  { icon: Target,       color: '#3B82F6' },
  goals_5:               { icon: Star,         color: '#3B82F6' },
  first_transaction:     { icon: Wallet,       color: '#22C55E' },
  first_positive_month:  { icon: Wallet,       color: '#22C55E' },
}

export function AchievementToast() {
  const { achievementToast, clearAchievement } = useLifeStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (achievementToast) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(clearAchievement, 3800)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [achievementToast, clearAchievement])

  const meta = achievementToast ? (ICON_MAP[achievementToast.type] ?? { icon: Trophy, color: '#F59E0B' }) : null

  return (
    <AnimatePresence>
      {achievementToast && meta && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={clearAchievement}
          style={{
            position: 'fixed',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 18px 12px 14px',
            borderRadius: radius.xl,
            background: 'rgba(15,17,21,0.96)',
            border: `1px solid ${meta.color}30`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${meta.color}15`,
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
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <meta.icon size={20} style={{ color: meta.color }} strokeWidth={2} />
          </div>

          {/* Text */}
          <div>
            <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: meta.color, margin: '0 0 2px', letterSpacing: '0.08em' }}>
              LOGRO DESBLOQUEADO
            </p>
            <p style={{ fontFamily: font, fontSize: '14px', fontWeight: 700, color: colors.text.primary, margin: 0 }}>
              {achievementToast.title}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
