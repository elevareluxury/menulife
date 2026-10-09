import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'

/** Bento: grilla de 2 columnas; cada tipo de módulo tiene su tamaño (S, M o L) en moduleRegistry. */
export default function Bento(p: LayoutParts) {
  return (
    <div className="my-enter mp-bento">
      {p.identity(<>
        <section className="mp-header mp-bento-hero my-glass my-glass--hero">
          <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-bento-huella" />
          <div className="mp-bento-id">
            <div className="mp-avatar mp-bento-avatar">{p.avatar}</div>
            <div>
              <h1 className="mp-name mp-bento-name">{p.name}</h1>
              {p.descriptor && <p className="mp-descriptor">{p.descriptor}</p>}
            </div>
          </div>
          {p.chips}
          {p.tags}
          {p.bio && <p className="mp-bio mp-bento-bio">{p.bio}</p>}
        </section>
        <div className="mp-actions mp-bento-actions my-enter-item" style={{ '--my-i': 1 } as React.CSSProperties}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      {p.blocks.length > 0 && (
        <div className="mp-bento-grid">
          {p.blocks.map((b, i) => (
            <div key={b.key} className={`mp-b-${b.size} my-enter-item`} style={{ '--my-i': 2 + i } as React.CSSProperties}>{b.node}</div>
          ))}
        </div>
      )}
    </div>
  )
}
