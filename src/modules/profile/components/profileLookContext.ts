import { createContext, useContext } from 'react'
import type { HuellaVariant } from '@/lib/huella'

/** Huella del perfil para los módulos que la usan de fondo (ej. la fachada de video y música) */
export const ProfileHuellaContext = createContext<{ seed: string; variant: HuellaVariant } | null>(null)
export const useProfileHuella = () => useContext(ProfileHuellaContext)
