import { ChevronDown } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { SafeImage } from '../components/SafeImage'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'
import { inAt, useTilt } from './motion'

/**
 * Portada: la primera pantalla completa es la tapa (huella o imagen). Abajo, sobre un degradé, el nombre, la acción
 * principal, "Guardar contacto" y una flecha que lleva a lo de abajo (evita creer que no hay nada más; sin texto a la
 * vista, el nombre accesible es "Más sobre mí").
 */
export default function Portada(p: LayoutParts) {
  const image = p.look.cover.type === 'imagen' ? p.look.cover.url : undefined
  const tilt = useTilt<HTMLElement>(!image && !p.preview)
  return (
    <div>
      {p.identity(
        <section ref={tilt} className="mp-header mp-cover-hero">
          <div className="mp-cover-art" aria-hidden="true">
            {image
              ? <SafeImage sizing="cover" src={image} alt="" />
              : <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cover-huella" />}
          </div>
          <div className="mp-cover-fade" aria-hidden="true" />
          <div className="mp-cover-body">
            {p.hasAvatar && <div className="mp-avatar mp-cover-avatar mp-in mp-in-pop" style={inAt(0)}>{p.avatar}</div>}
            <h1 className="mp-name mp-cover-name mp-in mp-in-name" style={inAt(1)}>{p.name}{p.verifiedBadge}</h1>
            {p.descriptor && <p className="mp-descriptor mp-in" style={inAt(2)}>{p.descriptor}</p>}
            {p.chips}
            <div className="mp-actions mp-in" style={inAt(6)}>
              {p.primary}
              {p.secondary}
            </div>
            {(p.blocks.length > 0 || p.bio) && (
              <a className="mp-more mp-in" style={inAt(7)} href="#mas" aria-label={p.t.moreAboutMe}>
                <ChevronDown size={20} aria-hidden="true" />
              </a>
            )}
          </div>
        </section>,
      )}
      <div id="mas" className="mp-cover-rest">
        {p.tags}
        {p.bio && <p className="mp-bio mp-in" style={inAt(5)}>{p.bio}</p>}
        <ModuleStack blocks={p.blocks} preview={p.preview} />
      </div>
    </div>
  )
}
