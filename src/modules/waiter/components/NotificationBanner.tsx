import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { NotificationItem } from '../hooks/useWaiterNotifications'

interface Props {
  banners: NotificationItem[]
  onDismiss: (id: string) => void
}

export function NotificationBanner({ banners, onDismiss }: Props) {
  if (banners.length === 0) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex flex-col gap-2 px-4 pointer-events-none">
      {banners.map(banner => (
        <BannerItem key={banner.id} banner={banner} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function BannerItem({
  banner,
  onDismiss,
}: {
  banner: NotificationItem
  onDismiss: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(banner.id), 300)
    }, 5000)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(hide)
    }
  }, [banner.id, onDismiss])

  const bgClass =
    banner.type === 'bill'
      ? 'bg-amber-500'
      : banner.type === 'call'
      ? 'bg-red-500'
      : banner.type === 'ready'
      ? 'bg-green-600'
      : 'bg-orange-500'

  return (
    <div
      className={`
        pointer-events-auto flex items-center justify-between gap-3 px-4 py-3
        rounded-xl shadow-lg text-white transition-all duration-300 ${bgClass}
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}
      `}
    >
      <span className="text-sm font-semibold">{banner.message}</span>
      <button
        onClick={() => onDismiss(banner.id)}
        className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
