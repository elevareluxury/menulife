import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PWAPlatform = 'android' | 'ios' | 'desktop' | 'unknown'

const DISMISSED_KEY = 'mycen_pwa_install_dismissed'
const INSTALLED_KEY  = 'mycen_pwa_installed'

function detectPlatform(): PWAPlatform {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh|Windows|Linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

function checkStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS legacy (Safari < 16.4)
  if ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) return true
  return false
}

export function useInstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (checkStandalone()) return true
    return localStorage.getItem(INSTALLED_KEY) === 'true'
  })

  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  const platform = detectPlatform()
  const needsIOSInstructions = platform === 'ios' && !isInstalled

  useEffect(() => {
    if (checkStandalone()) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => {
      localStorage.setItem(INSTALLED_KEY, 'true')
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = async (): Promise<boolean> => {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true')
      setInstallPrompt(null)
      setIsInstalled(true)
      return true
    }
    return false
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setIsDismissed(true)
  }

  const resetDismiss = () => {
    localStorage.removeItem(DISMISSED_KEY)
    setIsDismissed(false)
  }

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    install,
    isDismissed,
    dismiss,
    resetDismiss,
    needsIOSInstructions,
    platform,
  }
}
