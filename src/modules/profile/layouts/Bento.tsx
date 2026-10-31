import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { inAt } from './motion'
import { ModuleStack } from './ModuleStack'

/**
 * Bento: tarjetas de tamaños distintos (lib/moduleSize). En el celular, 2 columnas; con lugar (compu), la identidad
 * queda fija a la izquierda y los módulos en 4 columnas a la derecha.
 */
export default function Bento(p: LayoutParts) {
  return (
    <div className="mp-bento">
      <div className="mp-bento-side">{p.identity(<>
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
      </>)}</div>
      <ModuleStack blocks={p.blocks} className="mp-bento-grid" preview={p.preview} four />
    </div>
  )
}
