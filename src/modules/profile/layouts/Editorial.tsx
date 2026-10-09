import { Huella } from '@/design/components/Huella'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'

/** Editorial: nombre enorme en Instrument Serif sobre la huella, texto con aire. Menos vidrio, más tipografía. */
export default function Editorial(p: LayoutParts) {
  return (
    <div className="my-enter mp-editorial">
      {p.identity(<>
        <section className="mp-header mp-ed-header">
          <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-ed-huella" />
          {p.hasAvatar && <div className="mp-avatar mp-ed-avatar">{p.avatar}</div>}
          <h1 className="mp-name mp-ed-name my-enter-item" style={{ '--my-i': 0 } as React.CSSProperties}>{p.name}</h1>
          {p.descriptor && <p className="mp-ed-descriptor my-enter-item" style={{ '--my-i': 1 } as React.CSSProperties}>{p.descriptor}</p>}
          {p.chips}
          {p.tags}
        </section>
        {p.bio && <p className="mp-ed-bio my-enter-item" style={{ '--my-i': 2 } as React.CSSProperties}>{p.bio}</p>}
        <div className="mp-actions my-enter-item" style={{ '--my-i': 3 } as React.CSSProperties}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} className="mp-ed-modules" />
    </div>
  )
}
