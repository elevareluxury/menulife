import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, MoreHorizontal, Pencil, Trash2, Pause, Play, CheckCircle2 } from 'lucide-react'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  MiniProgressRing, colors, font, radius, stagger, fadeInUp, scaleIn,
} from '../design-system'
import { useGoals, type Goal } from '../hooks/useGoals'
import { GoalSheet } from '../components/GoalSheet'
import { GoalDetailSheet } from '../components/GoalDetailSheet'

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

// ── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  in_progress: { label: 'En progreso', color: colors.area.goals },
  completed:   { label: 'Completada',  color: colors.semantic.success },
  paused:      { label: 'Pausada',     color: colors.text.quaternary },
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, onOpen, onEdit, onDelete, onToggleStatus }: {
  goal: Goal
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = STATUS_CONFIG[goal.status]
  const isPaused = goal.status === 'paused'
  const isCompleted = goal.status === 'completed'

  const completedMs = goal.milestones.filter(m => m.is_completed).length
  const totalMs = goal.milestones.length

  return (
    <LifeCard onClick={onOpen} style={{ opacity: isPaused ? 0.65 : 1, position: 'relative' }}>
      {/* Color accent line */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 3, borderRadius: `${radius.xl} 0 0 ${radius.xl}`,
        background: goal.color,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '10px' }}>
        {/* Progress ring */}
        <div onClick={e => e.stopPropagation()}>
          <MiniProgressRing progress={goal.progress} color={goal.color} size={48} showLabel />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: font, fontSize: '15px', fontWeight: 700,
            color: isCompleted ? colors.text.secondary : colors.text.primary,
            margin: '0 0 4px',
            textDecoration: isCompleted ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {goal.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '2px 7px', borderRadius: radius.full,
              background: `${status.color}14`, border: `1px solid ${status.color}28`,
            }}>
              <span style={{ fontFamily: font, fontSize: '10px', fontWeight: 700, color: status.color }}>
                {status.label}
              </span>
            </div>
            {totalMs > 0 && (
              <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.quaternary }}>
                {completedMs}/{totalMs} pasos
              </span>
            )}
            {goal.target_date && (
              <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.quaternary }}>
                🗓 {new Date(goal.target_date + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Context menu */}
        <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(v => !v)}
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
                variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
                style={{
                  position: 'absolute', right: 0, top: '32px', zIndex: 10,
                  background: colors.surface.high,
                  border: `1px solid ${colors.border.medium}`,
                  borderRadius: radius.md,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: 150, overflow: 'hidden',
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                {([
                  { icon: Pencil, label: 'Editar',   danger: false, action: () => { setMenuOpen(false); onEdit() } },
                  { icon: isPaused ? Play : Pause, label: isPaused ? 'Reanudar' : 'Pausar', danger: false, action: () => { setMenuOpen(false); onToggleStatus() } },
                  { icon: Trash2, label: 'Eliminar', danger: true,  action: () => { setMenuOpen(false); onDelete() } },
                ]).map(({ icon: Icon2, label, action, danger }) => (
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
      </div>
    </LifeCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeGoalsPage() {
  const {
    goals, loading,
    activeCount, completedCount, avgProgress,
    createGoal, updateGoal, deleteGoal, updateProgress,
    addMilestone, toggleMilestone, deleteMilestone,
  } = useGoals()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editGoal, setEditGoal]         = useState<Goal | null>(null)
  const [detailGoal, setDetailGoal]     = useState<Goal | null>(null)
  const [detailOpen, setDetailOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)

  if (loading) return <GoalSkeleton />

  const inProgress = goals.filter(g => g.status !== 'completed')
  const completed  = goals.filter(g => g.status === 'completed')

  // Always show the latest server data in the detail sheet
  const currentDetailGoal = detailGoal
    ? (goals.find(g => g.id === detailGoal.id) ?? detailGoal)
    : null

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${colors.area.goals}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} style={{ color: colors.area.goals }} strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            Goals
          </h1>
        </div>
        <button
          onClick={() => { setEditGoal(null); setSheetOpen(true) }}
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

      {/* Stats row (only when there are goals) */}
      {goals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Activas',     value: String(activeCount),    color: colors.area.goals },
            { label: 'Completadas', value: String(completedCount), color: colors.semantic.success },
            { label: 'Progreso',    value: `${avgProgress}%`,      color: colors.accent.default },
          ].map(({ label, value, color }) => (
            <LifeCard key={label} style={{ textAlign: 'center', padding: '12px 8px' }}>
              <p style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color, margin: '0 0 2px' }}>
                {value}
              </p>
              <p style={{ fontFamily: font, fontSize: '10px', fontWeight: 600, color: colors.text.quaternary, margin: 0, letterSpacing: '0.04em' }}>
                {label.toUpperCase()}
              </p>
            </LifeCard>
          ))}
        </div>
      )}

      {/* Goal list or empty state */}
      {goals.length === 0 ? (
        <LifeCard>
          <LifeEmptyState
            icon={Target}
            iconColor={colors.area.goals}
            title="Las metas dan dirección"
            subtitle="Creá tu primera meta y dividila en pasos alcanzables."
            action={{ label: 'Crear primera meta', onClick: () => { setEditGoal(null); setSheetOpen(true) } }}
          />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {inProgress.map(goal => (
            <motion.div key={goal.id} variants={fadeInUp}>
              <GoalCard
                goal={goal}
                onOpen={() => { setDetailGoal(goal); setDetailOpen(true) }}
                onEdit={() => { setEditGoal(goal); setSheetOpen(true) }}
                onDelete={() => setDeleteTarget(goal)}
                onToggleStatus={() => updateGoal(goal.id, { status: goal.status === 'paused' ? 'in_progress' : 'paused' })}
              />
            </motion.div>
          ))}

          {completed.length > 0 && (
            <motion.div variants={fadeInUp}>
              <LifeCard style={{ marginTop: '4px' }}>
                <LifeSectionHeader title={`Completadas (${completed.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {completed.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => { setDetailGoal(goal); setDetailOpen(true) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 4px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        textAlign: 'left', width: '100%',
                        borderRadius: radius.sm, transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      <CheckCircle2 size={18} style={{ color: goal.color, flexShrink: 0 }} strokeWidth={2} />
                      <span style={{
                        fontFamily: font, fontSize: '14px', fontWeight: 600,
                        color: colors.text.tertiary, textDecoration: 'line-through',
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

      {/* Create / Edit Sheet */}
      <GoalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editGoal}
        onSave={async data => {
          if (editGoal) await updateGoal(editGoal.id, data)
          else await createGoal(data)
        }}
      />

      {/* Detail Sheet */}
      <GoalDetailSheet
        goal={currentDetailGoal}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={goal => {
          setDetailOpen(false)
          setEditGoal(goal)
          setSheetOpen(true)
        }}
        onDelete={async id => {
          await deleteGoal(id)
          setDetailOpen(false)
          setDetailGoal(null)
        }}
        onToggleMilestone={toggleMilestone}
        onAddMilestone={addMilestone}
        onDeleteMilestone={deleteMilestone}
        onUpdateProgress={updateProgress}
        onUpdateStatus={async (id, status) => updateGoal(id, { status })}
      />

      {/* Delete Confirm */}
      <LifeConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar meta?"
        message={`"${deleteTarget?.name}" y todos sus pasos serán eliminados.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTarget) await deleteGoal(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
