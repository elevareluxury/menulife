import { useState } from 'react'
import {
  AlignLeft, ArrowDown, FolderOpen, LayoutGrid, GalleryHorizontal, ArrowUp, Clock, Eye, EyeOff, Image, Images, Link2, MapPin, MessageSquareQuote,
  Pencil, Phone, Plus, ShoppingBag, Sparkles, Trash2, UserPlus, Users,
} from 'lucide-react'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { deleteModule, friendlyError, saveOrder, updateModule } from '../lib/studioApi'
import { buildCatalog, moduleDef, moduleDisplayTitle, moduleSummary } from '../lib/moduleCatalog'
import { useStudioT } from '@/i18n/app/studio'
import type { StudioModule } from '../lib/studioTypes'
import { Button, ConfirmDialog, Drawer, PageHeader } from '../components/ui'
import { EditTabs } from '../components/shared'
import { ModuleEditor } from '../components/ModuleEditor'

const ICONS: Record<ModuleType, typeof Link2> = {
  link: Link2, social: Users, contact: Phone, location: MapPin, image: Image, text: AlignLeft,
  featured_action: Sparkles, contact_card: UserPlus, gallery: Images, product: ShoppingBag,
  testimonials: MessageSquareQuote, hours: Clock, cards: GalleryHorizontal, project: FolderOpen, portfolio: LayoutGrid,
}

const EDITABLE: ModuleType[] = ['link', 'social', 'contact', 'location', 'image', 'text', 'featured_action', 'product', 'hours', 'gallery', 'cards', 'testimonials', 'project', 'portfolio']

export function ModulesPage() {
  const { modules, setModules } = useStudio()
  const [library, setLibrary] = useState(false)
  const [editing, setEditing] = useState<{ type: ModuleType; module: StudioModule | null } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<StudioModule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const t = useStudioT()
  const mt = t.modules
  const title = (m: StudioModule) => moduleDisplayTitle(m, t)

  async function toggleVisibility(m: StudioModule) {
    const visibility = m.visibility === 'active' ? 'hidden' : 'active'
    setBusyId(m.id); setError(null)
    setModules(prev => prev.map(x => (x.id === m.id ? { ...x, visibility } : x)))
    try {
      await updateModule(m.id, { visibility })
      setAnnounce(visibility === 'active' ? mt.nowVisible(title(m)) : mt.nowHidden(title(m)))
    } catch (e) {
      setModules(prev => prev.map(x => (x.id === m.id ? { ...x, visibility: m.visibility } : x)))
      setError(friendlyError(e))
    } finally { setBusyId(null) }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= modules.length) return
    const previous = modules
    const next = [...modules]
    ;[next[index], next[target]] = [next[target], next[index]]
    const renumbered = next.map((m, i) => ({ ...m, position: (i + 1) * 10 }))
    setModules(() => renumbered)
    setError(null)
    setAnnounce(mt.moved(title(modules[index]), target + 1, modules.length))
    try { await saveOrder(renumbered) }
    catch (e) { setModules(() => previous); setError(friendlyError(e)) }
  }

  async function remove(m: StudioModule) {
    setDeleting(true); setError(null)
    try {
      await deleteModule(m.id)
      setModules(prev => prev.filter(x => x.id !== m.id))
      setAnnounce(mt.deleted(title(m)))
      setConfirmDelete(null)
    } catch (e) {
      setError(friendlyError(e))
    } finally { setDeleting(false) }
  }

  return (
    <>
      <EditTabs />
      <PageHeader title={mt.title} subtitle={mt.subtitle}
        actions={<Button variant="primary" onClick={() => setLibrary(true)}><Plus size={16} aria-hidden="true" /> {mt.add}</Button>} />

      <p className="st-sr-only" role="status" aria-live="polite">{announce}</p>
      {error && <p className="st-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {modules.length === 0 ? (
        <div className="st-card st-empty">
          <strong>{mt.emptyTitle}</strong>
          {mt.emptyText}
          <div style={{ marginTop: 14 }}>
            <Button variant="primary" onClick={() => setLibrary(true)}><Plus size={16} aria-hidden="true" /> {mt.addFirst}</Button>
          </div>
        </div>
      ) : (
        <ol className="st-module-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {modules.map((m, i) => {
            const Icon = ICONS[m.type] ?? Link2
            const label = title(m)
            const canEdit = EDITABLE.includes(m.type)
            return (
              <li key={m.id} className={`st-module${m.visibility === 'hidden' ? ' is-hidden' : ''}`}>
                <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
                <button type="button" className="st-module-body" disabled={!canEdit}
                  onClick={() => canEdit && setEditing({ type: m.type, module: m })}
                  aria-label={canEdit ? mt.editX(label) : label}>
                  <div className="st-module-title">{label}</div>
                  <div className="st-module-sub">
                    {m.visibility === 'hidden' && <span className="st-badge" style={{ marginInlineEnd: 6 }}>{mt.hidden}</span>}
                    {moduleSummary(m, t) || moduleDef(m.type, t).label}
                  </div>
                </button>
                <div className="st-module-actions">
                  <button type="button" className="st-icon-btn" onClick={() => move(i, -1)} disabled={i === 0}
                    aria-label={mt.upX(label)}><ArrowUp size={16} /></button>
                  <button type="button" className="st-icon-btn" onClick={() => move(i, 1)} disabled={i === modules.length - 1}
                    aria-label={mt.downX(label)}><ArrowDown size={16} /></button>
                  <button type="button" className="st-icon-btn" onClick={() => toggleVisibility(m)} disabled={busyId === m.id}
                    aria-label={m.visibility === 'active' ? mt.hideX(label) : mt.showX(label)}
                    aria-pressed={m.visibility === 'hidden'}>
                    {m.visibility === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  {canEdit && (
                    <button type="button" className="st-icon-btn st-hide-on-mobile" onClick={() => setEditing({ type: m.type, module: m })}
                      aria-label={mt.editX(label)}><Pencil size={16} /></button>
                  )}
                  <button type="button" className="st-icon-btn" onClick={() => setConfirmDelete(m)}
                    aria-label={mt.deleteX(label)}><Trash2 size={16} /></button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {library && (
        <Drawer title={mt.library} onClose={() => setLibrary(false)}>
          <div className="st-library">
            {buildCatalog(t).filter(d => d.addable).map(d => {
              const Icon = ICONS[d.type]
              return (
                <button key={d.type} type="button" onClick={() => { setLibrary(false); setEditing({ type: d.type, module: null }) }}>
                  <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
                  <span><strong>{d.label}</strong><span>{d.description}</span></span>
                </button>
              )
            })}
          </div>
        </Drawer>
      )}

      {editing && <ModuleEditor type={editing.type} module={editing.module} onClose={() => setEditing(null)} />}

      {confirmDelete && (
        <ConfirmDialog
          title={mt.deleteTitle}
          message={mt.deleteText(title(confirmDelete))}
          confirmLabel={t.common.delete} danger loading={deleting}
          onConfirm={() => remove(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      )}
    </>
  )
}
