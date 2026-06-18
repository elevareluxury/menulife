import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Plus, Check, MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  colors, font, radius, stagger, fadeInUp, scaleIn,
} from '../design-system'
import { useHabits, type Habit } from '../hooks/useHabits'
import { getHabitIcon } from '../lib/lifePalette'
import { HabitSheet } from '../components/HabitSheet'

// ── Skeleton ─────────────────────────────────────────────────────────────────
function HabitSkeleton() {
  return (
    <LifeScreenContainer>
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {[64, 64, 64, 64].map((h, i) => (
          <div key={i} style={{
            height: h, background: colors.surface.base, borderRadius: radius.xl,
            marginBottom: '10px', border: `1px solid ${colors.border.subtle}`,
          }} />
        ))}
      </motion.div>
    </LifeScreenContainer>
  )
}

// ── Week Dots ─────────────────────────────────────────────────────────────────
function WeekDots({ weekDone, color }: { weekDone: boolean[]; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {weekDone.map((done, i) => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: done ? color : colors.border.subtle,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  )
}

// ── Toggle Button ─────────────────────────────────────────────────────────────
function HabitToggle({ completed, color, onToggle }: {
  completed: boolean; color: string; onToggle: () => void
}) {
  return (
    <motion.button
      key={`${color}-${completed}`}
      initial={{ scale: completed ? 0.7 : 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      whileTap={{ scale: 0.82 }}
      onClick={onToggle}
      style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        border: `2.5px solid ${color}`,
        background: completed ? color : 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <AnimatePresence mode="wait">
        {completed && (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 440, damping: 20 }}
          >
            <Check size={20} strokeWidth={3} style={{ color: '#fff' }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Habit Card ────────────────────────────────────────────────────────────────
function HabitCard({ habit, onToggle, onEdit, onDelete, onToggleActive }: {
  habit: Habit
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const Icon = getHabitIcon(habit.icon)

  return (
    <LifeCard style={{ opacity: habit.is_active ? 1 : 0.55, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: radius.md, flexShrink: 0,
          background: `${habit.color}18`,
          border: `1px solid ${habit.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: habit.color }} strokeWidth={2} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: '0 0 4px' }}>
            {habit.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {habit.streak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Flame size={11} style={{ color: habit.color }} strokeWidth={2} />
                <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: habit.color }}>
                  {habit.streak}
                </span>
              </div>
            )}
            <WeekDots weekDone={habit.weekDone} color={habit.color} />
            {!habit.scheduledToday && (
              <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.quaternary }}>
                No es hoy
              </span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            style={{
              width: 28, height: 28, borderRadius: radius.full,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.text.tertiary, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                style={{
                  position: 'absolute', right: 0, top: '32px', zIndex: 10,
                  background: colors.surface.high,
                  border: `1px solid ${colors.border.medium}`,
                  borderRadius: radius.md,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 140,
                  overflow: 'hidden',
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {[
                  { icon: Pencil, label: 'Editar', action: () => { setMenuOpen(false); onEdit() } },
                  { icon: Power,  label: habit.is_active ? 'Desactivar' : 'Activar', action: () => { setMenuOpen(false); onToggleActive() } },
                  { icon: Trash2, label: 'Eliminar', action: () => { setMenuOpen(false); onDelete() }, danger: true },
                ].map(({ icon: Icon2, label, action, danger }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: font, fontSize: '13px', fontWeight: 600,
                      color: danger ? colors.semantic.error : colors.text.secondary,
                      textAlign: 'left', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <Icon2 size={13} />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle */}
        {habit.scheduledToday && (
          <HabitToggle
            completed={habit.completedToday}
            color={habit.color}
            onToggle={onToggle}
          />
        )}
      </div>
    </LifeCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeHabitsPage() {
  const {
    activeHabits, completedToday, totalToday,
    loading, toggleToday, createHabit, updateHabit, deleteHabit, toggleActive,
  } = useHabits()

  const [sheetOpen, setSheetOpen]     = useState(false)
  const [editHabit, setEditHabit]     = useState<Habit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)

  if (loading) return <HabitSkeleton />

  const todayRate = totalToday > 0 ? completedToday / totalToday : 0

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} style={{ color: colors.area.habits }} strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            Habits
          </h1>
        </div>
        <button
          onClick={() => { setEditHabit(null); setSheetOpen(true) }}
          style={{
            width: 36, height: 36, borderRadius: radius.full,
            background: colors.accent.soft,
            border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={18} style={{ color: colors.accent.default }} strokeWidth={2.5} />
        </button>
      </div>

      {/* Today overview */}
      {activeHabits.length > 0 && (
        <LifeCard style={{ marginBottom: '14px' }}>
          <LifeSectionHeader title="Hoy" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1, height: 6, borderRadius: radius.full, background: colors.border.subtle, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${todayRate * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: colors.area.habits, borderRadius: radius.full }}
              />
            </div>
            <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 800, color: colors.area.habits, flexShrink: 0 }}>
              {completedToday}/{totalToday}
            </span>
          </div>
          {completedToday === totalToday && totalToday > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontFamily: font, fontSize: '12px', color: colors.area.habits, margin: 0 }}
            >
              ✦ ¡Todos los hábitos de hoy completados!
            </motion.p>
          )}
        </LifeCard>
      )}

      {/* Habit list */}
      {activeHabits.length === 0 ? (
        <LifeCard>
          <LifeEmptyState
            icon={Flame}
            iconColor={colors.area.habits}
            title="Los hábitos construyen la vida"
            subtitle="Creá tu primer hábito y empezá a rastrear tu racha diaria."
            action={{ label: 'Crear primer hábito', onClick: () => { setEditHabit(null); setSheetOpen(true) } }}
          />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeHabits.map(habit => (
            <motion.div key={habit.id} variants={fadeInUp}>
              <HabitCard
                habit={habit}
                onToggle={() => toggleToday(habit.id, !habit.completedToday)}
                onEdit={() => { setEditHabit(habit); setSheetOpen(true) }}
                onDelete={() => setDeleteTarget(habit)}
                onToggleActive={() => toggleActive(habit.id, !habit.is_active)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Sheets */}
      <HabitSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editHabit}
        onSave={async data => {
          if (editHabit) await updateHabit(editHabit.id, data)
          else await createHabit(data)
        }}
      />

      <LifeConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar hábito?"
        message={`"${deleteTarget?.name}" y toda su historia serán eliminados.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTarget) await deleteHabit(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
