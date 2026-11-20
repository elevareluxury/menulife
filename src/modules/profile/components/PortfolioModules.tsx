import { ExternalLink, Mail, Phone } from 'lucide-react'
import { tr } from '../lib/profileI18n'
import { isExternal } from '../lib/safeUrl'
import { urlKey } from '../lib/clickKeys'
import {
  audienceFreshness, compact, inches, readAudience, readBrands, readCredits, readMeasurements, readPress, readRepresentation,
  type AudiencePlatform, type MeasureCm,
} from '../lib/portfolio'
import { portfolioStrings } from '../lib/portfolioI18n'
import { SectionTitle, type ModuleProps } from './ProfileModules'
import { useProfileModule } from './profileModuleContext'
import { SafeImage } from './SafeImage'
import './portfolio.css'

// Portfolio profesional: medidas, audiencia (media kit), marcas, prensa, créditos y representación. Un chunk para los
// seis (sólo lo baja un perfil que los usa). Lo que no se cargó no aparece; nada se calcula ni se inventa.

const PLATFORM: Record<AudiencePlatform, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', twitch: 'Twitch', spotify: 'Spotify',
  facebook: 'Facebook', threads: 'Threads', linkedin: 'LinkedIn', pinterest: 'Pinterest', kick: 'Kick', other: '',
}

const linkProps = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {})

function heading(module: ModuleProps['module'], lang: ModuleProps['lang'], fallback: string) {
  return tr(module.title, module.translations, 'title', lang) || fallback
}

