import { Link } from 'react-router-dom'
import { BarChart3, ChevronRight, FolderOpen, Inbox, Layers, LayoutGrid, LogOut, Palette, Settings, UserRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStudio } from '../StudioContext'
import { useUnreadMessages } from '../lib/useUnreadMessages'
import { FullscreenPreviewButton, PreviewSwitcher } from '../components/PreviewPane'
import { PageHeader } from '../components/ui'
import { useStudioT } from '@/i18n/app/studio'

export function PreviewPage() {
  const { publicUrl } = useStudio()
  const t = useStudioT()
  return (
    <>
      <PageHeader title={t.preview.title} subtitle={t.preview.subtitle}
        actions={<>
          <FullscreenPreviewButton />
          <a className="st-btn st-btn-secondary st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">{t.common.open}</a>
        </>} />
      <PreviewSwitcher />
    </>
  )
}

export function MorePage() {
  const { business } = useStudio()
  const { count: unread } = useUnreadMessages()
  const signOut = useAuthStore(s => s.signOut)
  const t = useStudioT()
  const items = [
    { to: '/studio/messages', label: t.nav.messages, icon: Inbox },
    { to: '/studio/modules', label: t.nav.modules, icon: LayoutGrid },
    { to: '/studio/projects', label: t.nav.projects, icon: FolderOpen },
    { to: '/studio/appearance', label: t.nav.appearance, icon: Palette },
    { to: '/studio/analytics', label: t.nav.analytics, icon: BarChart3 },
    { to: '/studio/settings', label: t.nav.settings, icon: Settings },
    { to: '/studio/spaces', label: t.nav.spaces, icon: Layers },
  ]
  return (
    <>
      <PageHeader title={t.more.title} />
      <nav className="st-card" style={{ padding: 6 }} aria-label={t.more.options}>
        {items.map(i => (
          <Link key={i.to} to={i.to} className="st-nav-item" style={{ justifyContent: 'space-between' }}>
            <span className="st-row"><i.icon size={18} aria-hidden="true" /> {i.label}
              {i.to === '/studio/messages' && unread > 0 && (
                <span className="st-unread" aria-label={t.messages.unread.replace('{n}', String(unread))}>{unread > 99 ? '99+' : unread}</span>
              )}
            </span>
            <ChevronRight size={16} aria-hidden="true" className="flip-rtl" />
          </Link>
        ))}
      </nav>
      <nav className="st-card" style={{ padding: 6 }} aria-label={t.more.others}>
        {business && <a className="st-nav-item" href="/dashboard"><LayoutGrid size={18} aria-hidden="true" /> {t.nav.business}</a>}
        <a className="st-nav-item" href="/life"><UserRound size={18} aria-hidden="true" /> {t.nav.life}</a>
        <button type="button" className="st-nav-item" style={{ border: 0, background: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={() => { void signOut() }}>
          <LogOut size={18} aria-hidden="true" className="flip-rtl" /> {t.nav.signOut}
        </button>
      </nav>
    </>
  )
}
