import { useCallback, useEffect, useState } from 'react'
import { countUnreadMessages } from './studioApi'

/** Evento para que todos los contadores se actualicen cuando la bandeja marca o borra un mensaje */
export const MESSAGES_CHANGED = 'mycen:messages-changed'
export const notifyMessagesChanged = () => window.dispatchEvent(new Event(MESSAGES_CHANGED))

/**
 * Mensajes sin leer del formulario de contacto (todos los Spaces de la cuenta). Se actualiza al entrar, al volver a la
 * pestaña y cuando la bandeja cambia algo. Sin emails ni servicios externos; con la app nativa lo va a usar el aviso push.
 */
export function useUnreadMessages(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => {
    countUnreadMessages().then(setCount, () => undefined)
  }, [])

  useEffect(() => {
    refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(MESSAGES_CHANGED, refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(MESSAGES_CHANGED, refresh)
    }
  }, [refresh])

  return { count, refresh }
}

/** Link para responder según el contacto que dejó la persona: email, WhatsApp o ninguno */
export function replyLinks(contact: string): { email: string | null; whatsapp: string | null } {
  const c = contact.trim()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? `mailto:${c}` : null
  const digits = c.replace(/[^\d]/g, '')
  const whatsapp = !email && digits.length >= 8 && digits.length <= 15 && /^[+\d\s().-]+$/.test(c) ? `https://wa.me/${digits}` : null
  return { email, whatsapp }
}
