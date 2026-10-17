import { useEffect, useRef, useState } from 'react'
import { coverRequestFor } from '@/modules/profile/lib/mediaCover'
import { MEDIA_PROVIDER_NAME } from '@/modules/profile/lib/media'
import { uploadMedia } from './studioApi'

// Portada automática (Identity): al pegar un video o una canción sin portada, Studio pide la imagen a
// /api/media-cover (la trae el servidor de Mycen) y la sube como una foto más del perfil (achicada y en WebP).
// Así la página pública la muestra desde Mycen y el visitante no se conecta con el proveedor. Si la persona saca la
// portada, no se vuelve a buscar para ese mismo link.

export type AutoCoverStatus = { state: 'idle' } | { state: 'loading' } | { state: 'auto'; provider: string } | { state: 'none' }

const WAIT_MS = 600

export function useAutoCover({ url, cover, setCover, userId }: {
  url: string | null
  cover: string
  setCover: (url: string) => void
  userId: string
}): AutoCoverStatus {
  const [status, setStatus] = useState<AutoCoverStatus>({ state: 'idle' })
  // Links ya probados en esta edición (también los que la persona dejó sin portada a propósito)
  const tried = useRef(new Set<string>())
  // El módulo ya tenía portada con este link: no se busca otra aunque la saquen
  const [initial] = useState(() => ({ url, cover }))

  useEffect(() => {
    const request = url ? coverRequestFor(url) : null
    if (!url || !request || cover || tried.current.has(url) || (initial.cover && url === initial.url)) return
    let cancelled = false
    const timer = setTimeout(() => {
      tried.current.add(url)
      setStatus({ state: 'loading' })
      void (async () => {
        try {
          const res = await fetch(`/api/media-cover?url=${encodeURIComponent(url)}`)
          if (!res.ok) throw new Error('no_cover')
          const blob = await res.blob()
          if (!blob.type.startsWith('image/')) throw new Error('no_cover')
          const file = new File([blob], `portada.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type })
          const publicUrl = await uploadMedia(userId, file, 'image')
          if (cancelled) return
          setCover(publicUrl)
          setStatus({ state: 'auto', provider: MEDIA_PROVIDER_NAME[request.embed.provider] })
        } catch {
          if (!cancelled) setStatus({ state: 'none' })
        }
      })()
    }, WAIT_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [url, cover, setCover, userId, initial])

  // Si la persona cambia la portada a mano, el aviso de "la pusimos nosotros" ya no corresponde
  return status.state === 'auto' && !cover ? { state: 'idle' } : status
}
