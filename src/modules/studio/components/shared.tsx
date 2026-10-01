import { NavLink } from 'react-router-dom'
import type { ProfileStatus } from '../lib/studioTypes'
import { useStudio } from '../StudioContext'
import { SaveIndicator } from './ui'

const STATUS_LABEL: Record<ProfileStatus, string> = {
  published: 'Publicado',
  draft: 'Borrador',
  unpublished: 'Pausado',
}

export function StatusPill({ status }: { status: ProfileStatus }) {
  return (
    <span className={`st-status-pill${status === 'published' ? ' is-published' : ''}`}>
      <i aria-hidden="true" /> {STATUS_LABEL[status]}
    </span>
  )
}

/** Indicador global del guardado automático del perfil. */
export function ProfileSaveIndicator() {
  const { saveState, saveError, retrySave } = useStudio()
  return <SaveIndicator state={saveState} error={saveError} onRetry={retrySave} />
}

/** En móvil, "Editar" agrupa Identidad y Módulos. */
export function EditTabs() {
  return (
    <div className="st-segment st-mobile-only" role="navigation" aria-label="Editar" style={{ marginBottom: 16 }}>
      <NavLink to="/studio/identity">Identidad</NavLink>
      <NavLink to="/studio/modules">Módulos</NavLink>
      <NavLink to="/studio/appearance">Apariencia</NavLink>
    </div>
  )
}
