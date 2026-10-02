import { useState, useEffect } from 'react'
import { Lightbulb, StickyNote, CheckSquare } from 'lucide-react'
import { useLifeT } from '@/i18n/app/life'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import type { BrainItem, BrainFormData, BrainItemType } from '../hooks/useBrain'

interface BrainItemSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: BrainFormData) => Promise<void>
  initial?: BrainItem | null
  initialType?: BrainItemType
}

const TYPE_OPTIONS: { type: BrainItemType; icon: typeof Lightbulb; color: string }[] = [
  { type: 'idea', icon: Lightbulb,   color: '#8B5CF6' },
  { type: 'note', icon: StickyNote,  color: '#3B82F6' },
  { type: 'task', icon: CheckSquare, color: '#22C55E' },
]

const DEFAULT: BrainFormData = { type: 'idea', title: '', content: '' }

const label: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}

export function BrainItemSheet({ open, onClose, onSave, initial, initialType }: BrainItemSheetProps) {
  const t = useLifeT()
  const s = t.brainSheet
  const [form, setForm]     = useState<BrainFormData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setForm(initial
      ? { type: initial.type, title: initial.title, content: initial.content ?? '' }
      : { ...DEFAULT, type: initialType ?? 'idea' })
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, initialType])

  const handleSave = async () => {
    if (!form.title.trim()) { setError(s.titleRequired); return }
    setSaving(true)
    try {
      await onSave({ type: form.type, title: form.title.trim(), content: form.content?.trim() || undefined })
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  const accentColor = TYPE_OPTIONS.find(o => o.type === form.type)?.color ?? '#8B5CF6'
  const titleLabel = form.type === 'task' ? s.labelTask : form.type === 'note' ? s.labelNote : s.labelIdea
  const titlePlaceholder = form.type === 'idea' ? s.placeholderIdea : form.type === 'note' ? s.placeholderNote : s.placeholderTask

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? s.editTitle : s.newTitle}>
      <div role="radiogroup" aria-label={t.brain.captureType} style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '20px',
        padding: '4px', background: colors.surface.high, borderRadius: radius.md,
      }}>
        {TYPE_OPTIONS.map(({ type, icon: Icon, color }) => (
          <button key={type} type="button" role="radio" aria-checked={form.type === type}
            onClick={() => setForm(f => ({ ...f, type }))}
            style={{
              minHeight: 40, padding: '9px 6px', borderRadius: radius.sm,
              background: form.type === type ? colors.surface.elevated : 'transparent',
              border: `1.5px solid ${form.type === type ? color + '50' : 'transparent'}`,
              color: form.type === type ? color : colors.text.secondary,
              fontFamily: font, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            }}>
            <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
            {t.brain.types[type]}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="brain-title" style={label}>{titleLabel}</label>
        <input id="brain-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder={titlePlaceholder} maxLength={100} aria-invalid={!!error && !form.title.trim()}
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${error && !form.title.trim() ? colors.semantic.error : `${accentColor}30`}`,
            color: colors.text.primary, fontFamily: font, fontSize: '16px', fontWeight: 600, outline: 'none',
          }} />
      </div>

      {form.type !== 'task' && (
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="brain-content" style={label}>{form.type === 'note' ? s.content : s.detail}</label>
          <textarea id="brain-content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder={form.type === 'note' ? s.contentPlaceholder : s.detailPlaceholder}
            rows={form.type === 'note' ? 6 : 3} maxLength={2000}
            style={{
              width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md,
              background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
              color: colors.text.primary, fontFamily: font, fontSize: '16px', outline: 'none',
              resize: 'vertical', minHeight: '72px', lineHeight: 1.6,
            }} />
        </div>
      )}

      {form.type === 'task' && <div style={{ marginBottom: '24px' }} />}

      {error && <p role="alert" style={{ fontFamily: font, fontSize: '13px', color: colors.semantic.error, marginBottom: '12px' }}>{error}</p>}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t.common.saving : initial ? s.update : s.save}
      </LifeButton>
    </LifeSheet>
  )
}
