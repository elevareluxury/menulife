import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Link2, Monitor, Palette, Plus, Smartphone, Trash2, UserRound } from 'lucide-react'
import type { ModuleType } from '@/modules/profile/lib/profileTypes'
import { IDENTITY_TARGET } from '@/modules/profile/components/ProfileView'
import { useStudio } from '../StudioContext'
import { useModuleActions } from '../lib/useModuleActions'
import type { StudioModule } from '../lib/studioTypes'
import { Button, ConfirmDialog, Menu } from '../components/ui'
import { DragHandle, SortableList } from '../components/SortableList'
import { LivePreview } from '../components/PreviewPane'
import { ModuleEditor } from '../components/ModuleEditor'
import { ModuleLibrary } from '../components/ModuleLibrary'
import { EDITABLE_MODULES, MODULE_ICONS, useScheduleBadge } from '../lib/moduleUi'
import { ProfileSaveIndicator } from '../components/shared'
import { IdentityPage } from './IdentityPage'
import { AppearancePage } from './AppearancePage'
import { useStudioT } from '@/i18n/app/studio'

const APPEARANCE = 'appearance'
const NEW_PREFIX = 'new:'

/**
 * Editor de escritorio de 3 paneles (Identity Fase 11): Capas | vista previa con selección directa | Propiedades.
 * Lo elegido en un panel se marca en los otros dos. Todo se puede hacer con el teclado desde Capas.
 */
