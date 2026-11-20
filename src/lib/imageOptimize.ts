// Imágenes optimizadas antes de subirlas (Lanzamiento L1): una foto del celular pasa de 3–8 MB a ~150–400 KB.
// Se achica al lado máximo y se guarda en WebP (o JPEG si el navegador no sabe codificar WebP). Todo en el
// dispositivo: no se manda la foto original a ningún lado.

export interface OptimizeOptions {
  /** Lado más largo en píxeles */
  maxSide: number
  /** Calidad de 0 a 1 */
  quality?: number
  /**
   * Nunca devolver el archivo original (fotos públicas: el original puede traer la ubicación GPS y otros datos EXIF).
   * Si el navegador no puede leerla, la promesa falla con `IMAGE_UNREADABLE` en vez de subir el original.
   */
  strict?: boolean
}

/** El navegador no pudo leer la imagen y no se puede limpiar: no se sube */
export const IMAGE_UNREADABLE = 'IMAGE_UNREADABLE'

/** Tamaño final manteniendo la proporción; nunca agranda. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide || longest === 0) return { width, height }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Píxeles RGBA (`ImageData.data`) sin ninguna transparencia */
export function isOpaque(rgba: ArrayLike<number>): boolean {
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 255) return false
  return true
}

/** GIF (pueden ser animados) y SVG se suben tal cual */
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/**
 * Devuelve la imagen achicada y comprimida, siempre vuelta a dibujar: así se pierden los metadatos (EXIF con GPS,
 * modelo del teléfono, fecha). Sin `strict`, si algo falla (formato raro, navegador viejo) devuelve el original.
 */
export async function optimizeImage(file: File, { maxSide, quality = 0.82, strict = false }: OptimizeOptions): Promise<File> {
  if (!file.type.startsWith('image/') || KEEP_AS_IS.has(file.type) || typeof document === 'undefined') return file
  const fail = () => {
    if (strict) throw new Error(IMAGE_UNREADABLE)
    return file
  }
  try {
    // createImageBitmap respeta la orientación EXIF (fotos de celular giradas)
    const bitmap = await createImageBitmap(file)
    const original = { width: bitmap.width, height: bitmap.height }
    const { width, height } = fitWithin(original.width, original.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return fail()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    let blob = await toBlob(canvas, 'image/webp', quality)
    if (!blob || blob.type !== 'image/webp') {
      // Sin WebP (Safari en iPhone): un PNG con transparencia (logos) en JPEG quedaría con fondo negro, así que queda
      // PNG pero achicado. Antes se subía el original: una captura de iPhone llegaba al perfil con 2,2 MB.
      const keepPng = file.type === 'image/png' && !isOpaque(ctx.getImageData(0, 0, width, height).data)
      blob = await toBlob(canvas, keepPng ? 'image/png' : 'image/jpeg', quality)
    }
    if (!blob) return fail()
    // Aunque pese un poco más que el original, se sube la versión limpia: el original puede traer la ubicación
    const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], name, { type: blob.type, lastModified: Date.now() })
  } catch (e) {
    if (e instanceof Error && e.message === IMAGE_UNREADABLE) throw e
    return fail()
  }
}
