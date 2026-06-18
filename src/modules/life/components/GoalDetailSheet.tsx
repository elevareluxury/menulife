import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Plus, Trash2, Edit3, Pause, Play } from 'lucide-react'
import { LifeSheet, LifeConfirmDialog, MiniProgressRing, colors, font, radius } from '../design-system'
import type { Goal, Milestone } from '../hooks/useGoals'

interface GoalDetailSheetProps {
  goal: Goal | null
  open: boolean
  onClose: () => void
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => Promise<void>
  onToggleMilestone: (ms: Milestone) => Promise<void>
  onAddMilestone: (goalId: string, title: string) => Promise<void>
  onDeleteMilestone: (id: string, goalId: string) => Promise<void>
  onUpdateProgress: (goalId: string, progress: number) => Promise<void>
  onUpdateStatus: (goalId: string, status: string) => Promise<void>
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function GoalDetailSheet({
  goal, open, onClose, onEdit, onDelete,
  onToggleMilestone, onAddMilestone, onDeleteMilestone,
  onUpdateProgress, onUpdateStatus,
}: GoalDetailSheetProps) {
  const [newMsTitle, setNewMsTitle]     = useState('')
  const [addingMs, setAddingMs]         = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [celebrating, setCelebrating]   = useState(false)
  const prevProgress = useRef(goal?.progress ?? 0)

  if (!goal) return null

  // Detect 100% milestone
  if (goal.progress === 100 && prevProgress.current < 100 && !celebrating) {
    setCelebrating(true)
    setTimeout(() => setCelebrating(false), 2200)
  }
  prevProgress.current = goal.progress

  const hasMilestones = goal.milestones.length > 0

  const handleToggleMs = async (ms: Milestone) => {
    await onToggleMilestone(ms)
  }

  const handleAddMs = async () => {
    if (!newMsTitle.trim()) return
    setAddingMs(true)
    await onAddMilestone(goal.id, newMsTitle.trim())
    setNewMsTitle('')
    setAddingMs(false)
  }

  const STATUS_CONFIG = {
    in_progress: { label: 'En progreso', color: colors.area.goals },
    completed:   { label: 'Completada',  color: colors.semantic.success },
    paused:      { label: 'Pausada',     color: colors.text.tertiary },
  }
  const status = STATUS_CONFIG[goal.status]

  return (
    <>
      <LifeSheet open={open} onClose={onClose} title="" maxHeight="92vh">
        <div style={{ position: 'relative' }}>
          {/* Celebration overlay */}
          <AnimatePresence>
            {celebrating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: `${goal.color}18`,
                  borderRadius: radius.xl,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                >
                  <CheckCircle2 size={80} style={{ color: goal.color }} strokeWidth={1.5} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div style={{
            height: 4, borderRadius: radius.full,
            background: goal.color, marginBottom: '18px',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ flex: 1, paddingRight: '12px' }}>
              <h2 style={{ fontFamily: font, fontSize: '22px', fontWeight: 800, color: colors.text.primary, margin: '0 0 6px' }}>
                {goal.name}
              </h2>
              {goal.description && (
                <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.secondary, lineHeight: 1.5, margin: 0 }}>
                  {goal.description}
                </p>
              )}
            </div>
            <MiniProgressRing progress={goal.progress} color={goal.color} size={56} />
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{
              padding: '4px 10px', borderRadius: radius.full,
              background: `${status.color}14`, border: `1px solid ${status.color}28`,
            }}>
              <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: status.color }}>
                {status.label}
              </span>
            </div>
            {goal.target_date && (
              <div style={{
                padding: '4px 10px', borderRadius: radius.full,
                background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
              }}>
                <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 600, color: colors.text.secondary }}>
                  🗓 {formatDate(goal.target_date)}
                </span>
              </div>
            )}
          </div>

          {/* Milestones */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', marginBottom: '10px' }}>
              PASOS
            </p>

            {goal.milestones.length === 0 && (
              <p style={{ fontFamily: font, fontSize: '13px', color: colors.text.tertiary, marginBottom: '10px' }}>
                Agregá pasos para dividir tu meta en hitos alcanzables.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {goal.milestones.map(ms => (
                <div
                  key={ms.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '9px 10px', borderRadius: radius.sm,
                    background: ms.is_completed ? `${goal.color}0A` : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <button
                    onClick={() => handleToggleMs(ms)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${ms.is_completed ? goal.color : colors.border.medium}`,
                      background: ms.is_completed ? goal.color : 'transparent',
                      cursor: 'pointer', transition: 'all 0.18s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {ms.is_completed && (
                      <CheckCircle2 size={13} style={{ color: '#fff' }} strokeWidth={3} />
                    )}
                  </button>
                  <span style={{
                    flex: 1, fontFamily: font, fontSize: '14px', fontWeight: 500,
                    color: ms.is_completed ? colors.text.tertiary : colors.text.primary,
                    textDecoration: ms.is_completed ? 'line-through' : 'none',
                  }}>
                    {ms.title}
                  </span>
                  <button
                    onClick={() => onDeleteMilestone(ms.id, goal.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.4, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.4' }}
                  >
                    <Trash2 size={13} style={{ color: colors.text.secondary }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add milestone input */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                value={newMsTitle}
                onChange={e => setNewMsTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMs() }}
                placeholder="Agregar paso…"
                maxLength={100}
                style={{
                  flex: 1, padding: '9px 12px',
                  borderRadius: radius.sm,
                  background: colors.surface.high,
                  border: `1px solid ${colors.border.subtle}`,
                  color: colors.text.primary,
                  fontFamily: font, fontSize: '13px', outline: 'none',
                }}
              />
              <button
                onClick={handleAddMs}
                disabled={addingMs || !newMsTitle.trim()}
                style={{
                  width: 36, height: 36, borderRadius: radius.sm,
                  background: goal.color, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: !newMsTitle.trim() ? 0.4 : 1, transition: 'opacity 0.15s',
                }}
              >
                <Plus size={18} style={{ color: '#fff' }} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Manual progress (only if no milestones) */}
          {!hasMilestones && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: 0 }}>
                  PROGRESO MANUAL
                </p>
                <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 800, color: goal.color }}>
                  {goal.progress}%
                </span>
              </div>
              <input
                type="range" min={0} max={100}
                value={goal.progress}
                onChange={e => onUpdateProgress(goal.id, Number(e.target.value))}
                style={{ width: '100%', accentColor: goal.color, cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <button
              onClick={() => onEdit(goal)}
              style={{
                flex: 1, padding: '10px', borderRadius: radius.md,
                background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
                color: colors.text.secondary,
                fontFamily: font, fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <Edit3 size={14} /> Editar
            </button>

            <button
              onClick={() => onUpdateStatus(goal.id, goal.status === 'paused' ? 'in_progress' : 'paused')}
              style={{
                flex: 1, padding: '10px', borderRadius: radius.md,
                background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
                color: colors.text.secondary,
                fontFamily: font, fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {goal.status === 'paused' ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausar</>}
            </button>

            <button
              onClick={() => onUpdateStatus(goal.id, 'completed')}
              disabled={goal.status === 'completed'}
              style={{
                flex: 1, padding: '10px', borderRadius: radius.md,
                background: goal.status === 'completed' ? `${goal.color}18` : colors.surface.high,
                border: `1px solid ${goal.status === 'completed' ? goal.color + '40' : colors.border.medium}`,
                color: goal.status === 'completed' ? goal.color : colors.text.secondary,
                fontFamily: font, fontSize: '13px', fontWeight: 600,
                cursor: goal.status === 'completed' ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <CheckCircle2 size={14} /> {goal.status === 'completed' ? '¡Completada!' : 'Completar'}
            </button>
          </div>

          <button
            onClick={() => setDeleteConfirm(true)}
            style={{
              width: '100%', marginTop: '12px', padding: '10px',
              borderRadius: radius.md,
              background: 'rgba(239,68,68,0.06)', border: `1px solid rgba(239,68,68,0.15)`,
              color: colors.semantic.error,
              fontFamily: font, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <Trash2 size={14} /> Eliminar meta
          </button>
        </div>
      </LifeSheet>

      <LifeConfirmDialog
        open={deleteConfirm}
        title="¿Eliminar esta meta?"
        message={`"${goal.name}" y todos sus pasos serán eliminados permanentemente.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          setDeleteConfirm(false)
          await onDelete(goal.id)
          onClose()
        }}
        onCancel={() => setDeleteConfirm(false)}
        danger
      />
    </>
  )
}