export function EditorPage() {
  const { modules } = useStudio()
  const t = useStudioT()
  const x = t.editor3
  const [selected, setSelected] = useState<string | null>(null)
  const [library, setLibrary] = useState(false)
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [confirmDelete, setConfirmDelete] = useState<StudioModule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toggleVisibility, moveTo, duplicate, remove, busyId, error, announce, title } = useModuleActions()
  const scheduleBadge = useScheduleBadge()

  const labels: Record<string, string> = {
    [IDENTITY_TARGET]: x.identity,
    ...Object.fromEntries(modules.map(m => [m.id, title(m)])),
  }
  const selectedModule = modules.find(m => m.id === selected) ?? null
  const newType = selected?.startsWith(NEW_PREFIX) ? selected.slice(NEW_PREFIX.length) as ModuleType : null

  async function confirmRemove(m: StudioModule) {
    setDeleting(true)
    if (await remove(m)) setConfirmDelete(null)
    setDeleting(false)
  }

  const layer = (id: string, label: string, Icon: typeof Link2, sub?: string) => (
    <button type="button" className={`st-layer${selected === id ? ' is-selected' : ''}`}
      aria-current={selected === id ? 'true' : undefined} onClick={() => setSelected(id)}>
      <Icon size={16} aria-hidden="true" />
      <span className="st-layer-text">
        <span className="st-layer-title">{label}</span>
        {sub && <span className="st-layer-sub">{sub}</span>}
      </span>
    </button>
  )

  let inspector: React.ReactNode
  if (selected === IDENTITY_TARGET) {
    inspector = <section className="st-inspector-section" aria-label={x.identity}>
      <h2 className="st-inspector-title">{x.identity}</h2><IdentityPage embedded />
    </section>
  } else if (selected === APPEARANCE) {
    inspector = <section className="st-inspector-section" aria-label={t.nav.appearance}>
      <h2 className="st-inspector-title">{t.nav.appearance}</h2><AppearancePage embedded />
    </section>
  } else if (selectedModule && EDITABLE_MODULES.includes(selectedModule.type)) {
    inspector = <ModuleEditor key={selectedModule.id} inline type={selectedModule.type} module={selectedModule}
      onClose={() => setSelected(null)} />
  } else if (selectedModule) {
    // La tarjeta de contacto se configura en Compartir
    inspector = <p className="st-help">{x.contactCardHint} <Link to="/studio/exchange">{t.nav.exchange}</Link></p>
  } else if (newType) {
    inspector = <ModuleEditor key={selected} inline type={newType} module={null}
      onClose={() => setSelected(null)} onSaved={m => setSelected(m.id)} />
  } else {
    inspector = <p className="st-help st-inspector-empty">{x.empty}</p>
  }

  return (
    <div className="st-editor">
      <p className="st-sr-only" role="status" aria-live="polite">{announce}</p>

      <nav className="st-editor-layers" aria-label={x.layers}>
        <div className="st-row" style={{ justifyContent: 'space-between' }}>
          <h1 className="st-editor-heading">{x.layers}</h1>
          <ProfileSaveIndicator />
        </div>
        <div className="st-stack" style={{ gap: 4 }}>
          {layer(IDENTITY_TARGET, x.identity, UserRound, x.identityHint)}
          {layer(APPEARANCE, t.nav.appearance, Palette)}
        </div>

        <h2 className="st-editor-subheading">{t.nav.modules}</h2>
        {error && <p className="st-error" role="alert">{error}</p>}
        {modules.length === 0
          ? <p className="st-help">{x.noModules}</p>
          : (
            <SortableList items={modules} label={title} onMove={(from, to) => void moveTo(from, to, false)} className="st-layer-list">
              {(m, i, handle, drag) => {
                const label = title(m)
                const Icon = MODULE_ICONS[m.type] ?? Link2
                const badge = m.visibility === 'hidden' ? t.modules.hidden : scheduleBadge(m)
                return (
                  <li ref={drag.ref} style={drag.style} className={`st-layer-row ${drag.className}${m.visibility === 'hidden' ? ' is-hidden' : ''}`}>
                    <DragHandle {...handle} />
                    {layer(m.id, label, Icon, badge ?? undefined)}
                    <button type="button" className="st-icon-btn" onClick={() => toggleVisibility(m)} disabled={busyId === m.id}
                      aria-label={m.visibility === 'active' ? t.modules.hideX(label) : t.modules.showX(label)}
                      aria-pressed={m.visibility === 'hidden'}>
                      {m.visibility === 'active' ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <Menu label={t.sortable.options(label)} items={[
                      { icon: ArrowUp, label: t.sortable.up, disabled: i === 0, onSelect: () => void moveTo(i, i - 1) },
                      { icon: ArrowDown, label: t.sortable.down, disabled: i === modules.length - 1, onSelect: () => void moveTo(i, i + 1) },
                      ...(EDITABLE_MODULES.includes(m.type) ? [{
                        icon: Copy, label: t.sortable.duplicate, disabled: busyId === m.id,
                        onSelect: () => { void duplicate(i).then(copy => { if (copy) setSelected(copy.id) }) },
                      }] : []),
                      { icon: Trash2, label: t.common.delete, danger: true, onSelect: () => setConfirmDelete(m) },
                    ]} />
                  </li>
                )
              }}
            </SortableList>
          )}
        <Button variant="secondary" block onClick={() => setLibrary(true)}><Plus size={15} aria-hidden="true" /> {x.add}</Button>
      </nav>

      <section className="st-editor-canvas" aria-label={x.canvas}>
        <div className="st-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <p className="st-help" style={{ margin: 0 }}>{x.canvasHelp}</p>
          <div className="st-segment" role="group" aria-label={t.preview.device}>
            <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone size={14} aria-hidden="true" /> {t.preview.mobile}
            </button>
            <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor size={14} aria-hidden="true" /> {t.preview.desktop}
            </button>
          </div>
        </div>
        <div className={`st-editor-stage is-${device}`}>
          <LivePreview device={device} select={{ selected, onSelect: setSelected, labels }} />
        </div>
      </section>

      <aside className="st-editor-inspector" aria-label={x.inspector}>
        {inspector}
      </aside>

      {library && <ModuleLibrary onClose={() => setLibrary(false)}
        onPick={type => { setLibrary(false); setSelected(NEW_PREFIX + type) }} />}

      {confirmDelete && (
        <ConfirmDialog
          title={t.modules.deleteTitle}
          message={t.modules.deleteText(title(confirmDelete))}
          confirmLabel={t.common.delete} danger loading={deleting}
          onConfirm={() => { void confirmRemove(confirmDelete) }} onCancel={() => setConfirmDelete(null)} />
      )}
    </div>
  )
}
