import { createContext, useContext } from 'react'
import type { PublicProfile } from '@/modules/profile/lib/profileTypes'
import type {
  ProfilePatch, SaveState, StudioBusiness, StudioModule, StudioProfile,
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
  /** Reintenta el último guardado fallido */
  retrySave: () => void
  /** Reemplaza el perfil con lo que devolvió la base (ej. tras cambiar username) */
  replaceProfile: (profile: StudioProfile) => void
  setModules: (updater: (prev: StudioModule[]) => StudioModule[]) => void
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
