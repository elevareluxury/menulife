import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Lightbulb, StickyNote, CheckSquare, Target, TrendingUp, Mic, Brain } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useScrollLock } from '@/lib/scrollLock'
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
import { featureOn } from '@/lib/features'
import { useLocaleStore } from '@/store/localeStore'
import { speechSupported } from '../hooks/useSpeech'
import { VoiceCaptureSheet } from './VoiceCaptureSheet'
import type { VoiceResult } from '../lib/voiceParse'
import { BrainDumpSheet, type DumpSaveItem } from './BrainDumpSheet'
import { lifeTimeZone, lifeToday, noonOfLocalDayISO } from '../lib/zonedTime'
import { trackCapture, trackEvent, type CaptureDest, type CaptureType } from '@/lib/productEvents'

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

const VOICE_ACTION = { id: 'voice', icon: Mic, color: colors.accent.default } as const
/** "Vaciar la cabeza": muchas cosas juntas, se revisan y se guardan todas */
const DUMP_ACTION = { id: 'dump', icon: Brain, color: colors.area.brain } as const

type ActionId = typeof ACTIONS[number]['id'] | 'voice' | 'dump'

/** `inBar`: el + va dentro de la barra de abajo (LifeNav); el menú y las hojas siguen en un portal a <body>. */
export function CaptureButton({ inBar = false }: { inBar?: boolean } = {}) {
  const { user } = useAuthStore()
  const t = useLifeT()


  const [open, setOpen]             = useState(false)
  useScrollLock(open)
  const [brainOpen, setBrainOpen]   = useState(false)
  const [brainType, setBrainType]   = useState<BrainItemType>('idea')
  const [goalOpen, setGoalOpen]     = useState(false)
  const [moneyOpen, setMoneyOpen]   = useState(false)
  const [taskOpen, setTaskOpen]     = useState(false)
  const [voiceOpen, setVoiceOpen]   = useState(false)
  const [dumpOpen, setDumpOpen]     = useState(false)
  const [canDictate] = useState(() => featureOn('voiceCapture') && speechSupported())
  const actions = [...(canDictate ? [VOICE_ACTION, ...ACTIONS] : ACTIONS), DUMP_ACTION]
  const mainCurrency = useLocaleStore(s => s.currency)

  const handleAction = (id: ActionId) => {
    setOpen(false)
    if (id === 'voice') {
      setVoiceOpen(true)
    } else if (id === 'dump') {
      setDumpOpen(true)
    } else if (id === 'task') {
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
  const saveOrQueue = async (item: OutboxItem, quiet = false): Promise<boolean> => {
    try {
      const { error } = await db.from(item.table).insert(item.row)
      if (error) throw error
      if (!quiet) window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: item.module } }))
      return true
    } catch (e) {
      if (!isOfflineError(e)) throw e
      // Sin lugar en el dispositivo: no se dice "se sube después" (se perdería); se avisa que no se guardó
      if (!enqueue(item)) throw e
      if (!quiet) toast(t.offline.queued, { icon: '☁️' })
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

  // Cada guardado cuenta como un uso de la captura (también si quedó en la cola sin conexión): `via` dice cuál
  const handleBrainSave = async (data: { type: BrainItemType; title: string; content?: string; goal_id?: string | null }, via: CaptureType = 'quick') => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id, is_completed: false, is_archived: false }
    const saved = await saveOrQueue({ table: 'life_brain_items', row, module: 'brain' })
    trackCapture(via, data.type)
    if (saved) void awardFirstCapture(user.id, data.type)
  }

  const handleTaskSave = async (data: TaskFormData, via: CaptureType = 'quick') => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...taskColumns(data), type: 'task', user_id: user.id, is_completed: false, is_archived: false }
    const saved = await saveOrQueue({ table: 'life_brain_items', row, module: 'brain' })
    trackCapture(via, 'task')
    if (saved) void awardFirstCapture(user.id, 'task')
  }

  const handleGoalSave = async (data: GoalFormData) => {
    if (!user) return
    let existing = 0
    try {
      const { count } = await db.from('life_goals').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      existing = count ?? 0
    } catch { /* sin conexión: va al final igual */ }
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id, sort_order: existing }
    const saved = await saveOrQueue({ table: 'life_goals', row, module: 'goals' })
    trackEvent('goal_created')
    trackCapture('quick', 'goal')
    if (saved) {
      void award(user.id, 'first_goal', 'Primera meta definida')
      if (existing + 1 >= 5) void award(user.id, 'goals_5', 'Cinco metas')
    }
  }

  const handleMoneySave = async (data: TransactionFormData, via: CaptureType = 'quick') => {
    if (!user) return
    const row = { id: crypto.randomUUID(), ...data, user_id: user.id }
    const saved = await saveOrQueue({ table: 'life_transactions', row, module: 'money' })
    trackCapture(via, 'money')
    if (saved) {
      void (async () => {
        const { count } = await db.from('life_transactions')
          .select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        if (count === 1) void award(user.id, 'first_transaction', 'Primer movimiento registrado')
      })()
    }
  }

  /** Lo dictado, ya revisado por la persona */
  const handleVoiceSave = async (r: VoiceResult) => {
    const today = lifeToday()   // zona de la cuenta (lib/zonedTime.ts)
    if (r.kind === 'expense' || r.kind === 'income') {
      await handleMoneySave({
        type: r.kind, amount: r.amount ?? 0, category: 'Otros', description: r.text, currency: mainCurrency,
        occurred_at: noonOfLocalDayISO(r.date ?? today, lifeTimeZone()),
      }, 'voice')
    } else if (r.kind === 'task') {
      await handleTaskSave({ title: r.text, due_date: r.date, due_time: r.date ? r.time : null }, 'voice')
    } else {
      await handleBrainSave({ type: 'idea', title: r.text }, 'voice')
    }
    toast.success(t.voice.saved)
  }

  /**
   * "Vaciar la cabeza", ya revisado: tareas e ideas a Brain, gastos e ingresos a Dinero. Sin conexión, cada cosa
   * queda en la cola del dispositivo (con su id: no se duplica). Devuelve los ids que no se pudieron guardar.
   */
  const handleDumpSave = async (items: DumpSaveItem[]): Promise<string[]> => {
    if (!user) return items.map(i => i.id)
    const today = lifeToday()
    const failed: string[] = []
    const modules = new Set<OutboxItem['module']>()
    let saved = 0
    let queued = 0
    let firstBrain: BrainItemType | null = null
    const byDest = new Map<CaptureDest, number>()
    for (const it of items) {
      let item: OutboxItem
      if (it.kind === 'expense' || it.kind === 'income') {
        item = { table: 'life_transactions', module: 'money', row: {
          id: it.id, user_id: user.id, type: it.kind, amount: it.amount ?? 0, category: it.category, description: it.text,
          currency: mainCurrency, occurred_at: noonOfLocalDayISO(it.date ?? today, lifeTimeZone()),
        } }
      } else if (it.kind === 'task') {
        item = { table: 'life_brain_items', module: 'brain', row: {
          id: it.id, ...taskColumns({ title: it.text, due_date: it.date, due_time: it.date ? it.time : null }),
          type: 'task', user_id: user.id, is_completed: false, is_archived: false,
        } }
      } else {
        item = { table: 'life_brain_items', module: 'brain', row: { id: it.id, type: 'idea', title: it.text, user_id: user.id, is_completed: false, is_archived: false } }
      }
      const dest: CaptureDest = item.module === 'money' ? 'money' : it.kind === 'task' ? 'task' : 'idea'
      try {
        const ok = await saveOrQueue(item, true)
        byDest.set(dest, (byDest.get(dest) ?? 0) + 1)
        if (ok) {
          saved++
          modules.add(item.module)
          if (item.module === 'brain' && !firstBrain) firstBrain = it.kind === 'task' ? 'task' : 'idea'
        } else queued++
      } catch { failed.push(it.id) }
    }
    modules.forEach(module => window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module } })))
    // Un evento por destino, con cuántas cosas fueron ahí (sólo lo guardado o en cola; un reintento de lo que
    // falló es otro uso)
    byDest.forEach((count, dest) => trackCapture('dump', dest, count))
    if (firstBrain) void awardFirstCapture(user.id, firstBrain)
    if (saved + queued > 0) toast.success(t.dump.saved(saved + queued))
    if (queued > 0) toast(t.offline.queued, { icon: '☁️' })
    return failed
  }

  const trigger = (
    <motion.button
      onClick={() => setOpen(v => !v)}
      whileTap={{ scale: 0.92 }}
      className={inBar ? 'life-nav-plus' : undefined}
      data-open={open ? '' : undefined}
      style={inBar ? undefined : {
        position: 'fixed',
        bottom: 'calc(84px + env(safe-area-inset-bottom))',
        right: '16px',
        width: '52px', height: '52px',
        borderRadius: '9999px', border: 'none', cursor: 'pointer',
        background: open ? colors.surface.elevated : colors.accent.default,
        color: colors.accent.on,
        boxShadow: open ? shadow.elevated : shadow.coralGlow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 49,
        transition: 'background 0.22s ease, box-shadow 0.22s ease',
      }}
      aria-label={open ? t.capture.close : t.capture.open}
      aria-expanded={open}
    >
      <motion.div
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 22 }}
        style={{ display: 'flex' }}
      >
        {open ? <X size={inBar ? 19 : 20} strokeWidth={2.5} /> : <Plus size={inBar ? 21 : 22} strokeWidth={2.5} />}
      </motion.div>
    </motion.button>
  )

  // Portal a <body>: el menú y las hojas no dependen de ningún contenedor
  const layers = createPortal(
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
              position: 'fixed', inset: 0, zIndex: 48, touchAction: 'none',
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
            bottom: inBar ? 'calc(88px + env(safe-area-inset-bottom))' : 'calc(148px + env(safe-area-inset-bottom))',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            zIndex: 49,
            // En un celular chico la lista no se mete debajo de la barra de arriba: si no entra, se mueve sólo ella
            maxHeight: 'calc(var(--vvh, 100dvh) - 160px - env(safe-area-inset-bottom) - env(safe-area-inset-top))',
            overflowY: 'auto', overscrollBehavior: 'none', touchAction: 'pan-y',
          }}>
            {[...actions].reverse().map((action, i) => (
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
                {action.id === 'voice' ? t.voice.action : action.id === 'dump' ? t.dump.action : t.capture[action.id]}
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {!inBar && trigger}

      {/* Sheets */}
      <BrainItemSheet
        open={brainOpen}
        onClose={() => setBrainOpen(false)}
        initialType={brainType}
        onSave={data => handleBrainSave(data)}
      />
      <TaskSheet
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        onSave={data => handleTaskSave(data)}
      />
      <GoalSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        initial={null}
        onSave={handleGoalSave}
      />
      <BrainDumpSheet open={dumpOpen} onClose={() => setDumpOpen(false)} onSave={handleDumpSave} />
      {canDictate && <VoiceCaptureSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} onSave={handleVoiceSave} />}
      <TransactionSheet
        open={moneyOpen}
        onClose={() => setMoneyOpen(false)}
        onSave={data => handleMoneySave(data)}
      />
    </>,
    document.body,
  )

  return inBar ? <>{trigger}{layers}</> : layers
}
