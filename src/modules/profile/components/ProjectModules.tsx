import { ArrowUpRight } from 'lucide-react'
import type { ProjectCard } from '../lib/projectTypes'
import { tr, ui } from '../lib/profileI18n'
import { safeHref } from '../lib/safeUrl'
import type { ProfileLang } from '../lib/profileTypes'
import type { ModuleProps } from './ProfileModules'
import { SafeImage } from './SafeImage'

// Módulos que muestran proyectos (Identity Fase 5). Las tarjetas vienen resueltas en `module.projects`
// (sólo proyectos publicados); el módulo guarda únicamente los ids.

/** Sólo rutas internas /{username}/projects/{slug} */
const cardPath = (c: ProjectCard) => (/^\/[a-z0-9][a-z0-9_-]*\/projects\/[a-z0-9-]+$/.test(c.path) ? c.path : null)

function cardText(c: ProjectCard, lang: ProfileLang) {
  return { title: tr(c.title, c.translations, 'title', lang), summary: tr(c.summary, c.translations, 'summary', lang) }
}

export function ProjectModule({ module, lang, onAction }: ModuleProps) {
  const card = module.projects?.[0]
  const path = card && cardPath(card)
  if (!card || !path) return null
  const { title, summary } = cardText(card, lang)
  const cover = safeHref(card.cover_url)
  return (
    <a className="mp-project" href={path} onClick={() => onAction(module.id)}>
      {cover && <SafeImage className="mp-project-cover" src={cover} alt="" loading="lazy" />}
      <span className="mp-project-body">
        <span className="mp-project-title">{title}</span>
        {summary && <span className="mp-project-summary">{summary}</span>}
        <span className="mp-project-cta">{ui(lang).viewProject} <ArrowUpRight size={15} aria-hidden="true" /></span>
      </span>
    </a>
  )
}

export function PortfolioModule({ module, lang, onAction }: ModuleProps) {
  const cards = (module.projects ?? []).filter(c => cardPath(c))
  if (!cards.length) return null
  const heading = tr(module.title, module.translations, 'title', lang) || ui(lang).projects
  return (
    <section aria-label={heading}>
      <h2 className="mp-card-title" style={{ padding: '0 4px' }}>{heading}</h2>
      <div className="mp-portfolio">
        {cards.map(card => {
          const { title, summary } = cardText(card, lang)
          const cover = safeHref(card.cover_url)
          return (
            <a key={card.id} className="mp-portfolio-item" href={cardPath(card)!} onClick={() => onAction(module.id)}>
              <SafeImage className="mp-portfolio-img" src={cover ?? undefined} alt="" loading="lazy"
                fallback={<span className="mp-portfolio-img" aria-hidden="true" />} />
              <span className="mp-portfolio-title">{title}</span>
              {summary && <span className="mp-portfolio-summary">{summary}</span>}
            </a>
          )
        })}
      </div>
    </section>
  )
}
