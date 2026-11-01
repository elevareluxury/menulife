import { shareLink } from '@/lib/nativeFiles'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, BadgeCheck, Calendar, Globe, Mail, MessageCircle, Phone, Share2, UserPlus } from 'lucide-react'
import { generateHuella, huellaSeed, huellaToSvg } from '@/lib/huella'
import { APP_LANGS, LANG_INFO, langDir } from '@/i18n/app/languages'
import { fetchContactCard, trackProfileEvent } from '../lib/profileApi'
import { RESERVE_KEY } from '../lib/clickKeys'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { avatarFor } from '../lib/avatarAlt'
import { isOpenNow } from '../lib/schedule'
import { downloadVCard, vcardPhoto } from '../lib/vcard'
import { lookVars, profileLook } from '../lib/profileLook'
import { profileHandle, signupLink, type ProfileLang, type ProfileModule, type PublicProfile, type WeekSchedule } from '../lib/profileTypes'
import { LAYOUTS } from './profileLayouts'
import { publicModuleDef, type GroupProps } from './moduleRegistry'
import { moduleSize, type ModuleSize } from '../lib/moduleSize'
import { ProfileModuleContext } from './profileModuleContext'
import type { ModuleProps } from './ProfileModules'
import { SafeImage } from './SafeImage'
import { ReportButton } from './ReportDialog'
import type { LayoutParts, RenderedBlock } from '../layouts/types'
import '@/design/motion.css'
import '@/design/components/design.css'
import '../profile.css'
import '../layouts/layouts.css'
import '../profile-motion.css'
import { webOrigin } from '@/lib/platform'
import { brandMarkSvg } from '@/lib/brandMark'
import { ACCENT_COLORS, SECONDARY_COLORS } from '@/design/themes'

/** Links públicos del perfil (links, grupos y redes) para la tarjeta de contacto */
function publicLinks(modules: ProfileModule[]): string[] {
  const out: string[] = []
  for (const m of modules) {
    if (m.type === 'link' || m.type === 'social') { const u = safeHref(m.content.url); if (u && /^https:/.test(u)) out.push(u) }
    if (m.type === 'link_group' && Array.isArray(m.content.items)) {
      for (const i of m.content.items as { url?: string }[]) { const u = safeHref(i?.url); if (u && /^https:/.test(u)) out.push(u) }
    }
  }
  return out
}

/** Ícono de la acción principal según lo que abre (se reconoce antes de leer y da confianza) */
function primaryIcon(kind: string, href: string) {
  const h = href.toLowerCase()
  const Icon = /^https:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(h) || kind === 'whatsapp' ? MessageCircle
    : h.startsWith('mailto:') ? Mail
    : h.startsWith('tel:') ? Phone
    : kind === 'booking' || /calendly\.com|cal\.com/.test(h) ? Calendar
    : Globe
  return <Icon size={19} aria-hidden="true" className="mp-primary-icon" />
}

/** La huella de Mycen (la del ícono de la app) en los colores de la marca para el tema del perfil. Decorativa. */
function BrandMark({ mode, id, className }: { mode: 'universo' | 'amanecer'; id: string; className?: string }) {
  const svg = useMemo(() => brandMarkSvg(ACCENT_COLORS.plasma[mode].accent, SECONDARY_COLORS[mode], `-${id}`, 64), [mode, id])
  return <span aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}

// Hoja "Compartir": baja recién al tocar el botón
const ShareSheet = lazy(() => import('./ShareSheet'))

// "Elegí tu nombre" del pie: se baja sólo si alguien toca "Creá tu Mycen gratis"
const ClaimName = lazy(() => import('@/components/claim/ClaimName').then(m => ({ default: m.ClaimName })))

/** Bloques a dibujar: los tipos con `Group` (ej.: redes) se juntan si son consecutivos. */
type Block =
  | { kind: 'module'; module: ProfileModule; View: React.ComponentType<ModuleProps>; size: ModuleSize }
  | { kind: 'group'; modules: ProfileModule[]; Group: React.ComponentType<GroupProps>; size: ModuleSize }

