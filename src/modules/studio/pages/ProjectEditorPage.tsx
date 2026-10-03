import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import type { BlockType } from '@/modules/profile/lib/projectTypes'
import { useStudio } from '../StudioContext'
import {
  deleteProject, listProjects, loadBlocks, loadProject, loadProjectState, publishProject, saveBlocks, updateProject,
} from '../lib/projectsApi'
import { friendlyError } from '../lib/studioApi'
import { ADDABLE_BLOCKS, BLOCKS } from '../lib/blockCatalog'
import { PROJECT_SLUG_RE } from '../lib/slug'
import { publicBaseUrl } from '../lib/preview'
import type { ProjectPatch, ProjectPublishState, SaveState, StudioBlock, StudioProject } from '../lib/studioTypes'
import { Button, ConfirmDialog, Drawer, ImageField, Menu, SaveIndicator, SelectField, TextField } from '../components/ui'
import { DragHandle, SortableList } from '../components/SortableList'
import { uploadMedia } from '../lib/studioApi'
import { useStudioT } from '@/i18n/app/studio'

type Load = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'ready'; project: StudioProject; blocks: StudioBlock[] }

/** Studio → Proyectos → editar. Se guarda solo; "Publicar" congela lo que ven los visitantes. */
export function ProjectEditorPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [load, setLoad] = useState<{ id: string; state: Load } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const t = useStudioT()

  useEffect(() => {
    let cancelled = false
    Promise.all([loadProject(id), loadBlocks(id)])
      .then(([project, blocks]) => {
        if (!cancelled) setLoad({ id, state: project ? { kind: 'ready', project, blocks } : { kind: 'missing' } })
      })
      .catch(() => { if (!cancelled) setLoad({ id, state: { kind: 'error' } }) })
    return () => { cancelled = true }
  }, [id, attempt])

  const state: Load = load?.id === id ? load.state : { kind: 'loading' }
  if (state.kind === 'loading') return <div className="st-center"><span className="st-spinner" aria-label={t.nav.loading} /></div>
  if (state.kind !== 'ready') {
    return (
      <div className="st-card st-empty">
        <p>{state.kind === 'missing' ? t.projects.notFound : t.projects.loadError}</p>
        {state.kind === 'error'
          ? <Button onClick={() => setAttempt(a => a + 1)}>{t.common.retry}</Button>
          : <Link className="st-btn st-btn-secondary" to="/studio/projects">{t.projects.back}</Link>}
      </div>
    )
  }
  return <ProjectEditor key={id} initial={state.project} initialBlocks={state.blocks} />
}

