import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'
import { inAt } from './motion'

/** Editorial: nombre enorme en Instrument Serif sobre la huella, texto con aire. Menos vidrio, más tipografía. */
export default function Editorial(p: LayoutParts) {
  return (
    <div className="mp-editorial">
      {p.identity(<>
        <section className="mp-header mp-ed-header">
          <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-ed-huella" />
          {p.hasAvatar && <div className="mp-avatar mp-ed-avatar mp-in mp-in-pop" style={inAt(0)}>{p.avatar}</div>}
          <h1 className="mp-name mp-ed-name mp-in mp-in-name" style={inAt(1)}>{p.name}{p.verifiedBadge}</h1>
          {p.descriptor && <p className="mp-ed-descriptor mp-in" style={inAt(2)}>{p.descriptor}</p>}
          {p.chips}
          {p.tags}
        </section>
        {p.bio && <p className="mp-ed-bio mp-in" style={inAt(5)}>{p.bio}</p>}
        <div className="mp-actions mp-in" style={inAt(6)}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} className="mp-ed-modules" preview={p.preview} />
    </div>
  )
}
