// Después de publicar una versión nueva, una pestaña (o la app instalada) que quedó abierta todavía pide las partes
// de la versión anterior, que ya no existen: abrir una pantalla que no se había cargado (por ejemplo, Analítica)
// falla al importarla. No es un error de la app: se recarga sola una vez para tomar la versión nueva.

const KEY = 'mycen_stale_chunk_reload'
const WINDOW_MS = 30_000

const PATTERNS = [
  /failed to fetch dynamically imported module/i, // Chrome, Edge
  /error loading dynamically imported module/i, // Firefox
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite (CSS de la pantalla)
  /'text\/html' is not a valid javascript mime type/i, // Safari con la página en lugar del archivo
]

export function isStaleChunkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return PATTERNS.some(re => re.test(message))
}

/** Recarga la página si no se recargó por lo mismo hace poco (si vuelve a fallar, se muestra el error). */
export function reloadForStaleChunk(now = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (now - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(now))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
