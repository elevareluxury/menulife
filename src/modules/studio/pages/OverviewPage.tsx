import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Copy, ExternalLink, PenLine } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { loadStats } from '../lib/studioApi'
import type { DailyStat } from '../lib/studioTypes'
import { Button, PageHeader } from '../components/ui'
import { StatusPill } from '../components/shared'
import { useCopy } from '../lib/useCopy'
import { useStudioT } from '@/i18n/app/studio'

export function OverviewPage() {
  const { profile, modules, publicUrl, publish, publishing } = useStudio()
  const [stats, setStats] = useState<DailyStat[] | null | 'error'>(null)
  const { copied, copy } = useCopy()
  const t = useStudioT()
  const o = t.overview

  useEffect(() => {
    let cancelled = false
    loadStats(profile.id, 30)
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => { if (!cancelled) setStats('error') })
    return () => { cancelled = true }
  }, [profile.id])

  const activeModules = modules.filter(m => m.visibility === 'active')
  const checklist = [
    { done: !!profile.avatar_url, label: o.checkAvatar, to: '/studio/identity' },
    { done: !!profile.descriptor, label: o.checkDescriptor, to: '/studio/identity' },
    { done: !!profile.bio, label: o.checkBio, to: '/studio/identity' },
    { done: !!profile.primary_action, label: o.checkAction, to: '/studio/identity' },
    { done: activeModules.length > 0, label: o.checkModule, to: '/studio/modules' },
  ]
  const pendingItems = checklist.filter(c => !c.done)
  const views = Array.isArray(stats) ? stats.filter(s => s.event_type === 'view').reduce((a, s) => a + s.events, 0) : 0
  const actions = Array.isArray(stats)
    ? stats.filter(s => s.event_type === 'module_click' || s.event_type === 'primary_action_click').reduce((a, s) => a + s.events, 0)
    : 0
  const isPublished = profile.status === 'published'

  return (
    <>
      <PageHeader title={o.title} subtitle={o.subtitle} />

      <section className="st-card">
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
          <Link to="/studio/identity" className="st-btn st-btn-secondary st-btn-sm"><PenLine size={15} aria-hidden="true" /> {o.editIdentity}</Link>
          <Link to="/studio/exchange" className="st-btn st-btn-ghost st-btn-sm">{o.shareQr}</Link>
        </div>
      </section>

      <section className="st-card">
        <h2 className="st-card-title">{o.last30}</h2>
        {stats === null && <p className="st-help">{t.common.loading}</p>}
        {stats === 'error' && <p className="st-error">{o.statsError}</p>}
        {Array.isArray(stats) && (views === 0 && actions === 0
          ? (
            <div className="st-empty">
              <strong>{o.noVisits}</strong>
              {isPublished ? o.noVisitsPublished : o.noVisitsDraft}
            </div>
          ) : (
            <div className="st-metrics">
              <div className="st-metric"><b>{views}</b><span>{o.visits}</span></div>
              <div className="st-metric"><b>{actions}</b><span>{o.actions}</span></div>
            </div>
          ))}
        {Array.isArray(stats) && (views > 0 || actions > 0) && (
          <Link to="/studio/analytics" className="st-btn st-btn-ghost st-btn-sm" style={{ marginTop: 10 }}>{o.seeAnalytics}</Link>
        )}
      </section>

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
