import { useEffect, useState } from 'react'
import { isReservedUsername } from '@/lib/reservedUsernames'
import { checkUsername, type UsernameCheck } from './studioApi'

export type UsernameStatus = UsernameCheck | 'idle' | 'checking' | 'same' | 'error'

const FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/

export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, 30)
}

/** Valida formato al instante y disponibilidad contra la base (con espera de 400 ms). */
export function useUsernameCheck(value: string, current?: string): UsernameStatus {
  const [result, setResult] = useState<{ value: string; status: UsernameStatus } | null>(null)

  const local: UsernameStatus | null =
    !value ? 'idle'
      : value === current ? 'same'
        : !FORMAT.test(value) || value.includes('--') ? 'invalid'
          : isReservedUsername(value) ? 'reserved'
            : null

  useEffect(() => {
    if (local) return
    let cancelled = false
    const t = window.setTimeout(() => {
      checkUsername(value)
        .then(status => { if (!cancelled) setResult({ value, status }) })
        .catch(() => { if (!cancelled) setResult({ value, status: 'error' }) })
    }, 400)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [value, local])

  if (local) return local
  return result?.value === value ? result.status : 'checking'
}

export const USERNAME_MESSAGES: Record<UsernameStatus, string> = {
  idle: 'Entre 3 y 30 caracteres: letras minúsculas, números y guiones.',
  checking: 'Verificando…',
  same: 'Es tu username actual.',
  available: '¡Disponible!',
  taken: 'Ya está en uso.',
  reserved: 'Está reservado por el sistema.',
  invalid: 'Usá entre 3 y 30 letras minúsculas, números o guiones (sin guion al principio o al final).',
  error: 'No pudimos verificarlo. Revisá tu conexión.',
}
