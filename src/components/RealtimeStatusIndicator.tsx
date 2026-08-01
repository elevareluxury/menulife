import { useRealtimeStore } from '@/store/realtimeStore'
import { WifiOff, Loader2 } from 'lucide-react'

export function RealtimeStatusIndicator() {
  const { status, reconnectingChannels, lastDisconnectedAt } = useRealtimeStore()

  // Hidden during normal operation and during initial channel setup
  if (status === 'connected' || lastDisconnectedAt === null) return null

  if (status === 'connecting') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
        style={{ background: 'rgba(234,179,8,0.12)', color: '#EAB308' }}
        title={`Reconectando ${reconnectingChannels} canal(es)...`}
      >
        <Loader2 size={12} className="animate-spin" />
        <span>Reconectando...</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
      title="Sin conexión en tiempo real. Los cambios pueden no aparecer inmediatamente."
    >
      <WifiOff size={12} />
      <span>Sin conexión en vivo</span>
    </div>
  )
}
