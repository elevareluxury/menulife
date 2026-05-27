// Add <ImpersonationBanner /> inside DashboardPage (src/app/routes/dashboard.tsx)
// to show a warning when a super-admin is viewing as another restaurant.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'

interface ImpersonationData {
  restaurantId: string
  restaurantName: string
  restaurantSlug: string
}

export function ImpersonationBanner() {
  const navigate = useNavigate()
  const [data, setData] = useState<ImpersonationData | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('impersonating')
    if (!raw) return
    try {
      setData(JSON.parse(raw) as ImpersonationData)
    } catch {
      sessionStorage.removeItem('impersonating')
    }
  }, [])

  if (!data) return null

  const handleStop = () => {
    sessionStorage.removeItem('impersonating')
    setData(null)
    navigate('/super-admin')
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        backgroundColor: '#F59E0B',
        boxShadow: '0 2px 12px rgba(245,158,11,0.4)',
      }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-black flex-shrink-0" />
        <p className="text-sm font-semibold text-black">
          ⚠️ Viendo como: <strong>{data.restaurantName}</strong>
        </p>
      </div>
      <button
        onClick={handleStop}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-black bg-black/15 hover:bg-black/25 transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3" />
        Volver al superadmin
      </button>
    </div>
  )
}
