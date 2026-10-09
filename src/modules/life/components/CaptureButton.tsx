import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Lightbulb, StickyNote, CheckSquare, Target, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { award } from '../lib/checkMilestone'
import { BrainItemSheet } from './BrainItemSheet'
import { GoalSheet } from './GoalSheet'
import { TransactionSheet } from './TransactionSheet'
import { TaskSheet } from './TaskSheet'
import { taskColumns, type TaskFormData } from '../hooks/useTasks'
import { enqueue, isOfflineError, type OutboxItem } from '../lib/outbox'
import toast from 'react-hot-toast'
import { colors, font, radius, ink, tint, shadow } from '../design-system'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { useLifeT } from '@/i18n/app/life'
import type { BrainItemType } from '../hooks/useBrain'
import type { GoalFormData } from '../hooks/useGoals'
import type { TransactionFormData } from '../hooks/useMoney'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ── Actions config ────────────────────────────────────────────────────────────
const ACTIONS = [
  { id: 'idea',        icon: Lightbulb,   color: colors.area.brain },
  { id: 'note',        icon: StickyNote,  color: colors.area.goals },
  { id: 'task',        icon: CheckSquare, color: colors.semantic.success },
  { id: 'goal',        icon: Target,      color: colors.area.goals },
  { id: 'transaction', icon: TrendingUp,  color: colors.area.money },
] as const

type ActionId = typeof ACTIONS[number]['id']

export function CaptureButton() {
  const { user } = useAuthStore()
  const t = useLifeT()


  const [open, setOpen]             = useState(false)
  const [brainOpen, setBrainOpen]   = useState(false)
  const [brainType, setBrainType]   = useState<BrainItemType>('idea')
  const [goalOpen, setGoalOpen]     = useState(false)
  const [moneyOpen, setMoneyOpen]   = useState(false)
  const [taskOpen, setTaskOpen]     = useState(false)

  const handleAction = (id: ActionId) => {
    setOpen(false)
    if (id === 'task') {
      setTaskOpen(true)
    } else if (id === 'idea' || id === 'note') {
      setBrainType(id)
      setBrainOpen(true)
    } else if (id === 'goal') {
      setGoalOpen(true)
    } else {
      setMoneyOpen(true)
    }
  }

  /**
   * Inserta la fila; si no hay conexión la deja en la cola del dispositivo (se sube sola después).
   * Devuelve true si se guardó en la base ahora.
   */
  const saveOrQueue = async (item: OutboxItem): Promise<boolean> => {
    try {
      const { error } = await db.from(item.table).insert(item.row)
      if (error) throw error
      window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: item.module } }))
      return true
    } catch (e) {
      if (!isOfflineError(e)) throw e
      enqueue(item)
      toast(t.offline.queued, { icon: '☁️' })
      return false
    }
  }

  const awardFirstCapture = async (userId: string, type: BrainItemType) => {
    const { count: total } = await db.from('life_brain_items')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId)
    if (total === 1) void award(userId, 'first_brain_item', 'Primera captura')
    if (type === 'idea') {
      const { count: ic } = await db.from('life_brain_items')
        .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('type', 'idea')
      if (ic === 10) void award(userId, 'ideas_10', '10 ideas guardadas')
      if (ic === 50) void award(userId, 'ideas_50', '50 ideas guardadas')
    }
  }

  const handleBrainSave = async (data: { type: BrainItemType; title: string; content?: string; goal_id?: string | null }) => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id, is_completed: false, is_archived: false }
    if (await saveOrQueue({ table: 'life_brain_items', row, module: 'brain' })) void awardFirstCapture(user.id, data.type)
  }

  const handleTaskSave = async (data: TaskFormData) => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...taskColumns(data), type: 'task', user_id: user.id, is_completed: false, is_archived: false }
    if (await saveOrQueue({ table: 'life_brain_items', row, module: 'brain' })) void awardFirstCapture(user.id, 'task')
  }

  const handleGoalSave = async (data: GoalFormData) => {
    if (!user) return
    let existing = 0
    try {
      const { count } = await db.from('life_goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      existing = count ?? 0
    } catch { /* sin conexión: va al final igual */ }
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id, sort_order: existing }
    if (await saveOrQueue({ table: 'life_goals', row, module: 'goals' })) {
      void award(user.id, 'first_goal', 'Primera meta definida')
      if (existing + 1 >= 5) void award(user.id, 'goals_5', 'Cinco metas')
    }
  }

  const handleMoneySave = async (data: TransactionFormData) => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id }
    if (await saveOrQueue({ table: 'life_transactions', row, module: 'money' })) {
      void (async () => {
        const { count } = await db.from('life_transactions')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
      })()
    }
  }

  // Portal a <body>: el botón fijo no depende de ningún contenedor
  return createPortal(
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
              background: 'var(--my-scrim)',
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
                  border: `1px solid ${colors.border.glass}`,
                  cursor: 'pointer',
                  background: colors.surface.elevated,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: `0 4px 20px var(--my-scrim), 0 0 0 1px ${tint(ink(action.color), 13)}`,
                  fontFamily: font,
                  fontSize: '13px', fontWeight: 700,
                  color: colors.text.primary,
                }}
                whileTap={{ scale: 0.96 }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '8px',
                  background: `${tint(ink(action.color), 9)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <action.icon size={14} style={{ color: ink(action.color) }} strokeWidth={2.5} />
                </div>
                {t.capture[action.id]}
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
            ? colors.surface.elevated
            : colors.accent.default,
          color: colors.accent.on,
          boxShadow: open
            ? shadow.elevated
            : shadow.coralGlow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 49,
          transition: 'background 0.22s ease, box-shadow 0.22s ease',
        }}
        aria-label={open ? t.capture.close : t.capture.open}
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
      <TaskSheet
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onSave={handleTaskSave}
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
    </>,
    document.body,
  )
}
