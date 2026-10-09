import { ChevronDown } from 'lucide-react'
import { Huella } from '@/design/components/Huella'
import { SafeImage } from '../components/SafeImage'
import type { LayoutParts } from './types'
import { ModuleStack } from './ModuleStack'

/**
 * Portada: la primera pantalla completa es la tapa (huella o imagen). Abajo, sobre un degradé, el nombre, la acción
 * principal, "Guardar contacto" y una señal visible de "Más sobre mí" (evita creer que no hay nada más).
 */
export default function Portada(p: LayoutParts) {
  const image = p.look.cover.type === 'imagen' ? p.look.cover.url : undefined
  return (
    <div className="my-enter">
      {p.identity(
        <section className="mp-header mp-cover-hero">
          <div className="mp-cover-art" aria-hidden="true">
            {image
              ? <SafeImage src={image} alt="" />
              : <Huella seed={p.seed} variant={p.look.huellaVariant} spin draw className="mp-cover-huella" />}
          </div>
          <div className="mp-cover-fade" aria-hidden="true" />
          <div className="mp-cover-body">
            {p.hasAvatar && <div className="mp-avatar mp-cover-avatar my-enter-item" style={{ '--my-i': 0 } as React.CSSProperties}>{p.avatar}</div>}
            <h1 className="mp-name mp-cover-name my-enter-item" style={{ '--my-i': 1 } as React.CSSProperties}>{p.name}</h1>
            {p.descriptor && <p className="mp-descriptor">{p.descriptor}</p>}
            {p.chips}
            <div className="mp-actions my-enter-item" style={{ '--my-i': 2 } as React.CSSProperties}>
              {p.primary}
              {p.secondary}
            </div>
            {(p.blocks.length > 0 || p.bio) && (
              <a className="mp-more" href="#mas">
                {p.t.moreAboutMe} <ChevronDown size={18} aria-hidden="true" />
              </a>
            )}
          </div>
        </section>,
      )}
      <div id="mas" className="mp-cover-rest">
        {p.tags}
        {p.bio && <p className="mp-bio">{p.bio}</p>}
        <ModuleStack blocks={p.blocks} />
      </div>
    </div>
  )
}
