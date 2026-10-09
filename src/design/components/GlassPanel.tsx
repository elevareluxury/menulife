import type { HTMLAttributes, ElementType } from 'react'

export interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  /** `hero` = vidrio destacado (credencial, portada): más opaco, radio 30 y brillo del acento */
  variant?: 'default' | 'hero'
  as?: ElementType
}

/** Superficie de vidrio (sistema de diseño §5). Con reducir transparencia o en equipos lentos pasa a color sólido. */
export function GlassPanel({ variant = 'default', as: Tag = 'div', className, ...rest }: GlassPanelProps) {
  const cls = ['my-glass', variant === 'hero' && 'my-glass--hero', className].filter(Boolean).join(' ')
  return <Tag className={cls} {...rest} />
}
