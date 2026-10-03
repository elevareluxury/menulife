import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderOpen, Plus } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { createProject } from '../lib/projectsApi'
import { friendlyError } from '../lib/studioApi'
import { uniqueSlug } from '../lib/slug'
import type { StudioProject } from '../lib/studioTypes'
import { Button, Drawer, PageHeader, TextField } from '../components/ui'
import { useStudioT } from '@/i18n/app/studio'

function projectStatusLabel(p: Pick<StudioProject, 'status'>, t: ReturnType<typeof useStudioT>['projects']): string {
  return p.status === 'published' ? t.statusPublished : p.status === 'archived' ? t.statusArchived : t.statusDraft
}

/** Studio → Proyectos: la biblioteca de proyectos de la identidad (Fase 5). */
export function ProjectsPage() {
  const { profile, projects, setProjects } = useStudio()
  const t = useStudioT()
  const pt = t.projects
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    const title = name.trim()
    if (!title || !profile.identity_id) return
    setBusy(true); setError(null)
    try {
      const project = await createProject(profile.identity_id, title.slice(0, 160), uniqueSlug(title, projects.map(p => p.slug)))
      setProjects(prev => [project, ...prev])
      navigate(`/studio/projects/${project.id}`)
    } catch (e) {
      setError(friendlyError(e))
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={pt.title} subtitle={pt.subtitle}
        actions={<Button variant="primary" size="sm" onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> {pt.new}</Button>} />

      {projects.length === 0 ? (
        <div className="st-card st-empty">
          <FolderOpen size={28} aria-hidden="true" />
          <h2 style={{ fontSize: 17, margin: '10px 0 6px', color: 'var(--st-text)' }}>{pt.emptyTitle}</h2>
          <p style={{ margin: '0 0 16px' }}>{pt.emptyText}</p>
          <Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> {pt.new}</Button>
        </div>
      ) : (
        <ul className="st-module-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {projects.map(p => (
            <li key={p.id} className={`st-module${p.status === 'archived' ? ' is-hidden' : ''}`}>
              {p.cover_url
                ? <img className="st-module-icon" src={p.cover_url} alt="" style={{ objectFit: 'cover' }} />
                : <span className="st-module-icon" aria-hidden="true"><FolderOpen size={17} /></span>}
              <Link to={`/studio/projects/${p.id}`} className="st-module-body" style={{ textDecoration: 'none' }}>
                <div className="st-module-title">{p.title}</div>
                <div className="st-module-sub">{projectStatusLabel(p, pt)} · /{profile.username}/projects/{p.slug}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <Drawer title={pt.new} onClose={() => { if (!busy) { setCreating(false); setError(null) } }}
          footer={<>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t.common.cancel}</Button>
            <Button variant="primary" loading={busy} onClick={create}>{pt.create}</Button>
          </>}>
          <div className="st-stack">
            <TextField label={pt.nameLabel} required autoFocus value={name} maxLength={160}
              placeholder={pt.namePlaceholder} onChange={v => { setName(v); setError(null) }} onEnter={create} />
            {error && <p className="st-error" role="alert">{error}</p>}
          </div>
        </Drawer>
      )}
    </>
  )
}
