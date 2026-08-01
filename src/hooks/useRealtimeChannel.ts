import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRealtimeStore } from '@/store/realtimeStore'

export interface PostgresChangeFilter {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table: string
  filter?: string
}

interface UseRealtimeChannelOptions {
  channelName: string
  changes: PostgresChangeFilter[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvent: (payload: any) => void
  enabled?: boolean
}

// Backoff: 1s → 2s → 5s → 10s → 30s (max)
const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000]

export function useRealtimeChannel({
  channelName,
  changes,
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions) {
  const channelRef  = useRef<RealtimeChannel | null>(null)
  const attemptRef  = useRef(0)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef  = useRef(onEvent)

  // Keep the callback ref fresh without re-subscribing the channel
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  // Stringify for stable dep comparison without resubscribing on function identity changes
  const changesKey = JSON.stringify(changes)

  useEffect(() => {
    if (!enabled) return

    const { registerChannel, unregisterChannel, setChannelStatus } =
      useRealtimeStore.getState()

    registerChannel(channelName)
    let isCleanedUp = false

    const subscribe = () => {
      if (isCleanedUp) return

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ch = supabase.channel(channelName) as any

      changes.forEach((change) => {
        ch.on(
          'postgres_changes',
          {
            event: change.event,
            schema: change.schema ?? 'public',
            table: change.table,
            ...(change.filter ? { filter: change.filter } : {}),
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => { onEventRef.current(payload) }
        )
      })

      ch.subscribe((status: string) => {
        if (isCleanedUp) return
        if (status === 'SUBSCRIBED') {
          setChannelStatus(channelName, 'connected')
          attemptRef.current = 0
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setChannelStatus(channelName, 'disconnected')
          scheduleReconnect()
        }
      })

      channelRef.current = ch
    }

    const scheduleReconnect = () => {
      if (isCleanedUp) return
      const delay = BACKOFF_DELAYS[Math.min(attemptRef.current, BACKOFF_DELAYS.length - 1)]
      setChannelStatus(channelName, 'connecting')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        attemptRef.current += 1
        subscribe()
      }, delay)
    }

    subscribe()

    return () => {
      isCleanedUp = true
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
      if (channelRef.current)  { supabase.removeChannel(channelRef.current); channelRef.current = null }
      unregisterChannel(channelName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, changesKey])
}
