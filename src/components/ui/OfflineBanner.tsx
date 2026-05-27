import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-black"
      style={{
        backgroundColor: '#F59E0B',
        boxShadow: '0 2px 12px rgba(245,158,11,0.5)',
        animation: 'slideDown 0.25s ease-out',
      }}
    >
      <span>📡</span>
      <span>Sin conexión · Modo offline</span>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
      `}</style>
    </div>
  )
}
