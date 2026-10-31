import { useLayoutEffect, useState, type CSSProperties } from 'react'
import { packSpans } from '../lib/moduleSize'
import type { RenderedBlock } from './types'
import { inAt, useReveal } from './motion'

/** Ancho mínimo de la grilla para pasar a 4 columnas (Bento en la compu): cuadrados de ≥ 160 px; sólo con la identidad al costado */
const FOUR_COLS_FROM = 680
const GAP = 12

/**
 * Los módulos del perfil en una grilla que respeta el orden del dueño (todas las estructuras). Cada bloque ocupa lo
 * que dice su tamaño (lib/moduleSize): en una columna angosta, 2 columnas (cuadrado = 1, lo demás = toda la fila);
 * con `four` (Bento) y lugar, 4. Sin tamaños elegidos, todo va a lo ancho: igual que la lista de siempre.
 * Los que se ven al abrir entran en cascada después del encabezado; los de más abajo aparecen al llegar a ellos
 * (`useReveal`, no en la vista previa).
 */
export function ModuleStack({ blocks, id, className, preview = false, four = false }: {
  blocks: RenderedBlock[]; id?: string; className?: string; preview?: boolean; four?: boolean
}) {
  const ref = useReveal<HTMLDivElement>(blocks.map(b => b.key).join(','), !preview)
  // Se mide la grilla (no la pantalla): la vista previa de Studio es angosta aunque la compu sea ancha
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, blocks.length])
  if (!blocks.length) return null
  const cols: 2 | 4 = four && width >= FOUR_COLS_FROM ? 4 : 2
  const spans = packSpans(blocks.map(b => b.size), cols)
  const square = width ? Math.floor((width - GAP * (cols - 1)) / cols) : 0
  const style = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, '--mp-sq': square ? `${square}px` : undefined } as CSSProperties
  return (
    <div id={id} ref={ref} className={['mp-modules', className].filter(Boolean).join(' ')} data-cols={cols} style={style}>
      {blocks.map((b, i) => {
        // Un cuadrado que se estiró para no dejar hueco se dibuja como ancho
        const shape = spans[i] === 1 ? b.size : b.size === 'square' || b.size === 'vertical' ? 'wide' : b.size
        return (
          <div key={b.key} className={`mp-tile mp-s-${shape} mp-in mp-module-in`} data-size={b.size}
            style={{ ...inAt(7 + i), gridColumn: `span ${spans[i]}` }}>{b.node}</div>
        )
      })}
    </div>
  )
}
