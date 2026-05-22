import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Volume2, VolumeX } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useKitchenOrders } from '../hooks/useKitchenOrders'
import { OrderCard } from '../components/OrderCard'
import { Spinner } from '@/components/ui/Spinner'
import { ORDER_STATUS, ORDER_STATUS_LABELS, KDS_COLUMNS } from '@/lib/constants'

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    // AudioContext may be blocked by browser policy
  }
}

export function KitchenDisplay() {
  const { slug } = useParams()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const lastPendingCountRef = useRef(0)

  useEffect(() => {
    if (!slug) return

    async function fetchRestaurant() {
      const { data } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', slug as string)
        .single()

      if (data) setRestaurantId(data.id)
    }

    fetchRestaurant()
  }, [slug])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const { orders, loading, updateOrderStatus } = useKitchenOrders(restaurantId ?? '')

  // Sound notification for new pending orders
  useEffect(() => {
    if (!soundEnabled) return

    const pendingCount = orders.filter(o => o.status === ORDER_STATUS.PENDING).length

    if (pendingCount > lastPendingCountRef.current && lastPendingCountRef.current > 0) {
      playBeep()
    }

    lastPendingCountRef.current = pendingCount
  }, [orders, soundEnabled])

  const getOrdersByStatus = (status: string) =>
    orders.filter(o => o.status === status)

  if (loading || !restaurantId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <h1 className="text-2xl font-bold">Kitchen Display</h1>
              <span className="text-sm text-gray-400">
                {orders.length} pedidos activos
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {currentTime.toLocaleDateString('es-AR')}
                </div>
                <div className="text-lg font-mono font-bold">
                  {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-4">
          {KDS_COLUMNS.map((column, columnIndex) => {
            const columnOrders = getOrdersByStatus(column.id)

            const headerBg =
              column.color === 'blue' ? 'bg-blue-600' :
              column.color === 'yellow' ? 'bg-yellow-600' :
              column.color === 'green' ? 'bg-green-600' :
              'bg-gray-600'

            return (
              <div key={column.id} className="flex flex-col">
                <div className={`p-3 rounded-t-lg text-center font-bold text-lg mb-3 ${headerBg}`}>
                  {ORDER_STATUS_LABELS[column.id as keyof typeof ORDER_STATUS_LABELS].es}
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                  {columnOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-2">✓</div>
                      <div className="text-sm">Sin pedidos</div>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={updateOrderStatus}
                        isFirst={columnIndex === 0}
                        isLast={columnIndex === KDS_COLUMNS.length - 1}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
