import { ExternalLink, Redo2, Undo2 } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { useStudioT } from '@/i18n/app/studio'
import { Button } from './ui'

/**
 * Barra de publicación (Fase 3): guardar ≠ publicar. Muestra qué ve el visitante, si hay cambios
 * sin publicar, y deja publicar, deshacer y rehacer desde cualquier pantalla de Studio.
 */
export function PublishBar() {
  const { publishState, publishing, publishError, publish, undo, redo, canUndo, canRedo, publicUrl, profile } = useStudio()
  const t = useStudioT()
  const p = t.publishing

  const status = publishState?.status ?? profile.status
  const dirty = publishState?.dirty ?? false
  const live = status === 'published'
  // Mientras carga el estado, el texto sale del perfil (sin número de versión)
  const label = !publishState ? (live ? t.status.published : t.status[status]) :
    status === 'draft' ? p.draft :
      status === 'unpublished' ? p.paused :
        status === 'archived' ? p.archived :
          dirty ? p.dirty : p.live(publishState.version_number ?? 1)
  const canPublish = status !== 'archived' && (!live || dirty)

  return (
    <div className={`st-publish-bar${dirty && live ? ' is-dirty' : ''}`} role="region" aria-label={p.publish}>
      <span className="st-publish-state" role="status" aria-live="polite">
        <i aria-hidden="true" className={live && !dirty ? 'is-live' : undefined} />
        {label}
      </span>
      <span className="st-publish-actions">
        <button type="button" className="st-icon-btn" onClick={undo} disabled={!canUndo} aria-label={p.undo} title={`${p.undo} (Ctrl+Z)`}>
          <Undo2 size={16} aria-hidden="true" className="flip-rtl" />
        </button>
        <button type="button" className="st-icon-btn" onClick={redo} disabled={!canRedo} aria-label={p.redo} title={`${p.redo} (Ctrl+Shift+Z)`}>
          <Redo2 size={16} aria-hidden="true" className="flip-rtl" />
        </button>
        {live && (
          <a className="st-icon-btn" href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label={p.viewLive} title={p.viewLive}>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        )}
        {canPublish && (
          <Button size="sm" variant="primary" onClick={() => { void publish() }} loading={publishing}>
            {publishing ? p.publishing : live ? p.publishChanges : p.publish}
          </Button>
        )}
      </span>
      {publishError && <p className="st-error st-publish-error" role="alert">{publishError}</p>}
    </div>
  )
}
