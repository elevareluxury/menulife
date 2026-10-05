import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-color-scheme: light)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const snapshot = () => (typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches)

/** ¿El dispositivo pide modo claro? Se actualiza si cambia (para el tema "automático"). */
export function usePrefersLight(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
