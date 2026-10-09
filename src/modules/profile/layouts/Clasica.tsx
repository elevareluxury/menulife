import { Huella } from '@/design/components/Huella'
import { SafeImage } from '../components/SafeImage'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'

/** Clásica: foto centrada con la huella orbitando alrededor y botones apilados. */
export default function Clasica(p: LayoutParts) {
  return (
    <div className="my-enter">
      {p.coverUrl && <div className="mp-cover"><SafeImage src={p.coverUrl} alt="" /></div>}
      {p.identity(<>
        <section className={`mp-header mp-cl-header${p.coverUrl ? ' has-cover' : ''}`}>
          <div className="mp-cl-orbit my-enter-item" style={{ '--my-i': 0 } as React.CSSProperties}>
            <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cl-huella" />
            <div className="mp-avatar">{p.avatar}</div>
          </div>
          <h1 className="mp-name my-enter-item" style={{ '--my-i': 1 } as React.CSSProperties}>{p.name}</h1>
          {p.descriptor && <p className="mp-descriptor my-enter-item" style={{ '--my-i': 2 } as React.CSSProperties}>{p.descriptor}</p>}
          {p.chips}
          {p.tags}
          {p.bio && <p className="mp-bio">{p.bio}</p>}
        </section>
        <div className="mp-actions my-enter-item" style={{ '--my-i': 3 } as React.CSSProperties}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} />
    </div>
  )
}
