import { create } from 'zustand'

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface RealtimeState {
  status: ConnectionStatus
  activeChannels: number
  reconnectingChannels: number
  lastDisconnectedAt: number | null

  registerChannel: (channelName: string) => void
  unregisterChannel: (channelName: string) => void
  setChannelStatus: (channelName: string, status: ConnectionStatus) => void
  reset: () => void
}

// Map kept outside the store to avoid per-change re-renders
const channelStates = new Map<string, ConnectionStatus>()

function calculateGlobalStatus(): ConnectionStatus {
  if (channelStates.size === 0) return 'connected'
  const statuses = Array.from(channelStates.values())
  if (statuses.some(s => s === 'disconnected')) return 'disconnected'
  if (statuses.some(s => s === 'connecting'))   return 'connecting'
  return 'connected'
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'connected',
  activeChannels: 0,
  reconnectingChannels: 0,
  lastDisconnectedAt: null,

  registerChannel: (name) => {
    channelStates.set(name, 'connecting')
    set({ activeChannels: channelStates.size, status: calculateGlobalStatus() })
  },

  unregisterChannel: (name) => {
    channelStates.delete(name)
    set({ activeChannels: channelStates.size, status: calculateGlobalStatus() })
  },

  setChannelStatus: (name, status) => {
    channelStates.set(name, status)
    const globalStatus = calculateGlobalStatus()
    const reconnecting = Array.from(channelStates.values()).filter(s => s === 'connecting').length
    set((state) => ({
      status: globalStatus,
      reconnectingChannels: reconnecting,
      lastDisconnectedAt:
        globalStatus === 'disconnected' && state.status !== 'disconnected'
          ? Date.now()
          : state.lastDisconnectedAt,
    }))
  },

  reset: () => {
    channelStates.clear()
    set({ status: 'connected', activeChannels: 0, reconnectingChannels: 0, lastDisconnectedAt: null })
  },
}))
