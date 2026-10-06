import { createElement, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Flame, Plus, Check, Pencil, Trash2, Power, ChevronDown } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  colors, font, radius, stagger, fadeInUp,
} from '../design-system'
import { useHabits, type Habit } from '../hooks/useHabits'
import { getHabitIcon } from '../lib/lifePalette'
import { HabitSheet } from '../components/HabitSheet'
import { ActionMenu } from '../components/ActionMenu'

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

// ── Últimos 7 días (cada punto se puede tocar para marcar un día olvidado) ──
function WeekDots({ habit, onToggle }: { habit: Habit; onToggle: (date: string, done: boolean) => void }) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  return (
    <div style={{ display: 'flex', gap: '2px' }} role="group" aria-label={t.habits.weekHelp}>
      {habit.week.map(d => {
        const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })
        return (
          <button key={d.date} type="button" onClick={() => onToggle(d.date, !d.done)}
            aria-pressed={d.done} aria-label={t.habits.dayToggle(habit.name, label, d.done)} title={label}
            style={{ width: 32, height: 36, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span aria-hidden="true" style={{
              width: 9, height: 9, borderRadius: '50%',
              background: d.done ? habit.color : 'transparent',
              border: `1.5px solid ${d.done ? habit.color : d.scheduled ? colors.text.tertiary : colors.border.medium}`,
              opacity: d.scheduled || d.done ? 1 : 0.6,
            }} />
          </button>
        )
      })}
    </div>
  )
}

