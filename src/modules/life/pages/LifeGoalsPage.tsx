import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Target, Plus, Pencil, Trash2, Pause, Play, CheckCircle2, CalendarDays } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog, MiniProgressRing, colors, font, radius, stagger, fadeInUp, tint, ink } from '../design-system'
import { useGoals, type Goal } from '../hooks/useGoals'
import { GoalSheet } from '../components/GoalSheet'
import { GoalDetailSheet } from '../components/GoalDetailSheet'
import { ActionMenu } from '../components/ActionMenu'

// ── Skeleton ─────────────────────────────────────────────────────────────────
function GoalSkeleton() {
  return (
    <LifeScreenContainer>
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {[80, 80, 80].map((h, i) => (
          <div key={i} style={{
            height: h, background: colors.surface.base, borderRadius: radius.xl,
            marginBottom: '10px', border: `1px solid ${colors.border.subtle}`,
          }} />
        ))}
      </motion.div>
    </LifeScreenContainer>
  )
}

const STATUS_COLOR = {
  in_progress: colors.area.goals,
  completed:   colors.semantic.success,
  paused:      colors.text.tertiary,
}

// ── Tarjeta de meta ───────────────────────────────────────────────────────────
function GoalCard({ goal, onOpen, onEdit, onDelete, onToggleStatus }: {
  goal: Goal
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const isPaused = goal.status === 'paused'
  const statusColor = STATUS_COLOR[goal.status]
  const completedMs = goal.milestones.filter(m => m.is_completed).length
  const totalMs = goal.milestones.length

  return (
    <LifeCard style={{ opacity: isPaused ? 0.65 : 1, position: 'relative' }}>
      <div aria-hidden="true" style={{
        position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3,
        borderStartStartRadius: radius.xl, borderEndStartRadius: radius.xl, background: ink(goal.color),
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingInlineStart: '10px' }}>
        <button type="button" onClick={onOpen} aria-label={t.goals.open(goal.name)}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start' }}>
          <MiniProgressRing progress={goal.progress} color={ink(goal.color)} size={48} showLabel />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: 'block', fontFamily: font, fontSize: '15px', fontWeight: 700, color: colors.text.primary,
              margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {goal.name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 7px', borderRadius: radius.full, background: `${tint(ink(statusColor), 8)}`, border: `1px solid ${tint(ink(statusColor), 16)}`, fontFamily: font, fontSize: '10px', fontWeight: 700, color: statusColor }}>
                {t.status[goal.status]}
              </span>
              {totalMs > 0 && (
                <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.tertiary }}>
                  {t.goals.steps(completedMs, totalMs)}
                </span>
              )}
              {goal.target_date && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.tertiary }}>
                  <CalendarDays size={11} aria-label={t.goals.targetDate} />
                  {new Date(goal.target_date + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </span>
              )}
            </span>
          </span>
        </button>

        <ActionMenu label={t.goals.options} actions={[
          { icon: Pencil, label: t.common.edit, onSelect: onEdit },
          { icon: isPaused ? Play : Pause, label: isPaused ? t.goals.resume : t.goals.pause, onSelect: onToggleStatus },
          { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
        ]} />
      </div>
    </LifeCard>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export function LifeGoalsPage() {
  const tNav = useLifeT().nav
  const t = useLifeT()
  const {
    goals, loading,
    activeCount, completedCount, avgProgress,
    createGoal, updateGoal, deleteGoal, updateProgress,
    addMilestone, toggleMilestone, deleteMilestone,
  } = useGoals()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editGoal, setEditGoal]         = useState<Goal | null>(null)
  const [detailId, setDetailId]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)
  const [params] = useSearchParams()

  // La agenda ahora vive en Brain → Tareas (los enlaces viejos siguen funcionando)
  if (params.get('vista') === 'agenda') return <Navigate to="/life/brain?vista=tareas" replace />
  if (loading) return <GoalSkeleton />

  const fail = () => toast.error(t.common.saveError)
  const inProgress = goals.filter(g => g.status !== 'completed')
  const completed  = goals.filter(g => g.status === 'completed')
  const detailGoal = detailId ? goals.find(g => g.id === detailId) ?? null : null
  const openNew = () => { setEditGoal(null); setSheetOpen(true) }

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${tint(colors.area.goals, 9)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} style={{ color: colors.area.goals }} strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            {tNav.goals}
          </h1>
        </div>
        <button type="button" aria-label={t.goals.add} title={t.goals.add} onClick={openNew}
          style={{
            width: 40, height: 40, borderRadius: radius.full,
            background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Plus size={18} style={{ color: colors.accent.ink }} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {goals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: t.goals.active,    value: String(activeCount),    color: colors.area.goals },
            { label: t.goals.completed, value: String(completedCount), color: colors.semantic.success },
            { label: t.goals.progress,  value: `${avgProgress}%`,      color: colors.accent.ink },
          ].map(({ label, value, color }) => (
            <LifeCard key={label} style={{ textAlign: 'center', padding: '12px 8px' }}>
              <p style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color, margin: '0 0 2px' }}>{value}</p>
              <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.tertiary, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {label}
              </p>
            </LifeCard>
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <LifeCard>
          <LifeEmptyState icon={Target} iconColor={colors.area.goals}
            title={t.goals.emptyTitle} subtitle={t.goals.emptyText}
            action={{ label: t.goals.emptyAction, onClick: openNew }} />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inProgress.map(goal => (
            <motion.div key={goal.id} variants={fadeInUp}>
              <GoalCard
                goal={goal}
                onOpen={() => setDetailId(goal.id)}
                onEdit={() => { setEditGoal(goal); setSheetOpen(true) }}
                onDelete={() => setDeleteTarget(goal)}
                onToggleStatus={() => { updateGoal(goal.id, { status: goal.status === 'paused' ? 'in_progress' : 'paused' }).catch(fail) }}
              />
            </motion.div>
          ))}

          {completed.length > 0 && (
            <motion.div variants={fadeInUp}>
              <LifeCard style={{ marginTop: '4px' }}>
                <LifeSectionHeader title={t.goals.completedList(completed.length)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {completed.map(goal => (
                    <button key={goal.id} type="button" onClick={() => setDetailId(goal.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', minHeight: 40, padding: '8px 4px',
                        background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start', width: '100%', borderRadius: radius.sm,
                      }}>
                      <CheckCircle2 size={18} style={{ color: ink(goal.color), flexShrink: 0 }} strokeWidth={2} aria-hidden="true" />
                      <span style={{
                        fontFamily: font, fontSize: '14px', fontWeight: 600, color: colors.text.secondary, textDecoration: 'line-through',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {goal.name}
                      </span>
                    </button>
                  ))}
                </div>
              </LifeCard>
            </motion.div>
          )}
        </motion.div>
      )}

      <GoalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editGoal}
        onSave={async data => {
          if (editGoal) await updateGoal(editGoal.id, data)
          else await createGoal(data)
        }}
      />

      <GoalDetailSheet
        goal={detailGoal}
        open={!!detailGoal}
        onClose={() => setDetailId(null)}
        onEdit={goal => { setDetailId(null); setEditGoal(goal); setSheetOpen(true) }}
        onDelete={goal => { setDetailId(null); setDeleteTarget(goal) }}
        onToggleMilestone={ms => { toggleMilestone(ms).catch(fail) }}
        onAddMilestone={(goalId, title) => addMilestone(goalId, title)}
        onDeleteMilestone={(id, goalId) => { deleteMilestone(id, goalId).catch(fail) }}
        onUpdateProgress={(goalId, p) => { updateProgress(goalId, p).catch(fail) }}
        onUpdateStatus={(id, status) => { updateGoal(id, { status }).catch(fail) }}
      />

      <LifeConfirmDialog
        open={!!deleteTarget}
        title={t.goals.deleteTitle}
        message={deleteTarget ? t.goals.deleteText(deleteTarget.name) : ''}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) await deleteGoal(target.id).catch(fail)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
