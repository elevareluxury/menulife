import { useState, useEffect } from 'react'
import { Lightbulb, StickyNote, CheckSquare } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import type { BrainItem, BrainFormData, BrainItemType } from '../hooks/useBrain'

interface BrainItemSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: BrainFormData) => Promise<void>
  initial?: BrainItem | null
  initialType?: BrainItemType
}

const TYPE_OPTIONS: { type: BrainItemType; label: string; icon: typeof Lightbulb; color: string }[] = [
  { type: 'idea', label: 'Idea',  icon: Lightbulb,   color: '#8B5CF6' },
  { type: 'note', label: 'Nota',  icon: StickyNote,   color: '#3B82F6' },
  { type: 'task', label: 'Tarea', icon: CheckSquare,  color: '#22C55E' },
]

const DEFAULT: BrainFormData = { type: 'idea', title: '', content: '' }

export function BrainItemSheet({ open, onClose, onSave, initial, initialType }: BrainItemSheetProps) {
  const [form, setForm]   = useState<BrainFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({ type: initial.type, title: initial.title, content: initial.content ?? '' })
      } else {
        setForm({ ...DEFAULT, type: initialType ?? 'idea' })
      }
      setError('')
    }
  }, [open, initial, initialType])

  const handleSave = async () => {
    if (!form.title.trim()) { setError('El título es requerido'); return }
    setSaving(true)
    try {
      await onSave({
        type: form.type,
        title: form.title.trim(),
        content: form.content?.trim() || undefined,
      })
      onClose()
    } catch { setError('Error al guardar. Intentá de nuevo.') }
    finally { setSaving(false) }
  }

  const accentColor = TYPE_OPTIONS.find(t => t.type === form.type)?.color ?? '#8B5CF6'

  return (
    <LifeSheet
      open={open}
      onClose={onClose}
      title={initial ? 'Editar' : 'Nuevo pensamiento'}
    >
      {/* Type selector */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px', marginBottom: '20px',
        padding: '4px',
        background: colors.surface.high,
        borderRadius: radius.md,
      }}>
        {TYPE_OPTIONS.map(({ type, label, icon: Icon, color }) => (
          <button
            key={type}
            onClick={() => setForm(f => ({ ...f, type }))}
            style={{
              padding: '9px 6px', borderRadius: radius.sm,
              background: form.type === type ? colors.surface.elevated : 'transparent',
              border: `1.5px solid ${form.type === type ? color + '50' : 'transparent'}`,
              color: form.type === type ? color : colors.text.tertiary,
              fontFamily: font, fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}
          >
            <Icon size={13} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          {form.type === 'task' ? 'TAREA' : form.type === 'note' ? 'TÍTULO' : 'IDEA'}
        </label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={
            form.type === 'idea' ? '¿Qué se te ocurrió?' :
            form.type === 'note' ? 'Título de la nota...' :
            '¿Qué tenés que hacer?'
          }
          maxLength={100}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${error && !form.title.trim() ? colors.semantic.error : `${accentColor}30`}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '15px', fontWeight: 600, outline: 'none',
          }}
        />
      </div>

      {/* Content (for notes and ideas) */}
      {form.type !== 'task' && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
            {form.type === 'note' ? 'CONTENIDO' : 'DETALLE (opcional)'}
          </label>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={form.type === 'note' ? 'Escribí acá…' : '¿Algo más que quieras recordar?'}
            rows={form.type === 'note' ? 5 : 3}
            maxLength={2000}
            style={{
              width: '100%', padding: '12px 14px', boxSizing: 'border-box',
              borderRadius: radius.md,
              background: colors.surface.high,
              border: `1px solid ${colors.border.medium}`,
              color: colors.text.primary,
              fontFamily: font, fontSize: '14px', outline: 'none',
              resize: 'vertical', minHeight: '72px', lineHeight: 1.6,
            }}
          />
        </div>
      )}

      {form.type === 'task' && <div style={{ marginBottom: '24px' }} />}

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar'}
      </LifeButton>
    </LifeSheet>
  )
}