/** `bento`: la estructura Bento (tamaños de siempre por tipo y "Destacado"); en las demás, ancho salvo que se elija otro */
function toBlocks(modules: ProfileModule[], bento: boolean): Block[] {
  const blocks: Block[] = []
  for (const m of modules) {
    const def = publicModuleDef(m.type)
    const last = blocks[blocks.length - 1]
    if (def?.Group) {
      if (last?.kind === 'group' && last.Group === def.Group) last.modules.push(m)
      else blocks.push({ kind: 'group', modules: [m], Group: def.Group, size: moduleSize(m, bento) })
    } else if (def?.View) {
      blocks.push({ kind: 'module', module: m, View: def.View, size: moduleSize(m, bento) })
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
  const profileUrl = `${webOrigin()}/${profileHandle(profile)}`
  const name = tr(profile.display_name, profile.translations, 'display_name', lang)
  const descriptor = tr(profile.descriptor, profile.translations, 'descriptor', lang)
  const bio = tr(profile.bio, profile.translations, 'bio', lang)
  const coverSrc = safeHref(profile.cover_url)
  const look = useMemo(() => profileLook(profile.theme), [profile.theme])
  const blocks = useMemo(() => toBlocks(profile.modules, look.layout === 'bento'), [profile.modules, look.layout])
  const Layout = LAYOUTS[look.layout]

  const hours = profile.modules.find(m => m.type === 'hours')
  // "Abierto/Cerrado ahora" arriba sólo en perfiles de negocio (con local vinculado o el Hub importado lo pidió): en una
  // persona con horarios de atención contradecía su estado ("Disponible" + "Cerrado ahora")
  const open = hours && (profile.business || profile.theme.show_open_status === true)
    ? isOpenNow(hours.content.schedule as WeekSchedule, (hours.content.timezone as string) ?? profile.business?.timezone)
    : null

  const primary = profile.primary_action
  // Una acción a medio completar (ej. "https://" o "mailto:") no se muestra
  const primaryHref = primary?.url && !/^(https?:\/\/|mailto:|tel:|https:\/\/wa\.me\/)$/i.test(primary.url.trim()) ? safeHref(primary.url) : null
  const reserveHref = profile.business?.reservations_enabled && profile.business.business_type !== 'retail'
    ? `/r/${profile.business.slug}/reservar` : null

  const onModuleAction = (moduleId: string, item?: string) => track(profile.id, 'module_click', moduleId, item)

  const [sharing, setSharing] = useState(false)
  const share = () => setSharing(true)
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl)
      track(profile.id, 'copy_link')
      setSharing(false)
      onToast(t.linkCopied)
      // Una vibración corta confirma en el celular (si el navegador la tiene)
      navigator.vibrate?.(15)
    } catch { /* clipboard no disponible */ }
  }
  async function nativeShare() {
    if (await shareLink(name, profileUrl, descriptor || name)) track(profile.id, 'share')
    setSharing(false)
  }
  const hasNativeShare = typeof navigator !== 'undefined' && (!!navigator.share || /Capacitor/.test(navigator.userAgent))

  async function saveContact() {
    const [card, photo] = await Promise.all([fetchContactCard(profile.id), vcardPhoto(avatarSrc)])
    if (!card) return
    downloadVCard(card, profileUrl, { photo, urls: publicLinks(profile.modules) })
    track(profile.id, 'vcard_download')
  }

  // Segunda foto: la de la mañana o la de la noche, con la hora de quien mira (se decide al abrir)
  const [openedAt] = useState(() => new Date())
  const avatarSrc = avatarFor(profile.avatar_url, profile.theme, openedAt)
  const verifiedBadge = profile.verified ? (
    <span className="mp-verified" role="img" aria-label={t.verified} title={t.verified}>
      <BadgeCheck aria-hidden="true" />
    </span>
  ) : null
  const statusText = profile.status_text?.trim()
  const chips = (statusText || profile.available || open != null) ? (
    <ul className="mp-chips mp-in">
      {/* Sólo "Disponible" lleva el punto que late; el estado va discreto (antes, dos puntos iguales competían) */}
      {statusText && <li className="my-chip mp-chip-status">{statusText}</li>}
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
      {primaryIcon(primary.kind, primaryHref)}
      {tr(null, profile.translations, 'primary_action_label', lang) || trLabel(primary.label, lang)}
    </a>
  ) : null

  const secondaryNode = (reserveHref || profile.has_contact_card) ? (
    <div className="mp-secondary-row">
      {reserveHref && (
        <a className="mp-btn-ghost" href={reserveHref} onClick={() => track(profile.id, 'primary_action_click', null, RESERVE_KEY)}>
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
        ? <b.Group lang={lang} modules={b.modules} onAction={onModuleAction} />
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
  const handle = profileHandle(profile)
  const moduleCtx = useMemo(() => ({ seed, variant: look.huellaVariant, accent: look.accent, handle, preview, displayName: name }), [seed, look.huellaVariant, look.accent, handle, preview, name])
  const parts: LayoutParts = {
    look,
    seed,
    name,
    descriptor,
    bio,
    avatar: <SafeImage sizing="avatar" src={avatarSrc ?? undefined} alt={name}
      fallback={<span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? '·'}</span>} />,
    hasAvatar: !!avatarSrc,
    coverUrl: coverSrc,
    tags: profile.tags?.length ? (
      <ul className="mp-tags mp-in" aria-label={t.tags}>
        {profile.tags.map(tag => <li key={tag}>{tag}</li>)}
      </ul>
    ) : null,
    chips,
    verifiedBadge,
    primary: primaryNode,
    secondary: secondaryNode,
    blocks: rendered,
    identity: node => select ? <Selectable id={IDENTITY_TARGET} select={select}>{node}</Selectable> : node,
    profileUrl,
    t,
    preview,
  }

  return (
    <main className={`mp-root my-profile mp-layout-${look.layout}`} data-motion={preview ? 'calm' : 'full'} data-mycen-theme={look.mode} data-mycen-tone={look.tone} data-mycen-accent={look.accent}
      style={lookVars(look)} lang={lang} dir={langDir(lang)}>
      {profile.status !== 'published' && <div className="mp-banner" role="status">{t.draftBanner}</div>}

      <header className="mp-topbar">
        {/* La persona primero: la marca es sólo la huella de Mycen, que lleva al inicio */}
        <Link to="/" className="mp-brand-mark" aria-label="Mycen"><BrandMark mode={look.mode} id="top" /></Link>
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
        <ProfileModuleContext.Provider value={moduleCtx}>
          <Suspense fallback={<div className="mp-layout-loading" aria-busy="true" />}>
            <Layout {...parts} />
          </Suspense>
        </ProfileModuleContext.Provider>

        <footer className="mp-footer">
          {/* Cada perfil compartido invita a crear el propio: un botón con la huella de Mycen, no un texto chico */}
          {preview
            ? <Link className="mp-footer-cta" to={signupLink(handle, profile.purpose)}><BrandMark mode={look.mode} id="foot" className="mp-footer-mark" />{t.createFree}</Link>
            : <FooterClaim label={t.createFree} handle={handle} purpose={profile.purpose} look={look} lang={lang} />}
          {!preview && !profile.is_owner && profile.status === 'published' && (
            <div><ReportButton username={profileHandle(profile)} lang={lang} /></div>
          )}
        </footer>
      </div>

      {sharing && (
        <Suspense fallback={null}>
          <ShareSheet open={sharing} onClose={() => setSharing(false)} url={profileUrl} name={name} t={t}
            canSaveContact={!!profile.has_contact_card} onCopy={copyLink}
            onWhatsapp={() => { track(profile.id, 'share'); setSharing(false) }}
            onSaveContact={() => { setSharing(false); void saveContact() }}
            onNative={nativeShare} hasNative={hasNativeShare} />
        </Suspense>
      )}
      {!preview && <BackToTop label={t.backToTop} seed={seed} variant={look.huellaVariant} />}
      {toast && <div className="mp-toast" role="status"><BrandMark mode={look.mode} id="toast" className="mp-toast-mark" />{toast}</div>}
    </main>
  )
}

/** "Volver arriba" con la huella del perfil: aparece después de bajar una pantalla y media */
function BackToTop({ label, seed, variant }: { label: string; seed: string; variant: ReturnType<typeof profileLook>['huellaVariant'] }) {
  const [shown, setShown] = useState(false)
  // SVG generado de la huella (sin el componente animado: pesa menos en la carga del perfil)
  const svg = useMemo(() => huellaToSvg(generateHuella(seed, variant), { colorA: 'currentColor', colorB: 'currentColor', size: 44 }), [seed, variant])
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setShown(window.scrollY > window.innerHeight * 1.5))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])
  const top = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }
  return (
    <button type="button" className={`mp-back-top${shown ? ' is-shown' : ''}`} aria-label={label} title={label} onClick={top}
      tabIndex={shown ? 0 : -1} aria-hidden={!shown}>
      <span className="mp-back-top-huella" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      <ArrowUp size={18} aria-hidden="true" className="mp-back-top-arrow" />
    </button>
  )
}

/** Pie del perfil: "Creá tu Mycen gratis" abre el campo para elegir el nombre; el registro sigue atribuido a este perfil. */
function FooterClaim({ label, handle, purpose, look, lang }: {
  label: string
  handle: string
  purpose: string | null | undefined
  look: ReturnType<typeof profileLook>
  lang: ProfileLang
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="mp-footer-cta" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <BrandMark mode={look.mode} id="foot" className="mp-footer-mark" />{label}
      </button>
      {open && (
        <div className="mp-footer-claim-box">
          <Suspense fallback={null}>
            <ClaimName from="pie" referral={{ ref: handle, purpose: purpose ?? null }} theme={look.mode} accent={look.accent} lang={lang} compact />
          </Suspense>
        </div>
      )}
    </>
  )
}
