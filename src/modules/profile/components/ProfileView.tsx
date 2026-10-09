import { lazy, Suspense, useMemo, useRef } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Globe, Share2, UserPlus } from 'lucide-react'
import { huellaSeed } from '@/lib/huella'
import { APP_LANGS, LANG_INFO, langDir } from '@/i18n/app/languages'
import { fetchContactCard, trackProfileEvent } from '../lib/profileApi'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { isOpenNow } from '../lib/schedule'
import { downloadVCard } from '../lib/vcard'
import { lookVars, profileLook, type ProfileLayout } from '../lib/profileLook'
import { profileHandle, type ProfileLang, type ProfileModule, type PublicProfile, type WeekSchedule } from '../lib/profileTypes'
import { bentoSize, publicModuleDef, type BentoSize, type GroupProps } from './moduleRegistry'
import { ProfileHuellaContext } from './profileLookContext'
import type { ModuleProps } from './ProfileModules'
import { SafeImage } from './SafeImage'
import { ReportButton } from './ReportDialog'
import type { LayoutParts, RenderedBlock } from '../layouts/types'
import '@/design/motion.css'
import '@/design/components/design.css'
import '../profile.css'
import '../layouts/layouts.css'

// Cada estructura (V1 · sistema de diseño §9) en su propio chunk: el perfil baja sólo la que usa
const LAYOUTS: Record<ProfileLayout, LazyExoticComponent<ComponentType<LayoutParts>>> = {
  credencial: lazy(() => import('../layouts/Credencial')),
  portada: lazy(() => import('../layouts/Portada')),
  editorial: lazy(() => import('../layouts/Editorial')),
  bento: lazy(() => import('../layouts/Bento')),
  clasica: lazy(() => import('../layouts/Clasica')),
}

/** Bloques a dibujar: los tipos con `Group` (ej.: redes) se juntan si son consecutivos. */
type Block =
  | { kind: 'module'; module: ProfileModule; View: React.ComponentType<ModuleProps>; size: BentoSize }
  | { kind: 'group'; modules: ProfileModule[]; Group: React.ComponentType<GroupProps>; size: BentoSize }

function toBlocks(modules: ProfileModule[]): Block[] {
  const blocks: Block[] = []
  for (const m of modules) {
    const def = publicModuleDef(m.type)
    const last = blocks[blocks.length - 1]
    if (def?.Group) {
      if (last?.kind === 'group' && last.Group === def.Group) last.modules.push(m)
      else blocks.push({ kind: 'group', modules: [m], Group: def.Group, size: bentoSize(def, m) })
    } else if (def?.View) {
      blocks.push({ kind: 'module', module: m, View: def.View, size: bentoSize(def, m) })
    }
  }
  return blocks
}

/** Id del encabezado (foto, nombre, bio y acción principal) para la selección del editor de escritorio */
export const IDENTITY_TARGET = 'identity'

/** Editor de escritorio (Fase 11): elegir un bloque haciendo clic en la vista previa, sin navegar sus links. */
export interface PreviewSelect {
  selected: string | null
  onSelect: (id: string) => void
  /** Nombre de cada bloque (módulo o IDENTITY_TARGET) para mostrar al pasar el mouse */
  labels: Record<string, string>
}

/**
 * Envoltorio seleccionable. En un grupo (ej. la fila de redes) el ítem tocado elige su propio módulo
 * (`pickedRef` lo marca el onAction del grupo); un clic en el resto del grupo elige el primero.
 */
function Selectable({ id, select, pickedRef, children }: {
  id: string
  select: PreviewSelect
  pickedRef?: React.MutableRefObject<boolean>
  children: React.ReactNode
}) {
  return (
    <div className={`mp-sel${select.selected === id ? ' is-selected' : ''}`} data-sel-id={id} data-sel-label={select.labels[id] ?? ''}
      onClickCapture={e => {
        // Los links y botones de la vista previa no navegan ni abren nada: el clic elige el bloque
        e.preventDefault()
        if (pickedRef) { pickedRef.current = false; return }
        e.stopPropagation()
        select.onSelect(id)
      }}
      onClick={pickedRef ? () => { if (!pickedRef.current) select.onSelect(id); pickedRef.current = false } : undefined}>
      {children}
    </div>
  )
}

