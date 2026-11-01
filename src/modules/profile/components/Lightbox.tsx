import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useScrollLock } from '@/lib/scrollLock'
import './Lightbox.css'

export interface LightboxItem { url: string; caption?: string; video?: boolean }

/**
 * Visor de fotos (galería y foto suelta): flechas y Escape con el teclado; en el celular, deslizar de costado pasa
 * de foto, deslizar hacia abajo cierra y dos toques acercan (otros dos, alejan). La página de atrás queda quieta.
 */
export function Lightbox({ items, index, onIndex, onClose, labels }: {
  items: LightboxItem[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  labels: { close: string; prev: string; next: string }
}) {
  const many = items.length > 1
  const go = (d: number) => onIndex((index + d + items.length) % items.length)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  // El zoom es de la foto en la que se pidió: al pasar a otra, vuelve a tamaño normal
  const [zoomAt, setZoomAt] = useState<number | null>(null)
  const zoom = zoomAt === index
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastTap = useRef(0)
  useScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (many && e.key === 'ArrowRight') go(1)
      if (many && e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const current = items[Math.min(index, items.length - 1)]
  const down = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse') return
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }
  const move = (e: RPointerEvent) => {
    if (!start.current || zoom) return
    setDrag({ x: e.clientX - start.current.x, y: Math.max(0, e.clientY - start.current.y) })
  }
  const up = () => {
    const s = start.current
    start.current = null
    if (!s) return
    const { x, y } = drag
    setDrag({ x: 0, y: 0 })
    if (zoom) return
    if (y > 90 && y > Math.abs(x)) { onClose(); return }
    if (many && Math.abs(x) > 60 && Math.abs(x) > y) go(x < 0 ? 1 : -1)
  }
  const tap = (e: React.MouseEvent) => {
    e.stopPropagation()
    const now = Date.now()
    if (now - lastTap.current < 320) setZoomAt(z => (z === index ? null : index))
    lastTap.current = now
  }

  const dragging = drag.x !== 0 || drag.y !== 0
  const style = dragging
    ? { transform: `translate3d(${drag.x}px, ${drag.y}px, 0) scale(${1 - Math.min(drag.y, 300) / 1500})`, transition: 'none' }
    : zoom ? { transform: 'scale(2)' } : undefined

  return (
    <div className="mp-lightbox" role="dialog" aria-modal="true" aria-label={many ? `${index + 1} / ${items.length}` : current.caption || undefined}
      onClick={onClose} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      style={dragging ? { background: `rgba(0, 0, 0, ${Math.max(0.35, 0.92 - drag.y / 400)})` } : undefined}>
      <button type="button" className="mp-icon-btn mp-lightbox-close" aria-label={labels.close} onClick={onClose}>
        <X size={20} />
      </button>
      {many && (
        <>
          <button type="button" className="mp-icon-btn mp-lightbox-nav is-prev" aria-label={labels.prev} onClick={e => { e.stopPropagation(); go(-1) }}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button type="button" className="mp-icon-btn mp-lightbox-nav is-next" aria-label={labels.next} onClick={e => { e.stopPropagation(); go(1) }}>
            <ChevronRight size={22} aria-hidden="true" />
          </button>
          <span className="mp-lightbox-count" aria-hidden="true">{index + 1} / {items.length}</span>
        </>
      )}
      {current.video
        ? <video key={current.url} src={current.url} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
        : <img key={current.url} src={current.url} alt={current.caption ?? ''} className={`mp-lightbox-img${zoom ? ' is-zoomed' : ''}`} style={style} onClick={tap} draggable={false} />}
      {current.caption && <p className="mp-lightbox-caption" onClick={e => e.stopPropagation()}>{current.caption}</p>}
    </div>
  )
}
