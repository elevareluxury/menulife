import { useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import { useInstallPWA } from '@/hooks/useInstallPWA'

const DISMISSED_KEY = 'pwa_install_dismissed'

export function InstallBanner() {
  const { canInstall, install } = useInstallPWA()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  )

  if (!canInstall || dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    const accepted = await install()
    if (accepted) setDismissed(true)
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(134,59,255,0.12), rgba(134,59,255,0.06))',
        border: '1px solid rgba(134,59,255,0.25)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ backgroundColor: 'rgba(134,59,255,0.2)' }}
        >
          <Smartphone className="w-5 h-5" style={{ color: '#863bff' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: '#F5F7FA' }}>
            Instalá MenuLife en tu celular
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#98A2B3' }}>
            Accedé más rápido sin abrir el navegador
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-opacity active:opacity-70"
          style={{ backgroundColor: '#863bff', color: '#fff' }}
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" style={{ color: '#98A2B3' }} />
        </button>
      </div>
    </div>
  )
}
