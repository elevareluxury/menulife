// Imágenes del perfil en el tamaño que se muestran (LCP en celular). Las fotos subidas a `profile-media` llegan de
// hasta 1920 px (y las viejas, sin achicar: una captura de iPhone de 2,2 MB) aunque se vean a 370 px. Supabase no
// transforma imágenes en este plan (`/render/image/` → 403), así que se piden a la optimización de imágenes de Vercel
// (`/_vercel/image`, configurada en `images` de vercel.json): WebP al ancho justo, en la CDN y sin volver a subir nada.
// Las mismas funciones arman el `srcset` del `<img>` y el de la precarga de index.html (scripts/profilePrefetch.ts:
// se inyectan con `String(fn)`), así el navegador no baja dos veces la misma foto. Por eso son autosuficientes:
// todo lo que usan llega por parámetro.

/** Anchos permitidos: los mismos que `images.sizes` de vercel.json (si no están ahí, Vercel responde 400) */
export const IMAGE_WIDTHS = [128, 256, 384, 640, 750, 828, 1080, 1200, 1920] as const
/** Calidad pedida: tiene que estar en `images.qualities` de vercel.json */
export const IMAGE_QUALITY = 75

/** Ancho con que se muestra cada imagen (atributo `sizes`): la columna del perfil mide hasta 640 px */
export const IMAGE_SIZES = {
  avatar: '104px',
  thumb: '96px',
  third: '(max-width: 640px) 33vw, 214px',
  column: '(max-width: 640px) 100vw, 640px',
  cover: '100vw',
} as const
export type ImageRole = keyof typeof IMAGE_SIZES

/** Carpeta pública de las fotos del perfil; sólo esas pasan por el optimizador (vercel.json → `remotePatterns`) */
export const MEDIA_PATH = '/storage/v1/object/public/profile-media/'

/**
 * Se usa el optimizador sólo en un sitio https que no sea local (la app servida por Vercel). En `vite dev`, los E2E
 * (`vite preview` en localhost) y la app de iOS/Android (capacitor://localhost, https://localhost) no existe
 * `/_vercel/image`, así que se usa la foto original.
 */
export function imageCdnOn(protocol: string, hostname: string): boolean {
  return protocol === 'https:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)
}

/** `srcset` de una foto de `profile-media`, o '' si no corresponde (otra carpeta, GIF animado o SVG) */
export function imageSrcset(url: string, mediaPrefix: string, widths: readonly number[], quality: number): string {
  if (typeof url !== 'string' || url.indexOf(mediaPrefix) !== 0 || /\.(gif|svg)(\?|$)/i.test(url)) return ''
  const encoded = encodeURIComponent(url)
  return widths.map(function (w) { return '/_vercel/image?url=' + encoded + '&w=' + w + '&q=' + quality + ' ' + w + 'w' }).join(', ')
}
