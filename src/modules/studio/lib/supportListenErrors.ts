// Textos de error y reglas del editor de "Apoyame" y "Escuchá en" (los usan el catálogo y los editores).
import { SUPPORT_BRAND, type SupportError, type SupportKind } from '@/modules/profile/lib/support'
import { detectListenPlatform, LISTEN_PLATFORM_NAME, type ListenError } from '@/modules/profile/lib/listenOn'
import type { StudioDict } from '@/i18n/app/studio'

export interface SupportInput { kind: SupportKind; value: string; label: string }
export interface ListenInput { url: string }

export function supportErrorText(t: StudioDict, err: SupportError, kind: SupportKind): string {
  const e = t.support.errors
  return err === 'wrong_domain' ? e.wrong_domain(SUPPORT_BRAND[kind] ?? '') : e[err]
}

export function listenErrorText(t: StudioDict, err: ListenError | 'duplicate', url: string): string {
  const e = t.listenOn.errors
  if (err === 'duplicate') {
    const p = detectListenPlatform(url)
    return e.duplicate(p ? LISTEN_PLATFORM_NAME[p] : '')
  }
  // Sin plataforma elegida el editor nunca pide 'wrong_platform', pero el texto existe
  return e[err]
}

/** Índices de las filas que repiten una plataforma ya usada más arriba */
export function duplicateListenRows(items: ListenInput[]): Set<number> {
  const seen = new Set<string>()
  const dup = new Set<number>()
  items.forEach((it, i) => {
    const p = detectListenPlatform(it.url)
    if (!p) return
    if (seen.has(p)) dup.add(i)
    seen.add(p)
  })
  return dup
}