export function MeasurementsModule({ module, lang }: ModuleProps) {
  const t = portfolioStrings(lang)
  const rows = readMeasurements(module.content)
  if (!rows.length) return null
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.measurements)}>
      <SectionTitle heading={heading(module, lang, t.titles.measurements)} />
      <dl className="mp-pf-measures">
        {rows.map(r => (
          <div key={r.key} className="mp-pf-measure">
            <dt>{t.measures[r.key]}</dt>
            <dd>
              {r.cm != null
                ? <><span dir="ltr">{r.cm.toLocaleString(lang)} cm</span> <span className="mp-pf-alt" dir="ltr">{inches(r.key as MeasureCm, r.cm)}</span></>
                : r.text}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function AudienceModule({ module, lang, onAction }: ModuleProps) {
  const t = portfolioStrings(lang)
  const ctx = useProfileModule()
  const rows = readAudience(module.content)
  const fresh = audienceFreshness(module.content.as_of)
  // Sin fecha o de hace más de un año no se muestran: un número viejo engaña a quien contrata
  if (!rows.length || fresh === 'missing' || fresh === 'expired') return null
  const date = new Date(`${String(module.content.as_of)}T12:00:00`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const name = ctx?.displayName || ''
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.audience)}>
      <SectionTitle heading={heading(module, lang, t.titles.audience)} />
      <ul className="mp-pf-audience">
        {rows.map((r, i) => {
          const label = PLATFORM[r.platform] || r.handle || ''
          const body = (
            <>
              <span className="mp-pf-platform">{label}{r.handle && PLATFORM[r.platform] ? <span className="mp-pf-alt"> @{r.handle}</span> : null}</span>
              <span className="mp-pf-stats">
                {r.followers != null && <span><strong>{compact(r.followers, lang)}</strong> {t.followers}</span>}
                {r.avg_views != null && <span><strong>{compact(r.avg_views, lang)}</strong> {t.avgViews}</span>}
                {r.engagement != null && <span><strong>{r.engagement.toLocaleString(lang)} %</strong> {t.engagement}</span>}
              </span>
            </>
          )
          return (
            <li key={`${r.platform}-${i}`} className="mp-pf-row">
              {r.url
                ? <a className="mp-pf-row-link" href={r.url} {...linkProps(r.url)} onClick={() => onAction(module.id, urlKey(r.url!))}>{body}</a>
                : <div className="mp-pf-row-link">{body}</div>}
            </li>
          )
        })}
      </ul>
      <p className="mp-pf-note">
        {t.reportedBy.replace('{name}', name).replace('{date}', date).replace(/\s+/g, ' ')}
        {fresh === 'stale' && <> {t.stale}</>}
      </p>
    </section>
  )
}

export function BrandsModule({ module, lang, onAction }: ModuleProps) {
  const t = portfolioStrings(lang)
  const items = readBrands(module.content)
  if (!items.length) return null
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.brands)}>
      <SectionTitle heading={heading(module, lang, t.titles.brands)} count={items.length} />
      <ul className="mp-pf-brands">
        {items.map((b, i) => {
          const inner = b.logo_url
            ? <SafeImage className="mp-pf-logo" src={b.logo_url} alt={b.name} loading="lazy" fallback={<span className="mp-pf-brand-name">{b.name}</span>} />
            : <span className="mp-pf-brand-name">{b.name}</span>
          return (
            <li key={`${b.name}-${i}`} className="mp-pf-brand" title={b.year ? `${b.name} · ${b.year}` : b.name || undefined}>
              {b.url ? <a href={b.url} {...linkProps(b.url)} onClick={() => onAction(module.id, urlKey(b.url!))} aria-label={b.name || undefined}>{inner}</a> : inner}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function PressModule({ module, lang, onAction }: ModuleProps) {
  const t = portfolioStrings(lang)
  const items = readPress(module.content)
  if (!items.length) return null
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.press)}>
      <SectionTitle heading={heading(module, lang, t.titles.press)} count={items.length} />
      <div className="mp-pf-press">
        {items.map((p, i) => (
          <figure key={i} className="mp-pf-quote">
            <blockquote className="mp-pf-own">{p.quote}</blockquote>
            <figcaption>
              {p.url
                ? <a href={p.url} {...linkProps(p.url)} onClick={() => onAction(module.id, urlKey(p.url!))}>{p.outlet} <ExternalLink size={13} aria-hidden="true" /></a>
                : p.outlet}
              {p.date && <span className="mp-pf-alt"> · {new Date(`${p.date}T12:00:00`).toLocaleDateString(lang, { month: 'short', year: 'numeric' })}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function CreditsModule({ module, lang, onAction }: ModuleProps) {
  const t = portfolioStrings(lang)
  const items = readCredits(module.content)
  if (!items.length) return null
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.credits)}>
      <SectionTitle heading={heading(module, lang, t.titles.credits)} count={items.length} />
      <ul className="mp-pf-credits">
        {items.map((c, i) => {
          const body = (
            <>
              <span className="mp-pf-credit-title mp-pf-own">{c.title}</span>
              <span className="mp-pf-alt">{[c.role, c.company, c.year].filter(Boolean).join(' · ')}</span>
            </>
          )
          return (
            <li key={i}>
              {c.url
                ? <a className="mp-pf-credit" href={c.url} {...linkProps(c.url)} onClick={() => onAction(module.id, urlKey(c.url!))}>{body}</a>
                : <div className="mp-pf-credit">{body}</div>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function RepresentationModule({ module, lang, onAction }: ModuleProps) {
  const t = portfolioStrings(lang)
  const items = readRepresentation(module.content)
  if (!items.length) return null
  return (
    <section className="mp-card mp-pf" aria-label={heading(module, lang, t.titles.representation)}>
      <SectionTitle heading={heading(module, lang, t.titles.representation)} />
      <ul className="mp-pf-reps">
        {items.map((r, i) => (
          <li key={i} className="mp-pf-rep">
            <p className="mp-pf-rep-role">{t.roles[r.role]}{r.city && <span className="mp-pf-alt"> · {r.city}</span>}</p>
            <p className="mp-pf-rep-name mp-pf-own">{r.name}</p>
            <div className="mp-pf-rep-actions">
              {r.email && <a className="mp-pf-chip" href={`mailto:${r.email}`} onClick={() => onAction(module.id, 'email')}><Mail size={15} aria-hidden="true" /> {t.email}</a>}
              {r.phone && <a className="mp-pf-chip" href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} onClick={() => onAction(module.id, 'phone')}><Phone size={15} aria-hidden="true" /> {t.call}</a>}
              {r.url && <a className="mp-pf-chip" href={r.url} {...linkProps(r.url)} onClick={() => onAction(module.id, urlKey(r.url!))}><ExternalLink size={15} aria-hidden="true" /> {t.web}</a>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
