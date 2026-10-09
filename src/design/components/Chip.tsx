import type { HTMLAttributes, ReactNode } from 'react'

export interface ChipProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Si se pasa, el chip es un botón (área táctil de 44 px) */
  onClick?: () => void
}

/** Pastilla de vidrio. Sin `onClick` es sólo una etiqueta. */
export function Chip({ children, onClick, className, ...rest }: ChipProps) {
  const cls = ['my-chip', className].filter(Boolean).join(' ')
  if (onClick) return <button type="button" {...rest} onClick={onClick} className={cls}>{children}</button>
  return <span {...rest} className={cls}>{children}</span>
}

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  /** Punto que late (estado en vivo). Con "reducir movimiento" queda quieto. */
  live?: boolean
}

/** Estado actual de la persona ("Disponible", "Grabando el disco"…). */
export function StatusChip({ children, live = true, className, ...rest }: StatusChipProps) {
  return (
    <span {...rest} className={['my-chip', className].filter(Boolean).join(' ')}>
      {live && <span className="my-status-dot my-pulse" aria-hidden="true" />}
      {children}
    </span>
  )
}
