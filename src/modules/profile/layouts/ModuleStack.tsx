import type { RenderedBlock } from './types'
import { inAt, useReveal } from './motion'

/**
 * Módulos uno debajo del otro (Clásica, Credencial, Portada y Editorial). Los que se ven al abrir entran en cascada
 * después del encabezado; los de más abajo aparecen al llegar a ellos (`useReveal`, no en la vista previa).
 */
export function ModuleStack({ blocks, id, className, preview = false }: { blocks: RenderedBlock[]; id?: string; className?: string; preview?: boolean }) {
  const ref = useReveal<HTMLDivElement>(blocks.map(b => b.key).join(','), !preview)
  if (!blocks.length) return null
  return (
    <div id={id} ref={ref} className={['mp-modules', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => (
        <div key={b.key} className="mp-in mp-module-in" style={inAt(7 + i)}>{b.node}</div>
      ))}
    </div>
  )
}
