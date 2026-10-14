import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

/** Sigue la conexión del dispositivo. Con `backMessage`, al volver muestra un aviso breve. */
export function useOnlineStatus(backMessage?: string) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      if (backMessage) toast.success(backMessage, { id: 'online-status' })
    }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [backMessage])

  return { isOnline }
}
