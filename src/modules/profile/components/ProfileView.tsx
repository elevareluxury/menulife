import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Share2, UserPlus } from 'lucide-react'
import { fetchContactCard, trackProfileEvent } from '../lib/profileApi'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { isOpenNow } from '../lib/schedule'
import { downloadVCard } from '../lib/vcard'
import type { ProfileLang, ProfileModule, PublicProfile, WeekSchedule } from '../lib/profileTypes'
import { ModuleView, SocialRow } from './ProfileModules'
import { SafeImage } from './SafeImage'
import '../profile.css'

/** Agrupa redes consecutivas en una sola fila de íconos. */
type Block = { kind: 'module'; module: ProfileModule } | { kind: 'socials'; modules: ProfileModule[] }

function toBlocks(modules: ProfileModule[]): Block[] {
  const blocks: Block[] = []
  for (const m of modules) {
    const last = blocks[blocks.length - 1]
    if (m.type === 'social') {
      if (last?.kind === 'socials') last.modules.push(m)
      else blocks.push({ kind: 'socials', modules: [m] })
    } else {
      blocks.push({ kind: 'module', module: m })
    }
  }
  return blocks
}

export function ProfileView({ profile, lang, onLang, style, onToast, toast, preview = false }: {
  profile: PublicProfile
  lang: ProfileLang
  onLang: (l: ProfileLang) => void
  style: React.CSSProperties
  onToast: (msg: string) => void
  toast: string | null
  /** Vista previa en Studio: no registra eventos */
  preview?: boolean
}) {
  const t = ui(lang)
  const track: typeof trackProfileEvent = (...args) => { if (!preview) trackProfileEvent(...args) }
  const profileUrl = `${window.location.origin}/${profile.username}`
  const name = tr(profile.display_name, profile.translations, 'display_name', lang)
  const descriptor = tr(profile.descriptor, profile.translations, 'descriptor', lang)
  const bio = tr(profile.bio, profile.translations, 'bio', lang)
  const blocks = useMemo(() => toBlocks(profile.modules), [profile.modules])
  const coverSrc = safeHref(profile.cover_url)

  const hours = profile.modules.find(m => m.type === 'hours')
  const open = hours && profile.theme.show_open_status !== false
    ? isOpenNow(hours.content.schedule as WeekSchedule, (hours.content.timezone as string) ?? profile.business?.timezone)
    : null

  const primary = profile.primary_action
  // Una acción a medio completar (ej. "https://" o "mailto:") no se muestra
  const primaryHref = primary?.url && !/^(https?:\/\/|mailto:|tel:|https:\/\/wa\.me\/)$/i.test(primary.url.trim()) ? safeHref(primary.url) : null
  const reserveHref = profile.business?.reservations_enabled && profile.business.business_type !== 'retail'
    ? `/r/${profile.business.slug}/reservar` : null

  const onModuleAction = (moduleId: string) => track(profile.id, 'module_click', moduleId)

  async function share() {
    const data = { title: name, text: descriptor || name, url: profileUrl }
    if (navigator.share) {
      try {
        await navigator.share(data)
        track(profile.id, 'share')
      } catch { /* el usuario canceló */ }
      return
    }
    try {
      await navigator.clipboard.writeText(profileUrl)
      track(profile.id, 'copy_link')
      onToast(t.linkCopied)
    } catch { /* clipboard no disponible */ }
  }

  async function saveContact() {
    const card = await fetchContactCard(profile.id)
    if (!card) return
    downloadVCard(card, profileUrl)
    track(profile.id, 'vcard_download')
  }

  return (
    <main className="mp-root" style={style} lang={lang}>
      {profile.status !== 'published' && <div className="mp-banner" role="status">{t.draftBanner}</div>}

      <header className="mp-topbar">
        <Link to="/" className="mp-brand" aria-label="Mycen">mycen.</Link>
        <div className="mp-topbar-actions">
          <div className="mp-lang" role="group" aria-label={t.languageLabel}>
            <button type="button" aria-pressed={lang === 'es'} onClick={() => onLang('es')}>ES</button>
            <button type="button" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>EN</button>
          </div>
          <button type="button" className="mp-icon-btn" onClick={share} aria-label={t.share}>
            <Share2 size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      {coverSrc && (
        <div className="mp-cover"><SafeImage src={coverSrc} alt="" /></div>
      )}

      <div className="mp-container">
        <section className={`mp-header${coverSrc ? ' has-cover' : ''}`}>
          <div className="mp-avatar">
            <SafeImage src={safeHref(profile.avatar_url) ?? undefined} alt={name}
              fallback={<span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? '·'}</span>} />
          </div>
          <h1 className="mp-name">{name}</h1>
          {descriptor && <p className="mp-descriptor">{descriptor}</p>}
          {bio && <p className="mp-bio">{bio}</p>}
          {open != null && (
            <div className={`mp-status${open ? ' is-open' : ''}`}>
              <span className="mp-status-dot" aria-hidden="true" />
              {open ? t.openNow : t.closedNow}
            </div>
          )}
        </section>

        {primary && primaryHref && (
          <a className="mp-primary" href={primaryHref}
            {...(isExternal(primaryHref) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            onClick={() => track(profile.id, 'primary_action_click')}>
            {tr(null, profile.translations, 'primary_action_label', lang) || trLabel(primary.label, lang)}
          </a>
        )}

        {(reserveHref || profile.has_contact_card) && (
          <div className="mp-secondary-row">
            {reserveHref && (
              <a className="mp-btn-ghost" href={reserveHref} onClick={() => track(profile.id, 'primary_action_click')}>
                <Calendar size={17} aria-hidden="true" /> {trLabel('Reservar', lang)}
              </a>
            )}
            {profile.has_contact_card && (
              <button type="button" className="mp-btn-ghost" onClick={saveContact}>
                <UserPlus size={17} aria-hidden="true" /> {t.saveContact}
              </button>
            )}
          </div>
        )}

        <div className="mp-modules">
          {blocks.map(b => b.kind === 'socials'
            ? <SocialRow key={b.modules[0].id} modules={b.modules} onAction={id => track(profile.id, 'module_click', id)} />
            : <ModuleView key={b.module.id} module={b.module} lang={lang} onAction={onModuleAction} />)}
        </div>

        <footer className="mp-footer">
          {t.footer} · <Link to="/register">{t.createYours}</Link>
        </footer>
      </div>

      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </main>
  )
}
