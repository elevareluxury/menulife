import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Obligatorio: lo que anuncia el lector de pantalla (el ícono es decorativo) */
  label: string
  children: ReactNode
}

/** Botón de ícono de 44 × 44 como mínimo, en vidrio. */
export function IconButton({ label, children, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button {...rest} type={type} aria-label={label} className={['my-iconbtn', className].filter(Boolean).join(' ')}>
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>{children}</span>
    </button>
  )
}
