import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { useStudio } from '../StudioContext'
import { activeSpaces, spaceHandle } from '../lib/spaces'
import { useStudioT } from '@/i18n/app/studio'

/** Qué Space se está editando (Fase 10). Sólo aparece con más de un Space activo. */
export function SpaceSwitcher() {
  const { spaces, profile, switchSpace, primaryUsername } = useStudio()
  const s = useStudioT().spaces
  const id = useId()
  const live = activeSpaces(spaces)
  if (live.length < 2) return null
  return (
    <div className="st-space-switcher">
      <label htmlFor={id}>{s.switcher}</label>
      <select id={id} className="st-select" value={profile.id} onChange={e => switchSpace(e.target.value)}>
        {live.map(sp => {
          const handle = spaceHandle(sp, primaryUsername)
          return <option key={sp.id} value={sp.id}>{`${sp.display_name || handle} · /${handle}`}</option>
        })}
      </select>
      <Link to="/studio/spaces" className="st-btn st-btn-ghost st-btn-sm"><Layers size={15} aria-hidden="true" /> {s.manage}</Link>
    </div>
  )
}