function ProjectEditor({ initial, initialBlocks }: { initial: StudioProject; initialBlocks: StudioBlock[] }) {
  const { userId, profile, setProjects } = useStudio()
  const t = useStudioT()
  const pt = t.projects
  const navigate = useNavigate()
  const [project, setProject] = useState(initial)
  const [blocks, setBlocks] = useState(initialBlocks)
  // El slug y el título se editan acá y se guardan sólo si son válidos
  const [slugDraft, setSlugDraft] = useState(initial.slug)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishState, setPublishState] = useState<ProjectPublishState | null>(null)
  const [busy, setBusy] = useState<'publish' | 'unpublish' | 'delete' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const pending = useRef<ProjectPatch>({})
  const blocksDirty = useRef(false)
  const blocksRef = useRef(initialBlocks)
  const savedIds = useRef(initialBlocks.map(b => b.id))
  const timer = useRef<number | null>(null)
  const inFlight = useRef(false)
  const flushRef = useRef<() => Promise<void>>(async () => undefined)
  const failed = useRef(false)

  const syncList = useCallback((p: StudioProject) => setProjects(prev => prev.map(x => (x.id === p.id ? p : x))), [setProjects])

  const refreshState = useCallback(() => {
    loadProjectState(initial.id).then(setPublishState, () => undefined)
  }, [initial.id])
  useEffect(() => { refreshState() }, [refreshState])

  const flush = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null }
    if (inFlight.current) return
    const fields = pending.current
    const doBlocks = blocksDirty.current
    if (!Object.keys(fields).length && !doBlocks) return
    pending.current = {}
    blocksDirty.current = false
    const toSave = blocksRef.current
    inFlight.current = true
    setSaveState('saving')
    try {
      if (Object.keys(fields).length) {
        const saved = await updateProject(initial.id, fields)
        setProject(p => ({ ...p, updated_at: saved.updated_at, status: saved.status }))
        syncList(saved)
      }
      if (doBlocks) {
        await saveBlocks(initial.id, toSave, savedIds.current)
        savedIds.current = toSave.map(b => b.id)
      }
      inFlight.current = false
      if (Object.keys(pending.current).length || blocksDirty.current) void flushRef.current()
      else { failed.current = false; setSaveState('saved'); setSaveError(null); refreshState() }
    } catch (e) {
      inFlight.current = false
      failed.current = true
      pending.current = { ...fields, ...pending.current }
      if (doBlocks) blocksDirty.current = true
      setSaveError(friendlyError(e))
      setSaveState('error')
    }
  }, [initial.id, refreshState, syncList])
  useEffect(() => { flushRef.current = flush }, [flush])

  const schedule = useCallback(() => {
    setSaveState('saving')
    setMessage(null)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flushRef.current() }, 700)
  }, [])

  // Al salir de la página se guarda lo pendiente; si se cierra la pestaña con cambios, el navegador avisa
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || blocksDirty.current || inFlight.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flushRef.current()
    }
  }, [])

  function patch(p: ProjectPatch, save: ProjectPatch = p) {
    setProject(prev => ({ ...prev, ...p }))
    if (Object.keys(save).length) {
      pending.current = { ...pending.current, ...save }
      schedule()
    }
  }

  function changeBlocks(next: StudioBlock[]) {
    setBlocks(next)
    blocksRef.current = next
    blocksDirty.current = true
    schedule()
  }

  function addBlock(type: BlockType) {
    setAdding(false)
    changeBlocks([...blocks, { id: crypto.randomUUID(), type, data: BLOCKS[type].initial() }])
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= blocks.length || from === to) return
    const next = [...blocks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    changeBlocks(next)
  }

  function duplicateBlock(i: number) {
    const next = [...blocks]
    next.splice(i + 1, 0, { ...blocks[i], id: crypto.randomUUID(), data: structuredClone(blocks[i].data) })
    changeBlocks(next)
  }

  /** "Texto: Una marca para…" — para los anuncios al reordenar */
  const blockLabel = (b: StudioBlock) => {
    const text = typeof b.data.text === 'string' ? b.data.text.trim().slice(0, 40) : ''
    return text ? `${pt.blockTypes[b.type]}: ${text}` : pt.blockTypes[b.type]
  }

  /** Espera a que no quede nada sin guardar. false si el guardado falló. */
  async function saveNow(): Promise<boolean> {
    for (let i = 0; i < 100; i++) {
      const idle = !inFlight.current && !Object.keys(pending.current).length && !blocksDirty.current
      if (idle) return !failed.current
      if (!inFlight.current) {
        await flush()
        if (failed.current) return false
      } else {
        await new Promise(r => window.setTimeout(r, 100))
      }
    }
    return false
  }

  async function publish() {
    setBusy('publish'); setMessage(null)
    try {
      if (!(await saveNow())) { setBusy(null); return }
      await publishProject(initial.id)
      // La lista trae lo publicado (para el portfolio de la vista previa)
      if (profile.identity_id) listProjects(profile.identity_id).then(list => setProjects(() => list), () => undefined)
      setProject(p => ({ ...p, status: 'published' }))
      setMessage(pt.published)
      refreshState()
    } catch (e) {
      setMessage(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  async function unpublish() {
    setBusy('unpublish'); setMessage(null)
    try {
      const saved = await updateProject(initial.id, { status: 'draft' })
      setProject(p => ({ ...p, status: saved.status }))
      syncList(saved)
      setMessage(pt.unpublished)
      refreshState()
    } catch (e) {
      setMessage(friendlyError(e))
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy('delete')
    try {
      pending.current = {}
      blocksDirty.current = false
      await deleteProject(initial.id)
      setProjects(prev => prev.filter(p => p.id !== initial.id))
      navigate('/studio/projects', { replace: true })
    } catch (e) {
      setMessage(friendlyError(e))
      setBusy(null)
      setConfirmDelete(false)
    }
  }

  const url = `${publicBaseUrl()}/${profile.username}/projects/${project.slug}`
  const slugValid = PROJECT_SLUG_RE.test(slugDraft)
  const titleMissing = !project.title.trim()
  const status = publishState?.status ?? project.status
  const statusText = status === 'published'
    ? (publishState?.dirty ? pt.statusDirty : pt.statusPublished)
    : status === 'archived' ? pt.statusArchived : pt.statusDraft
  const canPublish = status !== 'published' || !!publishState?.dirty

  return (
    <>
      <Link to="/studio/projects" className="st-nav-item" style={{ display: 'inline-flex', width: 'auto', marginBottom: 8 }}>
        <ArrowLeft size={16} aria-hidden="true" className="flip-rtl" /> {pt.back}
      </Link>

      <div className="st-topbar">
        <div style={{ minWidth: 0 }}>
          <h1 className="st-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title || pt.title}</h1>
          <p className="st-subtitle">
            <span className="st-badge" style={{ marginInlineEnd: 8 }}>{statusText}</span>
            <SaveIndicator state={saveState} error={saveError} onRetry={() => void flush()} />
          </p>
        </div>
        <div className="st-row" style={{ flexWrap: 'wrap' }}>
          <a className="st-btn st-btn-secondary st-btn-sm" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} aria-hidden="true" /> {pt.view}
          </a>
          <Button variant="primary" size="sm" loading={busy === 'publish'} disabled={!canPublish || titleMissing} onClick={publish}>
            {busy === 'publish' ? pt.publishing : status === 'published' ? pt.publishChanges : pt.publish}
          </Button>
        </div>
      </div>
      {message && <p className="st-help" role="status" style={{ marginTop: 0 }}>{message}</p>}

      <section className="st-card" aria-labelledby="project-details">
        <h2 id="project-details" className="st-label" style={{ margin: '0 0 12px' }}>{pt.details}</h2>
        <div className="st-stack">
          <TextField label={pt.titleLabel} required value={project.title} maxLength={160}
            error={titleMissing ? t.editor.required : null}
            onChange={v => patch({ title: v }, v.trim() ? { title: v.trim() } : {})} />
          <TextField label={pt.slugLabel} required value={slugDraft} maxLength={80}
            help={slugValid ? pt.slugHelp(url.replace(/^https?:\/\//, '')) : undefined}
            error={slugValid ? null : pt.slugInvalid}
            onChange={v => {
              const next = v.toLowerCase().replace(/\s+/g, '-')
              setSlugDraft(next)
              if (PROJECT_SLUG_RE.test(next)) patch({ slug: next })
            }} />
          <TextField label={pt.summaryLabel} help={pt.summaryHelp} multiline value={project.summary ?? ''} maxLength={500}
            onChange={v => patch({ summary: v }, { summary: v.trim() || null })} />
          <ImageField label={pt.cover} shape="wide" value={project.cover_url}
            onUpload={async f => patch({ cover_url: await uploadMedia(userId, f) })}
            onClear={() => patch({ cover_url: null })} />
          <SelectField label={pt.visibilityLabel} required value={project.visibility}
            onChange={v => patch({ visibility: v as StudioProject['visibility'] })}
            options={[
              { value: 'public', label: pt.visibilityPublic },
              { value: 'unlisted', label: pt.visibilityUnlisted },
              { value: 'private', label: pt.visibilityPrivate },
            ]} />
        </div>
      </section>

      <section aria-labelledby="project-content" style={{ marginTop: 16 }}>
        <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 id="project-content" className="st-label" style={{ margin: 0 }}>{pt.content}</h2>
          <Button size="sm" onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true" /> {pt.addBlock}</Button>
        </div>
        {blocks.length === 0 && <p className="st-card st-empty">{pt.blocksEmpty}</p>}
        <SortableList items={blocks} label={blockLabel} onMove={moveBlock} className="st-module-list">
          {(b, i, handle, drag) => {
            const def = BLOCKS[b.type]
            const label = `${pt.blockTypes[b.type]} · ${pt.blockN(i + 1)}`
            return (
              <li ref={drag.ref} style={{ ...drag.style, margin: 0 }} className={`st-card ${drag.className}`} aria-label={label}>
                <div className="st-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="st-row" style={{ fontWeight: 600, fontSize: 14, gap: 6 }}>
                    <DragHandle {...handle} />
                    <def.icon size={16} aria-hidden="true" /> {pt.blockTypes[b.type]}
                  </span>
                  <Menu label={t.sortable.options(label)} items={[
                    { icon: ArrowUp, label: t.sortable.up, disabled: i === 0, onSelect: () => moveBlock(i, i - 1) },
                    { icon: ArrowDown, label: t.sortable.down, disabled: i === blocks.length - 1, onSelect: () => moveBlock(i, i + 1) },
                    { icon: Copy, label: t.sortable.duplicate, onSelect: () => duplicateBlock(i) },
                    { icon: Trash2, label: pt.blockRemove(i + 1), danger: true, onSelect: () => changeBlocks(blocks.filter(x => x.id !== b.id)) },
                  ]} />
                </div>
                <def.Editor data={b.data} userId={userId}
                  onChange={data => changeBlocks(blocks.map(x => (x.id === b.id ? { ...x, data } : x)))} />
              </li>
            )
          }}
        </SortableList>
      </section>

      <section className="st-card" style={{ marginTop: 16 }} aria-label={pt.moreActions}>
        <div className="st-row" style={{ flexWrap: 'wrap' }}>
          {status === 'published' && (
            <Button size="sm" loading={busy === 'unpublish'} onClick={unpublish}>{pt.unpublish}</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} aria-hidden="true" /> {pt.delete}
          </Button>
        </div>
      </section>

      {adding && (
        <Drawer title={pt.addBlock} onClose={() => setAdding(false)}>
          <div className="st-library">
            {ADDABLE_BLOCKS.map(type => {
              const Icon = BLOCKS[type].icon
              return (
                <button key={type} type="button" onClick={() => addBlock(type)}>
                  <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span><strong>{pt.blockTypes[type]}</strong></span>
                </button>
              )
            })}
          </div>
        </Drawer>
      )}

      {confirmDelete && (
        <ConfirmDialog title={pt.deleteTitle} message={pt.deleteText} confirmLabel={t.common.delete} danger
          loading={busy === 'delete'} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
      )}
    </>
  )
}
