import { isNativeApp } from '@/lib/platform'

// Guardar un archivo (vCard, CSV, JSON, .ics, QR, tarjeta) o compartir un link. En la web se descarga como siempre; en
// la app de iOS/Android una descarga no hace nada, así que el archivo se escribe en la caché y se abre el menú nativo
// de compartir (Guardar en Archivos, AirDrop, WhatsApp, Mail…). Los plugins de Capacitor sólo se bajan en la app.

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function webDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** `data`: un Blob o una data URL (como la que devuelve un canvas) */
export async function saveFile(data: Blob | string, filename: string): Promise<void> {
  if (!isNativeApp()) {
    if (typeof data === 'string') { webDownload(data, filename); return }
    const url = URL.createObjectURL(data)
    webDownload(url, filename)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }
  const base64 = typeof data === 'string' ? data.split(',')[1] ?? '' : await blobToBase64(data)
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const { uri } = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache })
  try {
    await Share.share({ title: filename, files: [uri] })
  } catch { /* la persona cerró el menú */ }
}

/** Compartir un link con el menú del sistema. Devuelve false si no hay menú (la web copia el link en ese caso). */
export async function shareLink(title: string, url: string, text?: string): Promise<boolean> {
  if (isNativeApp()) {
    const { Share } = await import('@capacitor/share')
    try { await Share.share({ title, text, url }) } catch { /* cancelado */ }
    return true
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share({ title, text, url }) } catch { /* cancelado */ }
    return true
  }
  return false
}
