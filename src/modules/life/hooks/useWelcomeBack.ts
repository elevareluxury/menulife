import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { dismissWelcome, registerVisit } from '../lib/kindMoments'
import { dayKey } from './useToday'

/** ¿Hay que dar la bienvenida hoy? (volvió después de 3 días o más sin entrar). La visita se anota una vez por día. */
export function useWelcomeBack(): [boolean, () => void] {
  const uid = useAuthStore(s => s.user?.id)
  const [closed, setClosed] = useState(false)
  // Se calcula cuando ya se sabe quién es (registerVisit anota la visita una sola vez por día)
  const show = useMemo(() => (uid ? registerVisit(uid, dayKey()) : false), [uid])
  return [show && !closed, () => { if (uid) dismissWelcome(uid); setClosed(true) }]
}
