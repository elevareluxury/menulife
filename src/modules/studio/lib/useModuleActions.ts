import { useState } from 'react'
import { useStudio } from '../StudioContext'
import { createModule, deleteModule, friendlyError, saveOrder, updateModule } from './studioApi'
import { moduleDisplayTitle } from './moduleCatalog'
import type { StudioModule } from './studioTypes'
import { useStudioT } from '@/i18n/app/studio'

/**
 * Acciones sobre los módulos del Space abierto (las usan Módulos y el editor de escritorio).
 * Cada cambio se ve al instante, se guarda y se anuncia para lectores de pantalla (`announce`).
 */
export function useModuleActions() {
  const { profile, modules, setModules } = useStudio()
  const t = useStudioT()
  const mt = t.modules
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
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

  /** Mueve un módulo de la posición `from` a `to` (arrastrando, con el teclado o desde el menú). */
  async function moveTo(from: number, to: number, speak = true) {
    if (to < 0 || to >= modules.length || from === to) return
    const previous = modules
    const next = [...modules]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    const renumbered = next.map((m, i) => ({ ...m, position: (i + 1) * 10 }))
    setModules(() => renumbered)
    setError(null)
    if (speak) setAnnounce(mt.moved(title(item), to + 1, modules.length))
    try { await saveOrder(renumbered) }
    catch (e) { setModules(() => previous); setError(friendlyError(e)) }
  }

  /** Copia el módulo justo debajo del original. Devuelve la copia. */
  async function duplicate(index: number): Promise<StudioModule | null> {
    const m = modules[index]
    setBusyId(m.id); setError(null)
    try {
      const config = Object.fromEntries(Object.entries(m.config ?? {}).filter(([k]) => !k.startsWith('legacy_')))
      const copy = await createModule({
        profile_id: profile.id, type: m.type, position: m.position + 1,
        title: m.title ? mt.copyOf(m.title).slice(0, 120) : null,
        content: structuredClone(m.content), translations: structuredClone(m.translations ?? {}),
        config, visibility: m.visibility,
      })
      const next = [...modules]
      next.splice(index + 1, 0, copy)
      const renumbered = next.map((x, i) => ({ ...x, position: (i + 1) * 10 }))
      setModules(() => renumbered)
      setAnnounce(mt.duplicated(title(m)))
      await saveOrder(renumbered)
      return copy
    } catch (e) {
      setError(friendlyError(e))
      return null
    } finally { setBusyId(null) }
  }

  /** Borrado lógico. Devuelve si se pudo. */
  async function remove(m: StudioModule): Promise<boolean> {
    setError(null)
    try {
      await deleteModule(m.id)
      setModules(prev => prev.filter(x => x.id !== m.id))
      setAnnounce(mt.deleted(title(m)))
      return true
    } catch (e) {
      setError(friendlyError(e))
      return false
    }
  }

  return { toggleVisibility, moveTo, duplicate, remove, busyId, error, announce, title }
}
