import type { RenderedBlock } from './types'

/** Módulos uno debajo del otro (Clásica, Credencial, Portada y Editorial). Aparecen en cascada al abrir. */
export function ModuleStack({ blocks, id, className }: { blocks: RenderedBlock[]; id?: string; className?: string }) {
  if (!blocks.length) return null
  return (
    <div id={id} className={['mp-modules', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => (
        <div key={b.key} className="my-enter-item" style={{ '--my-i': 4 + i } as React.CSSProperties}>{b.node}</div>
      ))}
    </div>
  )
}
