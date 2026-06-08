import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, XCircle, CheckCircle, ShoppingCart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type AlertType = 'low_stock' | 'out_of_stock'

interface Alert {
  id: string
  restaurant_id: string
  product_id: string
  type: AlertType
  message: string | null
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  product?: {
    id: string
    name: string
    stock_current: number
    stock_min: number
    image_url: string | null
  }
}

interface Props {
  restaurantId: string
  onReponer: (productId: string) => void
}

const MUTED = 'rgba(255,255,255,0.45)'
const TEXT  = '#F5F7FA'
const CARD  = '#1a1a1a'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AlertasTab({ restaurantId, onReponer }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('inventory_alerts')
        .select('*, product:product_id(id, name, stock_current, stock_min, image_url)')
        .eq('restaurant_id', restaurantId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      setAlerts(data ?? [])
    } catch (err) {
      toast.error('Error al cargar alertas')
      console.error(err)
    }
  }, [restaurantId])

  useEffect(() => {
    setLoading(true)
    fetchAlerts().finally(() => setLoading(false))
  }, [fetchAlerts])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`inventory_alerts_${restaurantId}`)
      .on(
        'postgres_changes' as Parameters<ReturnType<typeof supabase.channel>['on']>[0],
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_alerts',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => { fetchAlerts() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetchAlerts])

  async function handleResolve(alertId: string) {
    setResolving(alertId)
    try {
      const { error } = await db
        .from('inventory_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
      toast.success('Alerta resuelta')
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (err: unknown) {
      toast.error('Error al resolver alerta')
      console.error(err)
    } finally {
      setResolving(null)
    }
  }

  const lowStockCount = alerts.filter(a => a.type === 'low_stock').length
  const outOfStockCount = alerts.filter(a => a.type === 'out_of_stock').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#F4705A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-400">Stock bajo</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{lowStockCount}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>producto{lowStockCount !== 1 ? 's' : ''} bajo mínimo</p>
        </div>

        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-400">Sin stock</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{outOfStockCount}</p>
          <p className="text-xs mt-1" style={{ color: MUTED }}>producto{outOfStockCount !== 1 ? 's' : ''} sin stock</p>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="text-white font-medium">Todo en orden</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>No hay alertas activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="rounded-xl p-4 flex items-center gap-4"
              style={{
                background: CARD,
                border: alert.type === 'out_of_stock'
                  ? '1px solid rgba(239,68,68,0.25)'
                  : '1px solid rgba(245,158,11,0.25)',
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: alert.type === 'out_of_stock'
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(245,158,11,0.1)',
                }}
              >
                {alert.type === 'out_of_stock'
                  ? <XCircle className="w-5 h-5 text-red-400" />
                  : <AlertTriangle className="w-5 h-5 text-amber-400" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: TEXT }}>
                  {alert.product?.name ?? 'Producto desconocido'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  {alert.type === 'out_of_stock'
                    ? 'Sin stock'
                    : `Stock: ${alert.product?.stock_current ?? 0} / Mínimo: ${alert.product?.stock_min ?? 5}`
                  }
                </p>
                {alert.message && (
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>{alert.message}</p>
                )}
                <p className="text-xs mt-1 opacity-50">{formatDate(alert.created_at)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => alert.product && onReponer(alert.product.id)}
                  disabled={!alert.product}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-30"
                  style={{ background: '#F4705A' }}
                  title="Reponer stock"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reponer</span>
                </button>
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolving === alert.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-colors disabled:opacity-30"
                >
                  {resolving === alert.id
                    ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle className="w-3.5 h-3.5" />
                  }
                  <span className="hidden sm:inline">Resolver</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
