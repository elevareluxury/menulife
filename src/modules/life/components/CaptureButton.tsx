import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Lightbulb, StickyNote, CheckSquare, Target, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { BrainItemSheet } from './BrainItemSheet'
import { GoalSheet } from './GoalSheet'
import { TransactionSheet } from './TransactionSheet'
import { colors, font, radius } from '../design-system'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import type { BrainItemType } from '../hooks/useBrain'
import type { GoalFormData } from '../hooks/useGoals'
import type { TransactionFormData } from '../hooks/useMoney'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Actions config ────────────────────────────────────────────────────────────
const ACTIONS = [
  { id: 'idea',        label: 'Idea',        icon: Lightbulb,   color: '#8B5CF6' },
  { id: 'note',        label: 'Nota',        icon: StickyNote,  color: '#3B82F6' },
  { id: 'task',        label: 'Tarea',       icon: CheckSquare, color: '#22C55E' },
  { id: 'goal',        label: 'Meta',        icon: Target,      color: colors.area.goals },
  { id: 'transaction', label: 'Movimiento',  icon: TrendingUp,  color: colors.area.money },
] as const

type ActionId = typeof ACTIONS[number]['id']

export function CaptureButton() {
  const { user } = useAuthStore()


  const [open, setOpen]             = useState(false)
  const [brainOpen, setBrainOpen]   = useState(false)
  const [brainType, setBrainType]   = useState<BrainItemType>('idea')
  const [goalOpen, setGoalOpen]     = useState(false)
  const [moneyOpen, setMoneyOpen]   = useState(false)

  const handleAction = (id: ActionId) => {
    setOpen(false)
    if (id === 'idea' || id === 'note' || id === 'task') {
      setBrainType(id)
      setBrainOpen(true)
    } else if (id === 'goal') {
      setGoalOpen(true)
    } else {
      setMoneyOpen(true)
    }
  }

  const handleBrainSave = async (data: { type: BrainItemType; title: string; content?: string }) => {
    if (!user) return
    await db.from('life_brain_items').insert({
      ...data, user_id: user.id, is_completed: false, is_archived: false,
    })
    window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'brain' } }))
    ;(async () => {
      const { count: total } = await db.from('life_brain_items')
        .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (total === 1) void award(user.id, 'first_brain_item', 'Primera captura')
      if (data.type === 'idea') {
        const { count: ic } = await db.from('life_brain_items')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'idea')
        if (ic === 10) void award(user.id, 'ideas_10', '10 ideas guardadas')
        if (ic === 50) void award(user.id, 'ideas_50', '50 ideas guardadas')
      }
    })()
  }

  const handleGoalSave = async (data: GoalFormData) => {
    if (!user) return
    const { count: existing } = await db.from('life_goals')
      .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    await db.from('life_goals').insert({ ...data, user_id: user.id, sort_order: existing ?? 0 })
    window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'goals' } }))
    void award(user.id, 'first_goal', 'Primera meta definida')
    const newCount = (existing ?? 0) + 1
    if (newCount >= 5) void award(user.id, 'goals_5', 'Cinco metas')
  }

  const handleMoneySave = async (data: TransactionFormData) => {
    if (!user) return
    await db.from('life_transactions').insert({ ...data, user_id: user.id })
    window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'money' } }))
    const { count } = await db.from('life_transactions')
      .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 48,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Action pills */}
      <AnimatePresence>
        {open && (
          <div style={{
            position: 'fixed',
            bottom: 'calc(148px + env(safe-area-inset-bottom))',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            zIndex: 49,
          }}>
            {[...ACTIONS].reverse().map((action, i) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 20, scale: 0.88 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.04 }}
                onClick={() => handleAction(action.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 16px 10px 12px',
                  borderRadius: radius.full,
                  border: `1px solid rgba(255,255,255,0.07)`,
                  cursor: 'pointer',
                  background: 'rgba(19,22,28,0.97)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${action.color}20`,
                  fontFamily: font,
                  fontSize: '13px', fontWeight: 700,
                  color: colors.text.primary,
                }}
                whileTap={{ scale: 0.96 }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '8px',
                  background: `${action.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <action.icon size={14} style={{ color: action.color }} strokeWidth={2.5} />
                </div>
                {action.label}
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main ➕ button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        style={{
          position: 'fixed',
          bottom: 'calc(84px + env(safe-area-inset-bottom))',
          right: '16px',
          width: '52px', height: '52px',
          borderRadius: '9999px', border: 'none', cursor: 'pointer',
          background: open
            ? 'rgba(60,62,72,0.97)'
            : 'linear-gradient(135deg, #F4705A 0%, #E05A45 100%)',
          color: '#fff',
          boxShadow: open
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(244,112,90,0.50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 49,
          transition: 'background 0.22s ease, box-shadow 0.22s ease',
        }}
        aria-label={open ? 'Cerrar' : 'Capturar'}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        >
          {open ? <X size={20} strokeWidth={2.5} /> : <Plus size={22} strokeWidth={2.5} />}
        </motion.div>
      </motion.button>

      {/* Sheets */}
      <BrainItemSheet
        open={brainOpen}
        onClose={() => setBrainOpen(false)}
        initialType={brainType}
        onSave={handleBrainSave}
      />
      <GoalSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        initial={null}
        onSave={handleGoalSave}
      />
      <TransactionSheet
        open={moneyOpen}
        onClose={() => setMoneyOpen(false)}
        onSave={handleMoneySave}
      />
    </>
  )
}
