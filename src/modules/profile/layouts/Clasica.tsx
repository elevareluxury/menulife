import { Huella } from '@/design/components/Huella'
import { SafeImage } from '../components/SafeImage'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'
import { inAt } from './motion'

/** Clásica: foto centrada con la huella orbitando alrededor y botones apilados. */
export default function Clasica(p: LayoutParts) {
  return (
    <div>
      {p.coverUrl && <div className="mp-cover mp-in mp-in-fade" style={inAt(0)}><SafeImage sizing="column" src={p.coverUrl} alt="" /></div>}
      {p.identity(<>
        <section className={`mp-header mp-cl-header${p.coverUrl ? ' has-cover' : ''}`}>
          <div className="mp-cl-orbit mp-in mp-in-pop" style={inAt(0)}>
            <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cl-huella" />
            <div className="mp-avatar">{p.avatar}</div>
          </div>
          <h1 className="mp-name mp-in mp-in-name" style={inAt(1)}>{p.name}{p.verifiedBadge}</h1>
          {p.descriptor && <p className="mp-descriptor mp-in" style={inAt(2)}>{p.descriptor}</p>}
          {p.chips}
          {p.tags}
          {p.bio && <p className="mp-bio mp-in" style={inAt(5)}>{p.bio}</p>}
        </section>
        <div className="mp-actions mp-in" style={inAt(6)}>
          {p.primary}
          {p.secondary}
        </div>
      </>)}
      <ModuleStack blocks={p.blocks} preview={p.preview} />
    </div>
  )
}
