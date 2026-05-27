import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrderTracking } from '@/hooks/useOrderTracking'
import { OrderStepper } from '@/components/tracking/OrderStepper'
import { OrderStatusCard } from '@/components/tracking/OrderStatusCard'
import { triggerConfetti } from '@/lib/confetti'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

const CARD = '#111111'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT_PRIMARY = '#F5F5F5'
const TEXT_SECONDARY = '#888888'
const ACCENT = '#FF6B7A'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TrackingSkeleton({ restaurantName }: { restaurantName: string }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0D0D0D' }}>
      <Header restaurantName={restaurantName} slug="" />
      <div className="max-w-[480px] mx-auto px-4 pt-6 space-y-5">
        {/* Stepper skeleton */}
        <div className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: CARD }}>
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="contents">
                <div className="w-10 h-10 rounded-full bg-[#374151] flex-shrink-0" />
                {i < 3 && <div className="flex-1 h-0.5 bg-[#374151]" />}
              </div>
            ))}
          </div>
        </div>
        {/* Card skeleton */}
        <div className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: CARD }}>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-[#374151] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#374151] rounded w-1/2" />
              <div className="h-3 bg-[#374151] rounded w-3/4" />
            </div>
          </div>
        </div>
        {/* Items skeleton */}
        <div className="rounded-2xl p-5 animate-pulse space-y-3" style={{ backgroundColor: CARD }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-[#374151] rounded w-2/3" />
              <div className="h-3 bg-[#374151] rounded w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ restaurantName, slug }: { restaurantName: string; slug: string }) {
  const navigate = useNavigate()
  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14"
      style={{
        backgroundColor: '#0D0D0D',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <button
        onClick={() => navigate(slug ? `/r/${slug}` : '/')}
        className="p-2 -ml-2 rounded-xl transition-colors hover:bg-white/5"
        style={{ color: TEXT_SECONDARY }}
        aria-label="Volver al menú"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <span className="font-semibold text-sm flex-1 truncate" style={{ color: TEXT_PRIMARY }}>
        {restaurantName}
      </span>
    </div>
  )
}

// ── Not found ─────────────────────────────────────────────────────────────────

function NotFoundState({ slug }: { slug: string }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: '#0D0D0D' }}>
      <div className="text-5xl mb-4">❓</div>
      <p className="text-base font-semibold mb-2" style={{ color: TEXT_PRIMARY }}>
        No encontramos tu pedido
      </p>
      <p className="text-sm mb-8" style={{ color: TEXT_SECONDARY }}>
        Es posible que haya expirado o el link sea incorrecto
      </p>
      <button
        onClick={() => navigate(`/r/${slug}`)}
        className="px-6 py-3 rounded-2xl font-semibold text-white text-sm"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}
      >
        ← Volver al menú
      </button>
    </div>
  )
}

// ── Cancelled ─────────────────────────────────────────────────────────────────

