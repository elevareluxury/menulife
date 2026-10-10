import { Link } from 'react-router-dom'
import { Check, Circle, Copy, ExternalLink, Globe2, Inbox, PenLine } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { useUnreadMessages } from '../lib/useUnreadMessages'
import { WeekCard } from '../components/WeekCard'
import { Button, PageHeader } from '../components/ui'
import { StatusPill } from '../components/shared'
import { useCopy } from '../lib/useCopy'
import { useStudioT } from '@/i18n/app/studio'
import { useEverywhereT } from '@/i18n/app/share/everywhere'
import { InstallAppButton } from '@/components/ui/InstallAppButton'
import { useCanAddToHome } from '@/hooks/useInstallPWA'
import { Huella } from '@/design'
import { huellaSeed } from '@/lib/huella'
import { profileLook } from '@/modules/profile/lib/profileLook'

export function OverviewPage() {
  const { profile, modules, publicUrl, publish, publishing, handle } = useStudio()
  const { copied, copy } = useCopy()
  const t = useStudioT()
  const o = t.overview
  const everywhere = useEverywhereT()
  // V1 · etapa 05: mensajes sin leer del formulario de contacto
  const { count: unread } = useUnreadMessages()
  const hasForm = modules.some(m => m.type === 'contact_form' && !m.deleted_at)
  const canAddToHome = useCanAddToHome()


  const activeModules = modules.filter(m => m.visibility === 'active')
  const checklist = [
    { done: !!profile.avatar_url, label: o.checkAvatar, to: '/studio/identity' },
    { done: !!profile.descriptor, label: o.checkDescriptor, to: '/studio/identity' },
    { done: !!profile.bio, label: o.checkBio, to: '/studio/identity' },
    { done: !!profile.primary_action, label: o.checkAction, to: '/studio/identity' },
    { done: activeModules.length > 0, label: o.checkModule, to: '/studio/modules' },
  ]
  const pendingItems = checklist.filter(c => !c.done)
  const isPublished = profile.status === 'published'
  const look = profileLook(profile.theme)
  const name = profile.display_name || handle

  return (
    <>
      <PageHeader title={o.title} subtitle={o.subtitle} actions={canAddToHome ? <InstallAppButton className="st-btn st-btn-ghost st-btn-sm" /> : undefined} />

      <section className="st-card">
        {/* El perfil arriba de todo: foto (o la huella), nombre, qué hace y su dirección, sobre su huella */}
        <div className="st-profile-hero" data-mycen-accent={look.accent}>
          <div className="st-profile-hero-huella" aria-hidden="true">
            <Huella seed={huellaSeed(profile)} variant={look.huellaVariant} />
          </div>
          <div className="st-profile-hero-avatar">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" width={72} height={72} />
              : <Huella seed={huellaSeed(profile)} variant={look.huellaVariant} />}
          </div>
          <div className="st-profile-hero-text">
            <h2>{name}</h2>
            {profile.descriptor && <p>{profile.descriptor}</p>}
            <p className="st-profile-hero-handle" dir="ltr">/{handle}</p>
          </div>
        </div>
        <div className="st-row" style={{ marginBottom: 14 }}>
          {isPublished && (
            <a className="st-btn st-btn-primary st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} aria-hidden="true" /> {t.exchange.openProfile}
            </a>
          )}
          <Link to="/studio/identity" className="st-btn st-btn-secondary st-btn-sm"><PenLine size={15} aria-hidden="true" /> {o.editIdentity}</Link>
        </div>
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <StatusPill status={profile.status} />
          {!isPublished && (
            <Button size="sm" variant="primary" loading={publishing} onClick={() => { void publish() }}>{o.publish}</Button>
          )}
        </div>
        {!isPublished && (
          <p className="st-help" style={{ marginTop: 0 }}>
            {profile.status === 'draft'
              ? o.draftText
              : o.pausedText}
          </p>
        )}
        <div className="st-row">
          <span className="st-url" title={publicUrl}>{publicUrl.replace(/^https?:\/\//, '')}</span>
          <Button size="sm" onClick={() => copy(publicUrl)} aria-label={o.copyLink}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </Button>
          <a className="st-btn st-btn-secondary st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label={o.openPublic}>
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="st-row" style={{ marginTop: 14 }}>
          <Link to="/studio/exchange" className="st-btn st-btn-ghost st-btn-sm">{o.shareQr}</Link>
        </div>
        <div className="st-row" style={{ marginTop: 8 }}>
          <Link to="/studio/everywhere" className="st-btn st-btn-secondary st-btn-sm"><Globe2 size={15} aria-hidden="true" /> {everywhere.title}</Link>
        </div>
      </section>

      {(unread > 0 || hasForm) && (
        <section className="st-card st-row" style={{ justifyContent: 'space-between' }} aria-label={t.messages.title}>
          <span className="st-row">
            <Inbox size={18} aria-hidden="true" />
            {unread > 0 ? <strong>{t.messages.homeUnread.replace('{n}', String(unread))}</strong> : <span className="st-help">{t.messages.homeNone}</span>}
          </span>
          <Link to="/studio/messages" className="st-btn st-btn-secondary st-btn-sm">{t.messages.title}</Link>
        </section>
      )}

      <WeekCard />

      {pendingItems.length > 0 && (
        <section className="st-card">
          <h2 className="st-card-title">{o.checklistTitle}</h2>
          <ul className="st-checklist">
            {checklist.map(c => (
              <li key={c.label} className={c.done ? 'is-done' : undefined}>
                {c.done ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                {c.done ? c.label : <Link to={c.to} style={{ color: 'inherit' }}>{c.label}</Link>}
                <span className="st-sr-only">({c.done ? t.common.done : t.common.pending})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
