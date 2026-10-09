import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { colors, font, radius, scaleIn, shadow } from '../design-system'

export interface MenuAction {
  icon: LucideIcon
  label: string
  onSelect: () => void
  danger?: boolean
}

/** Menú "⋯" pensado para el dedo: botón de 40px, se cierra al tocar afuera o con Escape. */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 40, height: 40, borderRadius: radius.full, border: 'none', cursor: 'pointer',
          background: open ? colors.border.subtle : 'transparent', color: colors.text.tertiary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
            style={{
              position: 'absolute', insetInlineEnd: 0, top: 42, zIndex: 20, minWidth: 160, overflow: 'hidden',
              background: colors.surface.high, border: `1px solid ${colors.border.medium}`,
              borderRadius: radius.md, boxShadow: shadow.elevated,
            }}>
            {actions.map(({ icon: Icon, label: text, onSelect, danger }) => (
              <button key={text} type="button" role="menuitem"
                onClick={() => { setOpen(false); onSelect() }}
                style={{
                  width: '100%', minHeight: 44, padding: '10px 14px', border: 'none', cursor: 'pointer',
                  background: 'none', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start',
                  fontFamily: font, fontSize: 14, fontWeight: 600,
                  color: danger ? colors.semantic.error : colors.text.secondary,
                }}>
                <Icon size={14} aria-hidden="true" /> {text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