function CancelledState({ slug }: { slug: string }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: '#0D0D0D' }}>
      <div className="text-5xl mb-4">❌</div>
      <p className="text-base font-semibold mb-2" style={{ color: TEXT_PRIMARY }}>
        Pedido cancelado
      </p>
      <p className="text-sm mb-8" style={{ color: TEXT_SECONDARY }}>
        Hablá con el mozo para más información
      </p>
      <button
        onClick={() => navigate(`/r/${slug}`)}
        className="px-6 py-3 rounded-2xl font-semibold text-white text-sm"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}
      >
        ← Volver al menú
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function OrderTracking() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const navigate = useNavigate()
  const { order, loading, error, previousStatus } = useOrderTracking(orderId ?? '')
  const [restaurantName, setRestaurantName] = useState('')
  const [callingWaiter, setCallingWaiter] = useState(false)
  const [confettiDone, setConfettiDone] = useState(false)

  // Fetch restaurant name
  useEffect(() => {
    if (!slug) return
    supabase
      .from('restaurants')
      .select('name')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) setRestaurantName(data.name as string)
      })
  }, [slug])

  // Confetti when order becomes ready
  useEffect(() => {
    if (
      order?.status === 'ready' &&
      previousStatus !== 'ready' &&
      !confettiDone
    ) {
      triggerConfetti()
      setConfettiDone(true)
    }
  }, [order?.status, previousStatus, confettiDone])

  // Call waiter
  const callWaiter = async () => {
    if (!order || callingWaiter) return
    setCallingWaiter(true)
    try {
      const { data: waiterData } = await supabase
        .from('waiters')
        .select('id')
        .eq('restaurant_id', order.restaurant_id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!waiterData) {
        toast.error('No hay mozos disponibles ahora')
        return
      }

      const { data: tableData } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', order.restaurant_id)
        .eq('table_number', order.table_number ?? '')
        .single()

      if (!tableData) {
        toast.error('Mesa no encontrada')
        return
      }

      await supabase.from('waiter_calls').insert({
        waiter_id: waiterData.id,
        table_id: tableData.id,
        restaurant_id: order.restaurant_id,
        status: 'pending',
      })

      toast.success('¡Mozo notificado!')
    } catch {
      toast.error('No pudimos llamar al mozo, intentá de nuevo')
    } finally {
      setTimeout(() => setCallingWaiter(false), 3000)
    }
  }

  if (loading) return <TrackingSkeleton restaurantName={restaurantName} />
  if (error || !order) return <NotFoundState slug={slug ?? ''} />
  if (order.status === 'cancelled') return <CancelledState slug={slug ?? ''} />

  const displayId = order.id.slice(-4).toUpperCase()
  const tableOrName =
    order.order_type === 'dine_in'
      ? `Mesa ${order.table_number}`
      : order.customer_name ?? 'Para llevar'

  const currency = order.currency as 'ARS' | 'USD'

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#0D0D0D' }}>
      <Header restaurantName={restaurantName} slug={slug ?? ''} />

      <div className="max-w-[480px] mx-auto px-4 pt-6 space-y-5">

        {/* Confirmation header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center pt-2 pb-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="text-4xl mb-3"
          >
            🎉
          </motion.div>
          <h1 className="text-xl font-bold mb-1" style={{ color: TEXT_PRIMARY }}>
            ¡Pedido confirmado!
          </h1>
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
            {tableOrName} · Pedido #{displayId}
          </p>
        </motion.div>

        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
        >
          <OrderStepper status={order.status} />
        </motion.div>

        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <OrderStatusCard status={order.status} />
        </motion.div>

        {/* Items list */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="rounded-2xl p-5"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
        >
          <p className="text-sm font-semibold mb-4" style={{ color: TEXT_PRIMARY }}>
            Tu pedido
          </p>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ backgroundColor: `${ACCENT}22`, color: ACCENT }}
                  >
                    x{item.quantity}
                  </span>
                  <span className="text-sm truncate" style={{ color: TEXT_PRIMARY }}>
                    {item.menu_item_name}
                  </span>
                </div>
                <span className="text-sm font-medium flex-shrink-0" style={{ color: TEXT_SECONDARY }}>
                  {formatPrice(item.price_snapshot * item.quantity, currency)}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 pt-4 flex justify-between"
            style={{ borderTop: `1px solid ${BORDER}` }}
          >
            <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
              Total
            </span>
            <span className="text-base font-bold" style={{ color: ACCENT }}>
              {formatPrice(order.total, currency)}
            </span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="space-y-3 pb-6"
        >
          <button
            onClick={() => navigate(`/r/${slug}`)}
            className="w-full py-4 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)`, boxShadow: `0 8px 24px ${ACCENT}35` }}
          >
            <ShoppingCart className="w-4 h-4" />
            Seguir pidiendo
          </button>

          {order.order_type === 'dine_in' && (
            <button
              onClick={callWaiter}
              disabled={callingWaiter}
              className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                backgroundColor: CARD,
                border: `1px solid ${BORDER}`,
                color: TEXT_SECONDARY,
              }}
            >
              <Bell className={`w-4 h-4 ${callingWaiter ? 'animate-pulse' : ''}`} />
              {callingWaiter ? 'Mozo notificado ✓' : 'Llamar al mozo'}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
