import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { playOrderReadySound } from '@/lib/notification-sound'

const STATUS_LABEL: Record<string, string> = {
  pending:   'Recibido',
  cooking:   'En preparación',
  ready:     '¡Listo para entregar!',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pending:  '#F59E0B',
  cooking:  '#3B82F6',
  ready:    '#10B981',
  delivered:'#10B981',
  cancelled:'#EF4444',
}

interface SavedOrder {
  orderId: string
  tableNumber: string | null
  createdAt: string
  total: number
}

interface Props {
  slug: string
  onCallWaiter?: () => void
  onVisibleChange?: (visible: boolean) => void
}

export function ActiveOrderBanner({ slug, onCallWaiter, onVisibleChange }: Props) {
  const navigate = useNavigate()
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string>('pending')
  const [orderNumber, setOrderNumber] = useState<string>('')
  const [callingWaiter, setCallingWaiter] = useState(false)

  const isVisible = !!savedOrder && currentStatus !== 'delivered' && currentStatus !== 'cancelled'

  // Notify parent of visibility
  useEffect(() => {
    onVisibleChange?.(isVisible)
  }, [isVisible, onVisibleChange])

  // Load from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(`order_${slug}`)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as SavedOrder & { status?: string; orderNumber?: string }
      setSavedOrder(parsed)
      if (parsed.status) setCurrentStatus(parsed.status)
      if (parsed.orderNumber) setOrderNumber(parsed.orderNumber)
    } catch {
      sessionStorage.removeItem(`order_${slug}`)
    }
  }, [slug])

  // Subscribe to realtime when we have an order
  useEffect(() => {
    if (!savedOrder?.orderId) return

    let ignore = false

    supabase
      .from('orders')
      .select('status')
      .eq('id', savedOrder.orderId)
      .single()
      .then(({ data }) => {
        if (ignore) return
        if (data) setCurrentStatus(data.status as string)
        if (data?.status === 'delivered' || data?.status === 'cancelled') {
          setTimeout(() => {
            sessionStorage.removeItem(`order_${slug}`)
            setSavedOrder(null)
          }, 8000)
        }
      })

    const channel = supabase
      .channel(`banner-order-${savedOrder.orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${savedOrder.orderId}` },
        (payload) => {
          const updated = payload.new as { status: string }
          const newStatus = updated.status

          if (newStatus === 'ready') {
            playOrderReadySound()
            if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          }

          setCurrentStatus(newStatus)

          if (newStatus === 'delivered' || newStatus === 'cancelled') {
            setTimeout(() => {
              sessionStorage.removeItem(`order_${slug}`)
              setSavedOrder(null)
            }, 8000)
          }
        }
      )
      .subscribe()

    return () => {
      ignore = true
      channel.unsubscribe()
    }
  }, [savedOrder?.orderId, slug])

  const handleCallWaiter = async () => {
    if (onCallWaiter) {
      onCallWaiter()
      return
    }
    // Fallback if no prop provided
    setCallingWaiter(true)
    setTimeout(() => setCallingWaiter(false), 2000)
  }

  const isReady = currentStatus === 'ready'
  const dotColor = isReady ? '#10B981' : (STATUS_COLOR[currentStatus] ?? '#F4705A')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={savedOrder!.orderId}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed left-0 right-0 z-50"
          style={{ bottom: 0 }}
        >
          <div
            className="flex items-center gap-3 px-4"
            style={{
              backgroundColor: isReady ? '#10B981' : '#111318',
              borderTop: `1px solid ${isReady ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
              paddingTop: '12px',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
              boxShadow: isReady
                ? '0 -4px 24px rgba(16,185,129,0.35)'
                : '0 -4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {/* Status dot */}
            <motion.div
              animate={isReady ? { scale: [1, 1.4, 1] } : { opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: isReady ? 0.8 : 1.6 }}
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dotColor }}
            />

            {/* Status text — tappable to order detail */}
            <button
              className="flex-1 min-w-0 text-left"
              onClick={() => navigate(`/r/${slug}/pedido/${savedOrder!.orderId}`)}
            >
              <p
                className="text-sm font-semibold truncate leading-tight"
                style={{ color: isReady ? '#fff' : '#F5F5F5' }}
              >
                {orderNumber ? `#${orderNumber} · ` : ''}
                {STATUS_LABEL[currentStatus] ?? currentStatus}
              </p>
              {savedOrder!.tableNumber && (
                <p
                  className="text-[11px] leading-tight mt-0.5"
                  style={{ color: isReady ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)' }}
                >
                  Mesa {savedOrder!.tableNumber}
                </p>
              )}
            </button>

            {/* Call waiter button — only when has table and waiter handler */}
            {savedOrder!.tableNumber && (onCallWaiter !== undefined) && (
              <button
                onClick={handleCallWaiter}
                disabled={callingWaiter}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                style={{
                  padding: '7px 13px',
                  background: isReady ? 'rgba(255,255,255,0.2)' : 'rgba(244,112,90,0.15)',
                  color: isReady ? '#fff' : '#F4705A',
                  border: `1px solid ${isReady ? 'rgba(255,255,255,0.3)' : 'rgba(244,112,90,0.3)'}`,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{callingWaiter ? '...' : 'Mozo'}</span>
              </button>
            )}

            {/* View detail arrow */}
            <button
              onClick={() => navigate(`/r/${slug}/pedido/${savedOrder!.orderId}`)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl"
              style={{
                background: isReady ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                color: isReady ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
