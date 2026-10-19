import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'
import { responsiveImage, type ImageRole } from '../lib/responsiveImage'

type Props = ImgHTMLAttributes<HTMLImageElement> & { fallback?: ReactNode; sizing?: ImageRole }

/**
 * Imagen que, si falla al cargar, se oculta (o muestra un fallback) en vez del ícono roto. Con `sizing`, una foto de
 * `profile-media` se pide al tamaño en que se muestra (`srcset` de `/_vercel/image`); si eso falla, prueba la original.
 */
export function SafeImage({ fallback = null, sizing, ...props }: Props) {
  const [failed, setFailed] = useState(false)
  const [original, setOriginal] = useState(false)
  if (failed || !props.src) return <>{fallback}</>
  const sized = sizing && !original ? responsiveImage(props.src, sizing) : {}
  return <img {...sized} {...props} onError={() => (sized.srcSet ? setOriginal(true) : setFailed(true))} />
}

/** `<img>` común (no se oculta si falla) con el tamaño justo de `sizing`; si `/_vercel/image` falla, la original. */
export function SizedImage({ sizing, ...props }: ImgHTMLAttributes<HTMLImageElement> & { sizing: ImageRole }) {
  const [original, setOriginal] = useState(false)
  const sized = original ? {} : responsiveImage(props.src, sizing)
  return <img {...sized} {...props} onError={sized.srcSet ? () => setOriginal(true) : undefined} />
}
