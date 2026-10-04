// Imágenes optimizadas antes de subirlas (Lanzamiento L1): una foto del celular pasa de 3–8 MB a ~150–400 KB.
// Se achica al lado máximo y se guarda en WebP (o JPEG si el navegador no sabe codificar WebP). Todo en el
// dispositivo: no se manda la foto original a ningún lado.

export interface OptimizeOptions {
  /** Lado más largo en píxeles */
  maxSide: number
  /** Calidad de 0 a 1 */
  quality?: number
}

/** Tamaño final manteniendo la proporción; nunca agranda. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxSide || longest === 0) return { width, height }
  const scale = maxSide / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** GIF (pueden ser animados) y SVG se suben tal cual */
const KEEP_AS_IS = new Set(['image/gif', 'image/svg+xml'])

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/**
 * Devuelve la imagen achicada y comprimida. Si algo falla (formato raro, navegador viejo) o el resultado no es
 * más liviano, devuelve el archivo original: optimizar nunca impide subir.
 */
export async function optimizeImage(file: File, { maxSide, quality = 0.82 }: OptimizeOptions): Promise<File> {
  if (!file.type.startsWith('image/') || KEEP_AS_IS.has(file.type) || typeof document === 'undefined') return file
  try {
    // createImageBitmap respeta la orientación EXIF (fotos de celular giradas)
    const bitmap = await createImageBitmap(file)
    const original = { width: bitmap.width, height: bitmap.height }
    const { width, height } = fitWithin(original.width, original.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    let blob = await toBlob(canvas, 'image/webp', quality)
    if (!blob || blob.type !== 'image/webp') {
      // Sin WebP: un PNG puede tener transparencia (logos) y en JPEG quedaría con fondo negro
      if (file.type === 'image/png') return file
      blob = await toBlob(canvas, 'image/jpeg', quality)
    }
    if (!blob) return file
    const resized = width !== original.width || height !== original.height
    if (!resized && blob.size >= file.size) return file
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], name, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  }
}
