import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export function useOnlineStatus() {
  const [isOnline, setIsOnline]   = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        toast.success('✅ Conexión restaurada', { id: 'online-status' })
        setWasOffline(false)
      }
    }

    const goOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      toast.error('📡 Sin conexión — modo offline', {
        id: 'online-status',
        duration: Infinity,
      })
    }

    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [wasOffline])

  return { isOnline, wasOffline }
}
