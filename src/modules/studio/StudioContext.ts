import { createContext, useContext } from 'react'
import type { PublicProfile } from '@/modules/profile/lib/profileTypes'
import type {
  ProfilePatch, PublishState, SaveState, StudioBusiness, StudioModule, StudioProfile, StudioProject,
} from './lib/studioTypes'

export interface StudioContextValue {
  userId: string
  profile: StudioProfile
  modules: StudioModule[]
  business: StudioBusiness | null
  /** Estado del guardado automático del perfil */
  saveState: SaveState
  saveError: string | null
  /** Cambia campos del perfil: se ve al instante y se guarda solo (autosave) */
  patchProfile: (patch: ProfilePatch) => void
  /** Reintenta el último guardado fallido (si fue un conflicto de versiones, recarga) */
  retrySave: () => void
  /** Otra pestaña o dispositivo guardó cambios más nuevos */
  conflict: boolean
  /** Qué está publicado y si hay cambios sin publicar (null mientras carga) */
  publishState: PublishState | null
  publishing: boolean
  publishError: string | null
  /** Guarda lo pendiente y publica la versión de trabajo como versión nueva */
  publish: () => Promise<void>
  /** Restaura una versión publicada (la publica de nuevo y la trae a Studio). Devuelve el número de versión nuevo. */
  restoreVersion: (versionId: string) => Promise<number>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  /** Reemplaza el perfil con lo que devolvió la base (ej. tras cambiar username) */
  replaceProfile: (profile: StudioProfile) => void
  setModules: (updater: (prev: StudioModule[]) => StudioModule[]) => void
  /** Proyectos de la identidad (Fase 5), para los módulos project/portfolio y la vista previa */
  projects: StudioProject[]
  setProjects: (updater: (prev: StudioProject[]) => StudioProject[]) => void
  /** URL pública real del perfil */
  publicUrl: string
  /** El perfil tal como lo vería un visitante (para la vista previa en vivo) */
  previewProfile: PublicProfile
}

export const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio debe usarse dentro de StudioShell')
  return ctx
}
