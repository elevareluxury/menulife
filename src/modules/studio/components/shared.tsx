import { NavLink } from 'react-router-dom'
import type { ProfileStatus } from '../lib/studioTypes'
import { useStudio } from '../StudioContext'
import { useStudioT } from '@/i18n/app/studio'
import { SaveIndicator } from './ui'

export function StatusPill({ status }: { status: ProfileStatus }) {
  const t = useStudioT()
  return (
    <span className={`st-status-pill${status === 'published' ? ' is-published' : ''}`}>
      <i aria-hidden="true" /> {t.status[status]}
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
  const t = useStudioT().editTabs
  return (
    <div className="st-segment st-mobile-only" role="navigation" aria-label={t.label} style={{ marginBottom: 16 }}>
      <NavLink to="/studio/identity">{t.identity}</NavLink>
      <NavLink to="/studio/modules">{t.modules}</NavLink>
      <NavLink to="/studio/appearance">{t.appearance}</NavLink>
    </div>
  )
}
