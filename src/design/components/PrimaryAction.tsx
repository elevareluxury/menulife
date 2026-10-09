import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'

type AsLink = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
type AsButton = ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }
export type PrimaryActionProps = AsLink | AsButton

/** Acción principal (sistema de diseño §10): con `href` es un link real, si no un botón. El texto dice qué pasa. */
export function PrimaryAction(props: PrimaryActionProps) {
  const cls = ['my-primary', props.className].filter(Boolean).join(' ')
  if (props.href !== undefined) {
    return <a {...(props as AsLink)} className={cls} />
  }
  const { type = 'button', ...rest } = props as AsButton
  return <button {...rest} type={type} className={cls} />
}
