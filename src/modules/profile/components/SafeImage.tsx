import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

/** Imagen que, si falla al cargar, se oculta (o muestra un fallback) en vez del ícono roto. */
export function SafeImage({ fallback = null, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed || !props.src) return <>{fallback}</>
  return <img {...props} onError={() => setFailed(true)} />
}
