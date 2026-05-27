import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { playOrderReadySound } from '@/lib/notification-sound'

const STATUS_LABEL: Record<string, string> = {
  pending:   'Recibido',
  cooking:   'En preparación',
  ready:     '¡Listo para entregar!',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

interface SavedOrder {
  orderId: string
  tableNumber: string | null
  createdAt: string
  total: number
}

interface Props {
  slug: string
}

export function ActiveOrderBanner({ slug }: Props) {
  const navigate = useNavigate()
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(null)
  const [currentStatus, setCurrentStatus] = useState<string>('pending')
  const [dismissed, setDismissed] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string>('')

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

    // Fetch current status first
    supabase
      .from('orders')
      .select('status')
      .eq('id', savedOrder.orderId)
      .single()
      .then(({ data }) => {
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
            setDismissed(false) // re-show banner if dismissed
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
      channel.unsubscribe()
    }
  }, [savedOrder?.orderId, slug])

  if (!savedOrder || dismissed) return null
  if (currentStatus === 'delivered') return null

  const isReady = currentStatus === 'ready'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="fixed left-4 right-4 z-40 rounded-2xl overflow-hidden"
        style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            backgroundColor: isReady ? '#FF6B7A' : '#1A1A1A',
            border: `1px solid ${isReady ? 'transparent' : 'rgba(255,107,122,0.25)'}`,
            boxShadow: isReady
              ? '0 8px 24px rgba(255,107,122,0.4)'
              : '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {/* Status dot */}
          <motion.div
            animate={isReady ? { scale: [1, 1.3, 1] } : {}}
            transition={isReady ? { repeat: Infinity, duration: 0.8 } : {}}
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isReady ? 'white' : '#FF6B7A' }}
          />

          {/* Text */}
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => navigate(`/r/${slug}/pedido/${savedOrder.orderId}`)}
          >
            <p
              className="text-xs font-semibold truncate"
              style={{ color: isReady ? 'white' : '#F5F5F5' }}
            >
              {orderNumber ? `Pedido #${orderNumber} · ` : ''}
              {STATUS_LABEL[currentStatus] ?? currentStatus}
            </p>
            {savedOrder.tableNumber && (
              <p
                className="text-[10px]"
                style={{ color: isReady ? 'rgba(255,255,255,0.75)' : '#888888' }}
              >
                Mesa {savedOrder.tableNumber}
              </p>
            )}
          </button>

          {/* Navigate arrow */}
          <button
            onClick={() => navigate(`/r/${slug}/pedido/${savedOrder.orderId}`)}
            className="flex-shrink-0"
            style={{ color: isReady ? 'white' : '#FF6B7A' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 ml-1"
            style={{ color: isReady ? 'rgba(255,255,255,0.7)' : '#888888' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
