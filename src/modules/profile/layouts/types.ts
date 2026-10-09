import type { ReactNode } from 'react'
import type { BentoSize } from '../components/moduleRegistry'
import type { ProfileLook } from '../lib/profileLook'
import type { UiStrings } from '../lib/profileI18n'

/** Un módulo (o grupo de módulos) ya dibujado, listo para que cada estructura lo ubique */
export interface RenderedBlock {
  key: string
  size: BentoSize
  node: ReactNode
}

/**
 * Las piezas del perfil, armadas una sola vez en ProfileView. Cada estructura (sistema de diseño §9) decide la
 * composición: todas comparten los mismos módulos, textos y acciones.
 */
export interface LayoutParts {
  look: ProfileLook
  /** Semilla de la huella (huellaSeed) */
  seed: string
  name: string
  descriptor: string
  bio: string
  /** Foto (o la inicial del nombre si no hay) */
  avatar: ReactNode
  hasAvatar: boolean
  /** Portada vieja del perfil (cover_url): Clásica la sigue mostrando arriba */
  coverUrl: string | null
  tags: ReactNode | null
  /** Estado actual, "Disponible" y abierto/cerrado */
  chips: ReactNode | null
  /** Acción principal (siempre visible sin hacer scroll) */
  primary: ReactNode | null
  /** Reservar y "Guardar contacto" */
  secondary: ReactNode | null
  blocks: RenderedBlock[]
  /** En el editor de escritorio, el encabezado se elige como un solo bloque */
  identity: (node: ReactNode) => ReactNode
  /** Dirección pública del perfil (para el QR de la credencial) */
  profileUrl: string
  t: UiStrings
  /** Vista previa de Studio o del onboarding */
  preview: boolean
}
