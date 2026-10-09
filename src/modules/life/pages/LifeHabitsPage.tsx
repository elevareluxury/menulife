import { createElement, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Flame, Plus, Check, Pencil, Trash2, Power, ChevronDown, Hash } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog, MiniProgressRing, colors, font, radius, stagger, fadeInUp, ink, tint } from '../design-system'
import { useHabits, type Habit } from '../hooks/useHabits'
import { getHabitIcon } from '../lib/lifePalette'
import { monthHabitDays } from '../lib/kindMoments'
import { HabitSheet } from '../components/HabitSheet'
import { ActionMenu } from '../components/ActionMenu'
import { HabitMeta, HabitValueSheet, QuantityButton } from '../components/HabitControls'
import { useStreakText } from '../hooks/useStreakText'

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
              background: d.done ? ink(habit.color) : 'transparent',
              border: `1.5px solid ${d.done ? ink(habit.color) : d.scheduled ? colors.text.tertiary : colors.border.medium}`,
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
        border: `2.5px solid ${ink(habit.color)}`,
        background: completed ? ink(habit.color) : 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <AnimatePresence mode="wait">
        {completed && (
          <motion.div key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 440, damping: 20 }}>
            <Check size={20} strokeWidth={3} style={{ color: colors.accent.on }} aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────
function HabitCard({ habit, onToggleToday, onAdd, onEditValue, onToggleDay, onEdit, onDelete, onToggleActive }: {
  habit: Habit
  onToggleToday: () => void
  onAdd: () => void
  onEditValue: () => void
  onToggleDay: (date: string, done: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const t = useLifeT()
  const streakText = useStreakText()
  const qty = habit.target_value != null
  return (
    <LifeCard style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 44, height: 44, borderRadius: radius.md, flexShrink: 0,
          background: `${tint(ink(habit.color), 9)}`, border: `1px solid ${tint(ink(habit.color), 19)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {createElement(getHabitIcon(habit.icon), { size: 20, style: { color: ink(habit.color) }, strokeWidth: 2, 'aria-hidden': true })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {habit.name}
          </p>
          <HabitMeta habit={habit} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {habit.streak > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={streakText(habit)}>
                <Flame size={11} style={{ color: ink(habit.color) }} strokeWidth={2} aria-hidden="true" />
                <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: ink(habit.color) }}>
                  {habit.streak}<span className="sr-only"> · {streakText(habit)}</span>
                </span>
              </span>
            )}
            {habit.frequency.type === 'times_per_week' && (
              // Anillo de la semana ("2 de 3 esta semana" ya está escrito arriba, en HabitMeta)
              <span aria-hidden="true" style={{ display: 'flex' }}>
                <MiniProgressRing progress={Math.round(Math.min(1, habit.weekCount / habit.frequency.times) * 100)} color={ink(habit.color)} size={22} showLabel={false} />
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
          ...(qty ? [{ icon: Hash, label: t.habitPlus.editValue(habit.name), onSelect: onEditValue }] : []),
          { icon: Power, label: t.habits.deactivate, onSelect: onToggleActive },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ]} />

        {habit.scheduledToday && (qty ? <QuantityButton habit={habit} onAdd={onAdd} /> : <HabitToggle habit={habit} onToggle={onToggleToday} />)}
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
    loading, toggleToday, toggleDay, addToday, setDayValue, today, createHabit, updateHabit, deleteHabit, toggleActive, doneDates,
  } = useHabits()
  const month = useMemo(() => monthHabitDays(doneDates, today), [doneDates, today])

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editHabit, setEditHabit]       = useState<Habit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [valueHabit, setValueHabit]     = useState<Habit | null>(null)

  if (loading) return <HabitSkeleton />

  const safely = (p: Promise<unknown>) => { p.catch(() => toast.error(t.common.saveError)) }
  const todayRate = totalToday > 0 ? completedToday / totalToday : 0
  const openNew = () => { setEditHabit(null); setSheetOpen(true) }

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: tint(colors.area.habits, 12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <Plus size={18} style={{ color: colors.accent.ink }} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {activeHabits.length > 0 && totalToday > 0 && (
        <LifeCard style={{ marginBottom: '14px' }}>
          <LifeSectionHeader title={t.habits.today} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
            role="progressbar" aria-valuemin={0} aria-valuemax={totalToday} aria-valuenow={completedToday} aria-label={t.habits.today}>
            <MiniProgressRing progress={Math.round(todayRate * 100)} color={colors.area.habits} size={48} showLabel={false} />
            <span style={{ fontFamily: font, fontSize: '20px', fontWeight: 800, color: colors.text.primary, flexShrink: 0 }}>
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

      {month.days >= 3 && (
        // Progreso real del mes, comparado sólo con uno mismo (y sólo si fue mejor)
        <p role="note" style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, margin: '0 2px 14px', lineHeight: 1.5 }}>
          {t.kind.monthHabits(month.days, month.more)}
        </p>
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
                onAdd={() => safely(addToday(habit.id, 1))}
                onEditValue={() => setValueHabit(habit)}
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
                    {createElement(getHabitIcon(h.icon), { size: 18, style: { color: ink(h.color), opacity: 0.7 }, 'aria-hidden': true })}
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

      <HabitValueSheet habit={valueHabit} onClose={() => setValueHabit(null)}
        onSave={async v => { if (valueHabit) await setDayValue(valueHabit.id, today, v).catch(() => { toast.error(t.common.saveError) }) }} />

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
