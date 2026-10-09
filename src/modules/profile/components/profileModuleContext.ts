import { createContext, useContext } from 'react'
import type { HuellaVariant } from '@/lib/huella'

/** Lo que algunos módulos necesitan del perfil que los contiene (ProfileView lo provee) */
export interface ProfileModuleCtx {
  /** Huella del perfil (fondo de la fachada de video y música) */
  seed: string
  variant: HuellaVariant
  /** Dirección pública del Space ("ana" o "ana/estudio"): el formulario de contacto envía a este perfil */
  handle: string
  /** Vista previa en Studio u onboarding: no se envía ni se registra nada */
  preview: boolean
}

export const ProfileModuleContext = createContext<ProfileModuleCtx | null>(null)
export const useProfileModule = () => useContext(ProfileModuleContext)
