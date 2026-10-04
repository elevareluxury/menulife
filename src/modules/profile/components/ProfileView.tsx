import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Globe, Share2, UserPlus } from 'lucide-react'
import { APP_LANGS, LANG_INFO, langDir } from '@/i18n/app/languages'
import { fetchContactCard, trackProfileEvent } from '../lib/profileApi'
import { tr, trLabel, ui } from '../lib/profileI18n'
import { isExternal, safeHref } from '../lib/safeUrl'
import { isOpenNow } from '../lib/schedule'
import { downloadVCard } from '../lib/vcard'
import { ensureProfileFont } from '../lib/profileTheme'
import { profileHandle, type ProfileLang, type ProfileModule, type PublicProfile, type WeekSchedule } from '../lib/profileTypes'
import { publicModuleDef, type GroupProps } from './moduleRegistry'
import type { ModuleProps } from './ProfileModules'
import { SafeImage } from './SafeImage'
import { ReportButton } from './ReportDialog'
import '../profile.css'

/** Bloques a dibujar: los tipos con `Group` (ej.: redes) se juntan si son consecutivos. */
type Block =
  | { kind: 'module'; module: ProfileModule; View: React.ComponentType<ModuleProps> }
  | { kind: 'group'; modules: ProfileModule[]; Group: React.ComponentType<GroupProps> }

function toBlocks(modules: ProfileModule[]): Block[] {
  const blocks: Block[] = []
  for (const m of modules) {
    const def = publicModuleDef(m.type)
    const last = blocks[blocks.length - 1]
    if (def?.Group) {
      if (last?.kind === 'group' && last.Group === def.Group) last.modules.push(m)
      else blocks.push({ kind: 'group', modules: [m], Group: def.Group })
    } else if (def?.View) {
      blocks.push({ kind: 'module', module: m, View: def.View })
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

export function ProfileView({ profile, lang, onLang, style, onToast, toast, preview = false, select }: {
  profile: PublicProfile
  lang: ProfileLang
  onLang: (l: ProfileLang) => void
  style: React.CSSProperties
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
  useEffect(() => { ensureProfileFont(profile.theme?.title_font) }, [profile.theme?.title_font])

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

  // Encabezado: foto, nombre, bio y acciones (en el editor de escritorio se elige como un solo bloque)
  const identityBlock = (<>
    <section className={`mp-header${coverSrc ? ' has-cover' : ''}`}>
      <div className="mp-avatar">
        <SafeImage src={safeHref(profile.avatar_url) ?? undefined} alt={name}
          fallback={<span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? '·'}</span>} />
      </div>
      <h1 className="mp-name">{name}</h1>
      {descriptor && <p className="mp-descriptor">{descriptor}</p>}
      {!!profile.tags?.length && (
        <ul className="mp-tags" aria-label={t.tags}>
          {profile.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      )}
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
  </>)

  return (
    <main className="mp-root" style={style} lang={lang} dir={langDir(lang)}>
      {profile.status !== 'published' && <div className="mp-banner" role="status">{t.draftBanner}</div>}

      <header className="mp-topbar">
        <Link to="/" className="mp-brand" aria-label="Mycen">mycen.</Link>
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

      {coverSrc && (
        <div className="mp-cover"><SafeImage src={coverSrc} alt="" /></div>
      )}

      <div className="mp-container">
        {select ? <Selectable id={IDENTITY_TARGET} select={select}>{identityBlock}</Selectable> : identityBlock}

        <div className="mp-modules">
          {blocks.map(b => {
            if (!select) {
              return b.kind === 'group'
                ? <b.Group lang={lang} key={b.modules[0].id} modules={b.modules} onAction={id => track(profile.id, 'module_click', id)} />
                : <b.View key={b.module.id} module={b.module} lang={lang} onAction={onModuleAction} />
            }
            return b.kind === 'group'
              ? <Selectable key={b.modules[0].id} id={b.modules[0].id} select={select} pickedRef={groupPickedRef}>
                  <b.Group lang={lang} modules={b.modules} onAction={id => { groupPickedRef.current = true; select.onSelect(id) }} />
                </Selectable>
              : <Selectable key={b.module.id} id={b.module.id} select={select}>
                  <b.View module={b.module} lang={lang} onAction={() => undefined} />
                </Selectable>
          })}
        </div>

        <footer className="mp-footer">
          {t.footer} · <Link to="/register">{t.createYours}</Link>
          {!preview && !profile.is_owner && profile.status === 'published' && (
            <div><ReportButton username={profileHandle(profile)} lang={lang} /></div>
          )}
        </footer>
      </div>

      {toast && <div className="mp-toast" role="status">{toast}</div>}
    </main>
  )
}