export function ProfileView({ profile, lang, onLang, onToast, toast, preview = false, select }: {
  profile: PublicProfile
  lang: ProfileLang
  onLang: (l: ProfileLang) => void
  onToast: (msg: string) => void
  toast: string | null
  /** Vista previa en Studio: no registra eventos */
  preview?: boolean
  select?: PreviewSelect
}) {
  const t = ui(lang)
  const groupPickedRef = useRef(false)
  const track: typeof trackProfileEvent = (...args) => { if (!preview) trackProfileEvent(...args) }
  const profileUrl = `${window.location.origin}/${profileHandle(profile)}`
  const name = tr(profile.display_name, profile.translations, 'display_name', lang)
  const descriptor = tr(profile.descriptor, profile.translations, 'descriptor', lang)
  const bio = tr(profile.bio, profile.translations, 'bio', lang)
  const blocks = useMemo(() => toBlocks(profile.modules), [profile.modules])
  const coverSrc = safeHref(profile.cover_url)
  const look = useMemo(() => profileLook(profile.theme), [profile.theme])
  const Layout = LAYOUTS[look.layout]

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

  const avatarSrc = safeHref(profile.avatar_url)
  const statusText = profile.status_text?.trim()
  const chips = (statusText || profile.available || open != null) ? (
    <ul className="mp-chips">
      {statusText && <li className="my-chip"><span className="my-status-dot my-pulse" aria-hidden="true" />{statusText}</li>}
      {profile.available && <li className="my-chip mp-chip-available"><span className="my-status-dot my-pulse" aria-hidden="true" />{t.available}</li>}
      {open != null && (
        <li className={`my-chip mp-status${open ? ' is-open' : ''}`}>
          <span className="mp-status-dot" aria-hidden="true" />{open ? t.openNow : t.closedNow}
        </li>
      )}
    </ul>
  ) : null

  const primaryNode = primary && primaryHref ? (
    <a className="mp-primary" href={primaryHref}
      {...(isExternal(primaryHref) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      onClick={() => track(profile.id, 'primary_action_click')}>
      {tr(null, profile.translations, 'primary_action_label', lang) || trLabel(primary.label, lang)}
    </a>
  ) : null

  const secondaryNode = (reserveHref || profile.has_contact_card) ? (
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
  ) : null

  const rendered: RenderedBlock[] = blocks.map(b => {
    const key = b.kind === 'group' ? b.modules[0].id : b.module.id
    let node: React.ReactNode
    if (!select) {
      node = b.kind === 'group'
        ? <b.Group lang={lang} modules={b.modules} onAction={id => track(profile.id, 'module_click', id)} />
        : <b.View module={b.module} lang={lang} onAction={onModuleAction} />
    } else {
      node = b.kind === 'group'
        ? <Selectable id={key} select={select} pickedRef={groupPickedRef}>
            <b.Group lang={lang} modules={b.modules} onAction={id => { groupPickedRef.current = true; select.onSelect(id) }} />
          </Selectable>
        : <Selectable id={key} select={select}>
            <b.View module={b.module} lang={lang} onAction={() => undefined} />
          </Selectable>
    }
    return { key, size: b.size, node }
  })

  const seed = huellaSeed(profile)
  const huellaCtx = useMemo(() => ({ seed, variant: look.huellaVariant }), [seed, look.huellaVariant])
  const parts: LayoutParts = {
    look,
    seed,
    name,
    descriptor,
    bio,
    avatar: <SafeImage src={avatarSrc ?? undefined} alt={name}
      fallback={<span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? '·'}</span>} />,
    hasAvatar: !!avatarSrc,
    coverUrl: coverSrc,
    tags: profile.tags?.length ? (
      <ul className="mp-tags" aria-label={t.tags}>
        {profile.tags.map(tag => <li key={tag}>{tag}</li>)}
      </ul>
    ) : null,
    chips,
    primary: primaryNode,
    secondary: secondaryNode,
    blocks: rendered,
    identity: node => select ? <Selectable id={IDENTITY_TARGET} select={select}>{node}</Selectable> : node,
    profileUrl,
    t,
    preview,
  }

  return (
    <main className={`mp-root my-profile mp-layout-${look.layout}`} data-mycen-theme={look.mode} data-mycen-accent={look.accent}
      style={lookVars(look)} lang={lang} dir={langDir(lang)}>
      {profile.status !== 'published' && <div className="mp-banner" role="status">{t.draftBanner}</div>}

      <header className="mp-topbar">
        <Link to="/" className="mp-brand" aria-label="Mycen">mycen</Link>
        <div className="mp-topbar-actions">
          <label className="mp-lang-select" title={t.languageLabel}>
            <Globe size={15} aria-hidden="true" />
            <span aria-hidden="true">{lang.toUpperCase()}</span>
            <select value={lang} aria-label={t.languageLabel} onChange={e => onLang(e.target.value as ProfileLang)}>
              {APP_LANGS.map(code => <option key={code} value={code} lang={code}>{LANG_INFO[code].native}</option>)}
            </select>
          </label>
          <button type="button" className="mp-icon-btn" onClick={share} aria-label={t.share}>
            <Share2 size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mp-container">
        <ProfileHuellaContext.Provider value={huellaCtx}>
          <Suspense fallback={<div className="mp-layout-loading" aria-busy="true" />}>
            <Layout {...parts} />
          </Suspense>
        </ProfileHuellaContext.Provider>

        <footer className="mp-footer">
          <Link to="/" className="mp-footer-brand">mycen</Link> · <Link to="/register">{t.createIdentity}</Link>
          {!preview && !profile.is_owner && profile.status === 'published' && (
            <div><ReportButton username={profileHandle(profile)} lang={lang} /></div>
          )}
        </footer>
      </div>

      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </main>
  )
}
