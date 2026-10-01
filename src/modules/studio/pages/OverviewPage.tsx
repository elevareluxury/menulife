import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Copy, ExternalLink, PenLine } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { loadStats } from '../lib/studioApi'
import type { DailyStat } from '../lib/studioTypes'
import { Button, PageHeader } from '../components/ui'
import { StatusPill } from '../components/shared'
import { useCopy } from '../lib/useCopy'

export function OverviewPage() {
  const { profile, modules, publicUrl, patchProfile } = useStudio()
  const [stats, setStats] = useState<DailyStat[] | null | 'error'>(null)
  const { copied, copy } = useCopy()

  useEffect(() => {
    let cancelled = false
    loadStats(profile.id, 30)
      .then(s => { if (!cancelled) setStats(s) })
      .catch(() => { if (!cancelled) setStats('error') })
    return () => { cancelled = true }
  }, [profile.id])

  const activeModules = modules.filter(m => m.visibility === 'active')
  const checklist = [
    { done: !!profile.avatar_url, label: 'Foto de perfil', to: '/studio/identity' },
    { done: !!profile.descriptor, label: 'Qué hacés (descriptor)', to: '/studio/identity' },
    { done: !!profile.bio, label: 'Una bio breve', to: '/studio/identity' },
    { done: !!profile.primary_action, label: 'Acción principal', to: '/studio/identity' },
    { done: activeModules.length > 0, label: 'Al menos un módulo visible', to: '/studio/modules' },
  ]
  const pendingItems = checklist.filter(c => !c.done)
  const views = Array.isArray(stats) ? stats.filter(s => s.event_type === 'view').reduce((a, s) => a + s.events, 0) : 0
  const actions = Array.isArray(stats)
    ? stats.filter(s => s.event_type === 'module_click' || s.event_type === 'primary_action_click').reduce((a, s) => a + s.events, 0)
    : 0
  const isPublished = profile.status === 'published'

  return (
    <>
      <PageHeader title="Tu identidad" subtitle="Cómo el mundo se conecta con vos." />

      <section className="st-card">
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <StatusPill status={profile.status} />
          {!isPublished && (
            <Button size="sm" variant="primary" onClick={() => patchProfile({ status: 'published' })}>Publicar</Button>
          )}
        </div>
        {!isPublished && (
          <p className="st-help" style={{ marginTop: 0 }}>
            {profile.status === 'draft'
              ? 'Tu perfil todavía no es público. Completalo y publicalo cuando quieras.'
              : 'Tu perfil está pausado: nadie puede verlo hasta que lo vuelvas a publicar.'}
          </p>
        )}
        <div className="st-row">
          <span className="st-url" title={publicUrl}>{publicUrl.replace(/^https?:\/\//, '')}</span>
          <Button size="sm" onClick={() => copy(publicUrl)} aria-label="Copiar link">
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </Button>
          <a className="st-btn st-btn-secondary st-btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir perfil público">
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
        <div className="st-row" style={{ marginTop: 14 }}>
          <Link to="/studio/identity" className="st-btn st-btn-secondary st-btn-sm"><PenLine size={15} aria-hidden="true" /> Editar identidad</Link>
          <Link to="/studio/exchange" className="st-btn st-btn-ghost st-btn-sm">Compartir y QR</Link>
        </div>
      </section>

      <section className="st-card">
        <h2 className="st-card-title">Últimos 30 días</h2>
        {stats === null && <p className="st-help">Cargando…</p>}
        {stats === 'error' && <p className="st-error">No pudimos cargar las métricas.</p>}
        {Array.isArray(stats) && (views === 0 && actions === 0
          ? (
            <div className="st-empty">
              <strong>Todavía no hay visitas</strong>
              {isPublished ? 'Compartí tu link o tu QR y acá vas a ver las visitas y los clicks reales.' : 'Publicá tu perfil para empezar a recibir visitas.'}
            </div>
          ) : (
            <div className="st-metrics">
              <div className="st-metric"><b>{views}</b><span>Visitas</span></div>
              <div className="st-metric"><b>{actions}</b><span>Acciones</span></div>
            </div>
          ))}
        {Array.isArray(stats) && (views > 0 || actions > 0) && (
          <Link to="/studio/analytics" className="st-btn st-btn-ghost st-btn-sm" style={{ marginTop: 10 }}>Ver analítica</Link>
        )}
      </section>

      {pendingItems.length > 0 && (
        <section className="st-card">
          <h2 className="st-card-title">Para completar tu perfil</h2>
          <ul className="st-checklist">
            {checklist.map(c => (
              <li key={c.label} className={c.done ? 'is-done' : undefined}>
                {c.done ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                {c.done ? c.label : <Link to={c.to} style={{ color: 'inherit' }}>{c.label}</Link>}
                <span className="st-sr-only">{c.done ? '(listo)' : '(pendiente)'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
