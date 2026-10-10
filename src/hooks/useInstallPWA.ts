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
  // iPadOS se presenta como una Mac: se distingue por la pantalla táctil
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh|Windows|Linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* sin almacenamiento */ } }

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
    return read(INSTALLED_KEY) === 'true'
  })

  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    read(DISMISSED_KEY) === 'true',
  )

  const platform = detectPlatform()
  const needsIOSInstructions = platform === 'ios' && !isInstalled

  useEffect(() => {
    // Abierta como app: el estado inicial ya lo sabe
    if (checkStandalone()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => {
      write(INSTALLED_KEY, 'true')
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
      write(INSTALLED_KEY, 'true')
      setInstallPrompt(null)
      setIsInstalled(true)
      return true
    }
    return false
  }

  const dismiss = () => {
    write(DISMISSED_KEY, 'true')
    setIsDismissed(true)
  }

  const resetDismiss = () => {
    try { localStorage.removeItem(DISMISSED_KEY) } catch { /* sin almacenamiento */ }
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

export type InstallMode = 'prompt' | 'ios' | 'android' | null

/** Cómo ofrecer "Agregar a inicio": la ventana del navegador, los pasos de iPhone/Android, o nada */
export function installMode({ canInstall, isInstalled, platform }: ReturnType<typeof useInstallPWA>): InstallMode {
  if (isInstalled) return null
  if (canInstall) return 'prompt'
  return platform === 'ios' || platform === 'android' ? platform : null
}

/** ¿Hay botón "Agregar a inicio" para mostrar? (para no dejar un lugar vacío en un encabezado) */
export function useCanAddToHome(): boolean {
  return installMode(useInstallPWA()) !== null
}