// ── Botón de hoy ──────────────────────────────────────────────────────────────
function HabitToggle({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  const t = useLifeT()
  const completed = habit.completedToday
  return (
    <motion.button
      type="button"
      key={`${habit.color}-${completed}`}
      initial={{ scale: completed ? 0.7 : 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      whileTap={{ scale: 0.82 }}
      onClick={onToggle}
      aria-pressed={completed}
      aria-label={completed ? t.habits.unmarkToday(habit.name) : t.habits.markToday(habit.name)}
      style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        border: `2.5px solid ${habit.color}`,
        background: completed ? habit.color : 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <AnimatePresence mode="wait">
        {completed && (
          <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 440, damping: 20 }}>
            <Check size={20} strokeWidth={3} style={{ color: '#fff' }} aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────
function HabitCard({ habit, onToggleToday, onToggleDay, onEdit, onDelete, onToggleActive }: {
  habit: Habit
  onToggleToday: () => void
  onToggleDay: (date: string, done: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const t = useLifeT()
  return (
    <LifeCard style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: radius.md, flexShrink: 0,
          background: `${habit.color}18`, border: `1px solid ${habit.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(getHabitIcon(habit.icon), { size: 20, style: { color: habit.color }, strokeWidth: 2, 'aria-hidden': true })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {habit.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {habit.streak > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={t.habits.streak(habit.streak)}>
                <Flame size={11} style={{ color: habit.color }} strokeWidth={2} aria-hidden="true" />
                <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: habit.color }}>
                  {habit.streak}<span className="sr-only"> · {t.habits.streak(habit.streak)}</span>
                </span>
              </span>
            )}
            <WeekDots habit={habit} onToggle={onToggleDay} />
            {!habit.scheduledToday && (
              <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.tertiary }}>
                {t.habits.notToday}
              </span>
            )}
          </div>
        </div>

        <ActionMenu label={t.habits.options} actions={[
          { icon: Pencil, label: t.common.edit, onSelect: onEdit },
          { icon: Power, label: t.habits.deactivate, onSelect: onToggleActive },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ]} />

        {habit.scheduledToday && <HabitToggle habit={habit} onToggle={onToggleToday} />}
      </div>
    </LifeCard>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export function LifeHabitsPage() {
  const tNav = useLifeT().nav
  const t = useLifeT()
  const {
    activeHabits, inactiveHabits, completedToday, totalToday,
    loading, toggleToday, toggleDay, createHabit, updateHabit, deleteHabit, toggleActive,
  } = useHabits()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editHabit, setEditHabit]       = useState<Habit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  if (loading) return <HabitSkeleton />

  const safely = (p: Promise<unknown>) => { p.catch(() => toast.error(t.common.saveError)) }
  const todayRate = totalToday > 0 ? completedToday / totalToday : 0
  const openNew = () => { setEditHabit(null); setSheetOpen(true) }

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} style={{ color: colors.area.habits }} strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            {tNav.habits}
          </h1>
        </div>
        <button type="button" onClick={openNew} aria-label={t.habits.add} title={t.habits.add}
          style={{
            width: 40, height: 40, borderRadius: radius.full,
            background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Plus size={18} style={{ color: colors.accent.default }} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {activeHabits.length > 0 && totalToday > 0 && (
        <LifeCard style={{ marginBottom: '14px' }}>
          <LifeSectionHeader title={t.habits.today} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1, height: 6, borderRadius: radius.full, background: colors.border.subtle, overflow: 'hidden' }}
              role="progressbar" aria-valuemin={0} aria-valuemax={totalToday} aria-valuenow={completedToday} aria-label={t.habits.today}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${todayRate * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: colors.area.habits, borderRadius: radius.full }} />
            </div>
            <span style={{ fontFamily: font, fontSize: '13px', fontWeight: 800, color: colors.area.habits, flexShrink: 0 }}>
              {completedToday}/{totalToday}
            </span>
          </div>
          {completedToday === totalToday && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="status"
              style={{ fontFamily: font, fontSize: '12px', color: colors.area.habits, margin: 0 }}>
              {t.habits.allDone}
            </motion.p>
          )}
        </LifeCard>
      )}

      {activeHabits.length === 0 ? (
        <LifeCard>
          <LifeEmptyState icon={Flame} iconColor={colors.area.habits}
            title={t.habits.emptyTitle} subtitle={t.habits.emptyText}
            action={{ label: t.habits.emptyAction, onClick: openNew }} />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeHabits.map(habit => (
            <motion.div key={habit.id} variants={fadeInUp}>
              <HabitCard
                habit={habit}
                onToggleToday={() => safely(toggleToday(habit.id, !habit.completedToday))}
                onToggleDay={(date, done) => safely(toggleDay(habit.id, date, done))}
                onEdit={() => { setEditHabit(habit); setSheetOpen(true) }}
                onDelete={() => setDeleteTarget(habit)}
                onToggleActive={() => safely(toggleActive(habit.id, false))}
              />
            </motion.div>
          ))}
          <p style={{ fontFamily: font, fontSize: '11.5px', color: colors.text.tertiary, margin: '4px 4px 0', lineHeight: 1.5 }}>
            {t.habits.weekHelp}
          </p>
        </motion.div>
      )}

      {/* Desactivados: conservan su historial y se pueden volver a activar */}
      {inactiveHabits.length > 0 && (
        <LifeCard style={{ marginTop: '14px' }}>
          <button type="button" onClick={() => setShowInactive(v => !v)} aria-expanded={showInactive}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {t.habits.inactive(inactiveHabits.length)}
            </span>
            <ChevronDown size={16} aria-hidden="true" style={{ color: colors.text.tertiary, transform: showInactive ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
          {showInactive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.secondary, margin: '0 0 4px' }}>{t.habits.inactiveHelp}</p>
              {inactiveHabits.map(h => {
                return (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                    {createElement(getHabitIcon(h.icon), { size: 18, style: { color: h.color, opacity: 0.7 }, 'aria-hidden': true })}
                    <span style={{ flex: 1, minWidth: 0, fontFamily: font, fontSize: 14, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    <button type="button" onClick={() => safely(toggleActive(h.id, true))}
                      style={{ minHeight: 36, padding: '6px 14px', borderRadius: radius.full, border: `1px solid ${colors.border.medium}`, background: 'transparent', color: colors.text.primary, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {t.habits.activate}
                    </button>
                    <ActionMenu label={t.habits.options} actions={[
                      { icon: Trash2, label: t.common.delete, onSelect: () => setDeleteTarget(h), danger: true },
                    ]} />
                  </div>
                )
              })}
            </div>
          )}
        </LifeCard>
      )}

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
        title={t.habits.deleteTitle}
        message={deleteTarget ? t.habits.deleteText(deleteTarget.name) : ''}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) await deleteHabit(target.id).catch(() => toast.error(t.common.saveError))
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
