import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { inAt, useReveal } from './motion'

/** Bento: grilla de 2 columnas; cada tipo de módulo tiene su tamaño (S, M o L) en moduleRegistry. */
export default function Bento(p: LayoutParts) {
  const gridRef = useReveal<HTMLDivElement>(p.blocks.map(b => b.key).join(','), !p.preview)
  return (
    <div className="mp-bento">
      {p.identity(<>
        <section className="mp-header mp-bento-hero my-glass my-glass--hero mp-in mp-in-fade" style={inAt(0)}>
          <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-bento-huella" />
          <div className="mp-bento-id">
            <div className="mp-avatar mp-bento-avatar mp-in mp-in-pop" style={inAt(0)}>{p.avatar}</div>
            <div>
              <h1 className="mp-name mp-bento-name mp-in mp-in-name" style={inAt(1)}>{p.name}{p.verifiedBadge}</h1>
              {p.descriptor && <p className="mp-descriptor mp-in" style={inAt(2)}>{p.descriptor}</p>}
            </div>
          </div>
          {p.chips}
          {p.tags}
          {p.bio && <p className="mp-bio mp-bento-bio mp-in" style={inAt(5)}>{p.bio}</p>}
        </section>
        <div className="mp-actions mp-bento-actions mp-in" style={inAt(6)}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      {p.blocks.length > 0 && (
        <div className="mp-bento-grid" ref={gridRef}>
          {p.blocks.map((b, i) => (
            <div key={b.key} className={`mp-b-${b.size} mp-in mp-module-in`} style={inAt(7 + i)}>{b.node}</div>
          ))}
        </div>
      )}
    </div>
  )
}
