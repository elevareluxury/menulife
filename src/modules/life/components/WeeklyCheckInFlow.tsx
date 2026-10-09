import { useState } from 'react'
import { X, ArrowLeft, ArrowRight, Check, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { colors, font, radius, ink, tint } from '../design-system'
import { useGoalCheckins, type ProgressAnswer, type CheckinInput } from '../hooks/useGoalCheckins'

interface Goal {
  id: string
  name: string
}

interface WeeklyCheckInFlowProps {
  goal: Goal
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}

const PROGRESS_OPTIONS: {
  value: ProgressAnswer
  label: string
  icon: React.ComponentType<{ size?: number }>
  color: string
}[] = [
  { value: 'si',      label: 'Sí, avancé bien', icon: TrendingUp,   color: colors.semantic.success },
  { value: 'un_poco', label: 'Un poco',          icon: Zap,          color: colors.area.habits },
  { value: 'no',      label: 'No avancé',        icon: TrendingDown, color: colors.semantic.error },
]

export function WeeklyCheckInFlow({ goal, open, onClose, onCompleted }: WeeklyCheckInFlowProps) {
  const { createCheckin } = useGoalCheckins({ goalId: goal.id })

  const [step, setStep]                     = useState(1)
  const [progressAnswer, setProgressAnswer] = useState<ProgressAnswer | null>(null)
  const [didText, setDidText]               = useState('')
  const [obstacleText, setObstacleText]     = useState('')
  const [nextText, setNextText]             = useState('')
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  if (!open) return null

  const canGoNext = step === 1 ? progressAnswer !== null : true

  const handleSave = async () => {
    if (!progressAnswer) return
    setSaving(true)
    setError(null)
    try {
      const payload: CheckinInput = {
        goal_id: goal.id,
        progress_answer: progressAnswer,
        did_text: didText.trim() || undefined,
        obstacle_text: obstacleText.trim() || undefined,
        next_text: nextText.trim() || undefined,
      }
      await createCheckin(payload)
      onCompleted?.()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar el check-in')
      setSaving(false)
    }
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
    else handleSave()
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: colors.bg,
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      padding: '16px 16px 16px',
      paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: colors.surface.base,
            border: `1px solid ${colors.border.glass}`,
            color: colors.text.secondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div style={{
          fontFamily: font, fontSize: 12, fontWeight: 700,
          color: colors.text.tertiary, letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Paso {step} de 4
        </div>

        <div style={{ width: 36 }} />
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 999,
        background: colors.surface.base,
        marginBottom: 32, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${(step / 4) * 100}%`,
          background: colors.accent.default,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Goal label */}
      <div style={{
        fontFamily: font, fontSize: 11, fontWeight: 700,
        color: colors.area.brain, letterSpacing: '0.08em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        Check-in semanal
      </div>
      <div style={{
        fontFamily: font, fontSize: 20, fontWeight: 700,
        color: colors.text.primary, marginBottom: 32,
        lineHeight: 1.3,
      }}>
        {goal.name}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 1 && (
          <div>
            <p style={{
              fontFamily: font, fontSize: 18, fontWeight: 600,
              color: colors.text.primary, marginBottom: 20,
            }}>
              ¿Avanzaste en esta meta esta semana?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PROGRESS_OPTIONS.map(opt => {
                const Icon = opt.icon
                const selected = progressAnswer === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setProgressAnswer(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 18px', borderRadius: radius.lg,
                      background: selected ? `${tint(ink(opt.color), 9)}` : colors.surface.base,
                      border: `1.5px solid ${selected ? ink(opt.color) : colors.border.medium}`,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: `${tint(ink(opt.color), 13)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: ink(opt.color),
                    }}>
                      <Icon size={20} />
                    </div>
                    <span style={{
                      flex: 1, fontFamily: font, fontSize: 16, fontWeight: 600,
                      color: colors.text.primary,
                    }}>
                      {opt.label}
                    </span>
                    {selected && (
                      <Check size={20} strokeWidth={2.5} style={{ color: ink(opt.color) }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <TextStep
            title="¿Qué hiciste exactamente esta semana?"
            placeholder="Ej: Corrí 3 veces, leí 2 capítulos, tuve 2 reuniones..."
            hint="Opcional. Sé específico."
            value={didText}
            onChange={setDidText}
          />
        )}

        {step === 3 && (
          <TextStep
            title="¿Qué obstáculo encontraste?"
            placeholder="Ej: Me quedé sin tiempo el fin de semana..."
            hint="Opcional. Reconocerlos ayuda a superarlos."
            value={obstacleText}
            onChange={setObstacleText}
          />
        )}

        {step === 4 && (
          <TextStep
            title="¿Qué vas a hacer diferente la próxima semana?"
            placeholder="Ej: Reservar 30 min cada mañana para esto..."
            hint="Opcional. Un cambio concreto vale más que muchos vagos."
            value={nextText}
            onChange={setNextText}
          />
        )}
      </div>

      {error && (
        <p style={{
          fontFamily: font, fontSize: 13, color: colors.semantic.error,
          margin: '12px 0 0', textAlign: 'center',
        }}>
          {error}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {step > 1 && (
          <button
            onClick={handleBack}
            style={{
              padding: '14px 20px', borderRadius: radius.full,
              background: colors.surface.base,
              border: `1px solid ${colors.border.glass}`,
              color: colors.text.secondary,
              fontFamily: font, fontSize: 15, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <ArrowLeft size={16} />
            Atrás
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canGoNext || saving}
          style={{
            flex: 1, padding: '14px 0', borderRadius: radius.full,
            background: canGoNext && !saving
              ? colors.accent.default
              : colors.surface.base,
            border: 'none',
            color: canGoNext && !saving ? colors.accent.on : colors.text.tertiary,
            fontFamily: font, fontSize: 15, fontWeight: 700,
            cursor: canGoNext && !saving ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {saving ? 'Guardando...' : step === 4 ? 'Guardar check-in' : 'Siguiente'}
          {step < 4 && !saving && <ArrowRight size={16} />}
          {step === 4 && !saving && <Check size={16} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  )
}

function TextStep({
  title, placeholder, hint, value, onChange,
}: {
  title: string
  placeholder: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p style={{
        fontFamily: font, fontSize: 18, fontWeight: 600,
        color: colors.text.primary, marginBottom: 8,
      }}>
        {title}
      </p>
      <p style={{
        fontFamily: font, fontSize: 13, color: colors.text.tertiary,
        marginBottom: 16, lineHeight: 1.5,
      }}>
        {hint}
      </p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, 500))}
        placeholder={placeholder}
        rows={6}
        style={{
          width: '100%', padding: 14,
          background: colors.surface.base,
          border: `1px solid ${colors.border.glass}`,
          borderRadius: radius.lg,
          color: colors.text.primary,
          fontFamily: font, fontSize: 15,
          resize: 'none', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <p style={{
        fontFamily: font, fontSize: 11,
        color: value.length > 450 ? colors.semantic.error : colors.text.tertiary,
        margin: '6px 0 0', textAlign: 'right',
      }}>
        {value.length}/500
      </p>
    </div>
  )
}
