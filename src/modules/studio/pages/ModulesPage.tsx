import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, LayoutTemplate, Link2, Monitor, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { useStudio } from '../StudioContext'
import { moduleDef, moduleSummary } from '../lib/moduleCatalog'
import { useModuleActions } from '../lib/useModuleActions'
import { useStudioT } from '@/i18n/app/studio'
import type { StudioModule } from '../lib/studioTypes'
import { Button, ConfirmDialog, Menu, PageHeader } from '../components/ui'
import { DragHandle, SortableList } from '../components/SortableList'
import { EditTabs } from '../components/shared'
import { ModuleEditor } from '../components/ModuleEditor'
import { clearDraft, readDraft, writeDraft } from '@/lib/editDraft'
import { ModuleLibrary } from '../components/ModuleLibrary'
import { TemplatePicker } from '../components/TemplatePicker'
import { isTemplatePending } from '../lib/templates'
import { EDITABLE_MODULES, MODULE_ICONS, useScheduleBadge } from '../lib/moduleUi'

export function ModulesPage() {
  const { modules, profile } = useStudio()
  const [library, setLibrary] = useState(false)
  const [templates, setTemplates] = useState(false)
  const [templateNote, setTemplateNote] = useState('')
  // El editor abierto se recuerda: si el celular recarga la pestaña al volver, se reabre (editDraft.ts)
  const openKey = `studio-open:${profile.id}`
  const [editing, setEditingState] = useState<{ type: ModuleType; module: StudioModule | null } | null>(() => {
    const open = readDraft<{ type: ModuleType; moduleId: string | null }>(openKey)
    if (!open) return null
    const module = open.moduleId ? modules.find(m => m.id === open.moduleId) ?? null : null
    return open.moduleId && !module ? null : { type: open.type, module }
  })
  const setEditing = (next: { type: ModuleType; module: StudioModule | null } | null) => {
    setEditingState(next)
    if (next) writeDraft(openKey, { type: next.type, moduleId: next.module?.id ?? null })
    else clearDraft(openKey)
  }
  const [confirmDelete, setConfirmDelete] = useState<StudioModule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toggleVisibility, moveTo, duplicate, remove, busyId, error, announce, title } = useModuleActions()
  const scheduleBadge = useScheduleBadge()
  const t = useStudioT()
  const mt = t.modules
  const pendingCount = modules.filter(isTemplatePending).length

  async function confirmRemove(m: StudioModule) {
    setDeleting(true)
    if (await remove(m)) setConfirmDelete(null)
    setDeleting(false)
  }

  return (
    <>
      <EditTabs />
      <PageHeader title={mt.title} subtitle={mt.subtitle}
        actions={<>
          {/* Editor de escritorio de 3 paneles (Fase 11) */}
          <Link to="/studio/editor" className="st-btn st-btn-secondary st-desktop-only"><Monitor size={16} aria-hidden="true" /> {t.editor3.open}</Link>
          <Button variant="primary" onClick={() => setLibrary(true)}><Plus size={16} aria-hidden="true" /> {mt.add}</Button>
        </>} />

      <p className="st-sr-only" role="status" aria-live="polite">{announce || templateNote}</p>
      {pendingCount > 0 && (
        <div className="st-card st-pending-note">
          <strong>{t.templates.checklistTitle}</strong>
          <span className="st-help">{t.templates.checklistText(pendingCount)}</span>
        </div>
      )}
      {error && <p className="st-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {modules.length === 0 ? (
        <div className="st-card st-empty">
          <strong>{mt.emptyTitle}</strong>
          {mt.emptyText}
          <div className="st-row" style={{ marginTop: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setLibrary(true)}><Plus size={16} aria-hidden="true" /> {mt.addFirst}</Button>
            <Button onClick={() => setTemplates(true)}><LayoutTemplate size={16} aria-hidden="true" /> {t.templates.use}</Button>
          </div>
        </div>
      ) : (<>
        <div className="st-row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button size="sm" variant="ghost" onClick={() => setTemplates(true)}><LayoutTemplate size={15} aria-hidden="true" /> {t.templates.use}</Button>
        </div>
        <SortableList items={modules} label={title} onMove={(from, to) => void moveTo(from, to, false)} className="st-module-list">
          {(m, i, handle, drag) => {
            const Icon = MODULE_ICONS[m.type] ?? Link2
            const label = title(m)
            const canEdit = EDITABLE_MODULES.includes(m.type)
            const pending = isTemplatePending(m)
            return (
              <li ref={drag.ref} style={drag.style} className={`st-module ${drag.className}${m.visibility === 'hidden' ? ' is-hidden' : ''}${pending ? ' is-pending' : ''}`}>
                <DragHandle {...handle} />
                <span className="st-module-icon" aria-hidden="true"><Icon size={17} /></span>
                <button type="button" className="st-module-body" disabled={!canEdit}
                  onClick={() => canEdit && setEditing({ type: m.type, module: m })}
                  aria-label={canEdit ? mt.editX(label) : label}>
                  <div className="st-module-title">{label}</div>
                  <div className="st-module-sub">
                    {pending
                      ? <span className="st-badge" style={{ marginInlineEnd: 6 }}>{t.templates.pending}</span>
                      : m.visibility === 'hidden' && <span className="st-badge" style={{ marginInlineEnd: 6 }}>{mt.hidden}</span>}
                    {scheduleBadge(m) && <span className="st-badge" style={{ marginInlineEnd: 6 }}>{scheduleBadge(m)}</span>}
                    {moduleSummary(m, t) || moduleDef(m.type, t).label}
                  </div>
                </button>
                <div className="st-module-actions">
                  <button type="button" className="st-icon-btn" disabled={busyId === m.id}
                    onClick={() => (pending ? setEditing({ type: m.type, module: m }) : toggleVisibility(m))}
                    aria-label={pending ? t.templates.completeX(label) : m.visibility === 'active' ? mt.hideX(label) : mt.showX(label)}
                    aria-pressed={pending ? undefined : m.visibility === 'hidden'}>
                    {m.visibility === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <Menu label={t.sortable.options(label)} items={[
                    ...(canEdit ? [{ icon: Pencil, label: t.common.edit, onSelect: () => setEditing({ type: m.type, module: m }) }] : []),
                    { icon: ArrowUp, label: t.sortable.up, disabled: i === 0, onSelect: () => void moveTo(i, i - 1) },
                    { icon: ArrowDown, label: t.sortable.down, disabled: i === modules.length - 1, onSelect: () => void moveTo(i, i + 1) },
                    ...(canEdit ? [{ icon: Copy, label: t.sortable.duplicate, disabled: busyId === m.id, onSelect: () => void duplicate(i) }] : []),
                    { icon: Trash2, label: t.common.delete, danger: true, onSelect: () => setConfirmDelete(m) },
                  ]} />
                </div>
              </li>
            )
          }}
        </SortableList>
      </>)}

      {library && <ModuleLibrary onClose={() => setLibrary(false)}
        onPick={type => { setLibrary(false); setEditing({ type, module: null }) }} />}

      {templates && <TemplatePicker onClose={() => setTemplates(false)}
        onAdded={n => { setTemplates(false); setTemplateNote(t.templates.added(n)) }} />}

      {editing && <ModuleEditor type={editing.type} module={editing.module} onClose={() => setEditing(null)} />}

      {confirmDelete && (
        <ConfirmDialog
          title={mt.deleteTitle}
          message={mt.deleteText(title(confirmDelete))}
          confirmLabel={t.common.delete} danger loading={deleting}
          onConfirm={() => { void confirmRemove(confirmDelete) }} onCancel={() => setConfirmDelete(null)} />
      )}
    </>
  )
}
