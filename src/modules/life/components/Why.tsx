import { Heart } from 'lucide-react'
import { LifeConfirmDialog, colors, font, radius, tint } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { WHY_MAX } from '../lib/why'

// "¿Por qué lo hago?": la frase propia de un hábito o una meta (≤ 200, opcional). Se escribe al crear o editar,
// se ve discreta en la ficha y vuelve cuando la persona está por soltar. Soltar también está bien: nunca frena.


const labelStyle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary,
  letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px',
}

/** Campo del formulario (hábito o meta) */
export function WhyField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const w = useLifeT().why
  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor={id} style={labelStyle}>{w.label}</label>
      <textarea id={id} value={value} maxLength={WHY_MAX} rows={2} placeholder={w.placeholder}
        aria-describedby={`${id}-hint`} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 14px', boxSizing: 'border-box', borderRadius: radius.md, resize: 'vertical', minHeight: 64,
          background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
          color: colors.text.primary, fontFamily: font, fontSize: '16px', lineHeight: 1.4, outline: 'none',
        }} />
      <p id={`${id}-hint`} style={{ fontFamily: font, fontSize: '12px', color: colors.text.tertiary, margin: '6px 0 0', lineHeight: 1.45 }}>
        {w.hint}
      </p>
    </div>
  )
}

/** La frase, discreta (ficha o tarjeta). `lines` = cuántas líneas antes de cortar. */
export function WhyQuote({ why, color, lines = 2, style, as: Tag = 'p' }: {
  why: string; color?: string; lines?: number; style?: React.CSSProperties
  /** 'span' dentro de un botón */
  as?: 'p' | 'span'
}) {
  const w = useLifeT().why
  return (
    <Tag title={why} style={{
      fontFamily: font, fontSize: '12.5px', fontStyle: 'italic', color: colors.text.secondary, lineHeight: 1.45, margin: 0,
      display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden', ...style,
    }}>
      <Heart size={11} aria-hidden="true" style={{ color: color ?? colors.text.tertiary, marginInlineEnd: 5, verticalAlign: '-1px' }} />
      <span className="sr-only">{w.cardLabel}: </span>“{why}”
    </Tag>
  )
}

/**
 * Confirmación antes de soltar (archivar, desactivar o borrar). Con frase: "Lo empezaste porque: …" con
 * "Seguir intentando" / "Soltar igual". Sin frase: la confirmación de siempre.
 */
export function LetGoDialog({ open, why, title, message, confirmLabel, danger, onConfirm, onCancel }: {
  open: boolean
  why: string | null | undefined
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const w = useLifeT().why
  const has = !!why
  return (
    <LifeConfirmDialog open={open} title={title} message={message} danger={danger && !has}
      cancelLabel={has ? w.keepTrying : undefined} confirmLabel={has ? w.letGo : confirmLabel}
      onConfirm={onConfirm} onCancel={onCancel}>
      {has && (
        <div style={{
          margin: '-6px 0 20px', padding: '12px 14px', borderRadius: radius.md,
          background: tint(colors.accent.default, 8), border: `1px solid ${tint(colors.accent.default, 24)}`,
        }}>
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.accent.ink, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {w.startedBecause}
          </p>
          <p style={{ fontFamily: font, fontSize: '14px', fontStyle: 'italic', color: colors.text.primary, lineHeight: 1.5, margin: 0, overflowWrap: 'anywhere' }}>
            “{why}”
          </p>
          <p style={{ fontFamily: font, fontSize: '12px', color: colors.text.secondary, lineHeight: 1.45, margin: '8px 0 0' }}>
            {w.okToLetGo}
          </p>
        </div>
      )}
    </LifeConfirmDialog>
  )
}
