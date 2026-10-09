import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** Texto del botón de cerrar (traducido por quien usa la hoja) */
  closeLabel: string
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Hoja que sube desde abajo en el celular y diálogo centrado en la computadora (sistema de diseño §10).
 * Atrapa el foco, cierra con Escape o tocando afuera y devuelve el foco a donde estaba.
 * Se dibuja en un portal (los objetos que flotan usan transform y romperían el position: fixed) y copia el tema
 * y el acento del lugar donde se usa.
 */
export function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [look, setLook] = useState<{ theme?: string; accent?: string }>({})
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const themed = anchor.current.closest<HTMLElement>('[data-mycen-theme]')
    const accented = anchor.current.closest<HTMLElement>('[data-mycen-accent]')
    setLook({ theme: themed?.dataset.mycenTheme ?? 'universo', accent: accented?.dataset.mycenAccent })
  }, [open])

  const ready = open && !!look.theme
  useEffect(() => {
    if (!ready) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel.current)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); return }
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [ready])

  return (
    <>
      <span ref={anchor} hidden />
      {ready && createPortal(
        <div
          className="my-sheet-backdrop"
          data-mycen-theme={look.theme}
          data-mycen-accent={look.accent}
          onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
        >
          <div ref={panel} className="my-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
            <div className="my-sheet-grip" aria-hidden="true" />
            <div className="my-sheet-head">
              <h2 id={titleId} className="my-sheet-title">{title}</h2>
              <IconButton label={closeLabel} className="my-sheet-close" onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </IconButton>
            </div>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
