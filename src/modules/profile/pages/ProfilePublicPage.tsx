import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Calendar, Share2, UserPlus } from 'lucide-react'
import { isReservedUsername } from '@/lib/reservedUsernames'
import { fetchContactCard, fetchPublicProfile, trackProfileEvent } from '../lib/profileApi'
import { initialLang, saveLang, tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { isOpenNow } from '../lib/schedule'
import { QUIET, themeVars } from '../lib/profileTheme'
import { downloadVCard } from '../lib/vcard'
import type { ProfileLang, ProfileLookup, ProfileModule, PublicProfile, WeekSchedule } from '../lib/profileTypes'
import { ModuleView, SocialRow } from '../components/ProfileModules'
import { SafeImage } from '../components/SafeImage'
import '../profile.css'

type LoadState = { kind: 'loading' } | { kind: 'error' } | ProfileLookup

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

function setMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

export function ProfilePublicPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  // El resultado se guarda junto a la clave que lo pidió: si cambia el slug, vuelve a "loading" sin setState en el effect
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null)
  const [lang, setLang] = useState<ProfileLang>(() => initialLang('es'))
  const [toast, setToast] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (isReservedUsername(slug)) { navigate('/', { replace: true }); return }
    let cancelled = false
    const key = `${slug}#${attempt}`
    fetchPublicProfile(slug)
      .then(result => {
        if (cancelled) return
        if (result.kind === 'redirect') {
          navigate(`/${result.username}${window.location.search}`, { replace: true })
          return
        }
        setLoaded({ key, state: result })
      })
      .catch(() => { if (!cancelled) setLoaded({ key, state: { kind: 'error' } }) })
    return () => { cancelled = true }
  }, [slug, attempt, navigate])

  const state: LoadState = loaded?.key === `${slug}#${attempt}` ? loaded.state : { kind: 'loading' }

  const profile = state.kind === 'found' ? state.profile : null

  // Visita: una vez por perfil cargado (la RPC descarta bots, duplicados y al dueño)
  useEffect(() => {
    if (profile?.status === 'published') trackProfileEvent(profile.id, 'view')
  }, [profile?.id, profile?.status])

  // Título y descripción de la pestaña
  useEffect(() => {
    if (!profile) return
    const prevTitle = document.title
    const name = tr(profile.display_name, profile.translations, 'display_name', lang)
    document.title = `${name} · Mycen`
    setMeta('description', tr(profile.bio, profile.translations, 'bio', lang).slice(0, 160) || name)
    return () => { document.title = prevTitle }
  }, [profile, lang])

  // Fondo del body acorde al tema (evita bordes blancos al hacer scroll)
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = profile?.theme.mode === 'light' ? QUIET.ivory : QUIET.obsidian
    return () => { document.body.style.background = prev }
  }, [profile?.theme.mode])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const changeLang = (next: ProfileLang) => { setLang(next); saveLang(next) }

  const vars = themeVars(profile?.theme)
  const t = ui(lang)

  if (state.kind === 'loading') return <ProfileSkeleton style={vars} />
  if (state.kind !== 'found' || !profile) {
    const copy = state.kind === 'unavailable'
      ? { title: t.unavailableTitle, text: t.unavailableText }
      : state.kind === 'error'
        ? { title: t.errorTitle, text: t.errorText }
        : { title: t.notFoundTitle, text: t.notFoundText }
    return (
      <main className="mp-root" style={vars}>
        <div className="mp-state">
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
          {state.kind === 'error'
            ? <button type="button" className="mp-primary" style={{ width: 'auto' }} onClick={() => setAttempt(a => a + 1)}>{t.retry}</button>
            : <Link className="mp-primary" style={{ width: 'auto' }} to="/register">{t.createYours}</Link>}
        </div>
      </main>
    )
  }

  return (
    <ProfileView
      profile={profile} lang={lang} onLang={changeLang} style={vars}
      onToast={showToast} toast={toast}
    />
  )
}

function ProfileView({ profile, lang, onLang, style, onToast, toast }: {
  profile: PublicProfile
  lang: ProfileLang
  onLang: (l: ProfileLang) => void
  style: React.CSSProperties
  onToast: (msg: string) => void
  toast: string | null
}) {
  const t = ui(lang)
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
  const primaryHref = safeHref(primary?.url)
  const reserveHref = profile.business?.reservations_enabled && profile.business.business_type !== 'retail'
    ? `/r/${profile.business.slug}/reservar` : null

  const onModuleAction = (moduleId: string) => trackProfileEvent(profile.id, 'module_click', moduleId)

  async function share() {
    const data = { title: name, text: descriptor || name, url: profileUrl }
    if (navigator.share) {
      try {
        await navigator.share(data)
        trackProfileEvent(profile.id, 'share')
      } catch { /* el usuario canceló */ }
      return
    }
    try {
      await navigator.clipboard.writeText(profileUrl)
      trackProfileEvent(profile.id, 'copy_link')
      onToast(t.linkCopied)
    } catch { /* clipboard no disponible */ }
  }

  async function saveContact() {
    const card = await fetchContactCard(profile.id)
    if (!card) return
    downloadVCard(card, profileUrl)
    trackProfileEvent(profile.id, 'vcard_download')
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
            onClick={() => trackProfileEvent(profile.id, 'primary_action_click')}>
            {trLabel(primary.label, lang)}
          </a>
        )}

        {(reserveHref || profile.has_contact_card) && (
          <div className="mp-secondary-row">
            {reserveHref && (
              <a className="mp-btn-ghost" href={reserveHref} onClick={() => trackProfileEvent(profile.id, 'primary_action_click')}>
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
            ? <SocialRow key={b.modules[0].id} modules={b.modules} onAction={id => trackProfileEvent(profile.id, 'module_click', id)} />
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

function ProfileSkeleton({ style }: { style: React.CSSProperties }) {
  return (
    <main className="mp-root" style={style} aria-busy="true">
      <div className="mp-container" style={{ paddingTop: 72 }}>
        <div className="mp-skeleton" style={{ width: 104, height: 104, borderRadius: '50%', margin: '0 auto 18px' }} />
        <div className="mp-skeleton" style={{ width: '60%', height: 34, margin: '0 auto 10px' }} />
        <div className="mp-skeleton" style={{ width: '40%', height: 16, margin: '0 auto 28px' }} />
        <div className="mp-skeleton" style={{ height: 56, marginBottom: 12 }} />
        <div className="mp-skeleton" style={{ height: 64, marginBottom: 12 }} />
        <div className="mp-skeleton" style={{ height: 64 }} />
      </div>
    </main>
  )
}
