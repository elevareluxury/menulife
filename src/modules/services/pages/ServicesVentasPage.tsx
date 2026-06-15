import { useState, useEffect } from 'react'
import { Plus, CreditCard, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useSales } from '../hooks/useSales'
import { usePayments } from '../hooks/usePayments'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { SaleCard } from '../components/sales/SaleCard'
import { PAYMENT_METHOD_TYPE_CONFIG } from '../sales/salesTypes'
import { formatCurrency } from '../sales/salesUtils'
import type { SaleStatus } from '../sales/salesTypes'

export function ServicesVentasPage() {
  const { restaurant }  = useRestaurant()
  const salesHook       = useSales(restaurant?.id)
  const payHook         = usePayments(restaurant?.id)
  const methodsHook     = usePaymentMethods(restaurant?.id)
  const [showMethods, setShowMethods] = useState(false)

  useEffect(() => {
    if (!restaurant?.id) return
    salesHook.fetchAll(100)
    methodsHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  useEffect(() => {
    if (!restaurant?.id || methodsHook.loading) return
    if (methodsHook.methods.length === 0 && !methodsHook.seeding) {
      methodsHook.seedDefaults()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, methodsHook.loading])

  if (!restaurant?.id) return null

  const currency    = restaurant.default_currency
  const totalRevenue = salesHook.sales
    .filter(s => ['paid', 'partially_paid'].includes(s.status))
    .reduce((sum, s) => sum + s.total, 0)
  const pendingSales = salesHook.sales.filter(s => ['pending', 'partially_paid'].includes(s.status))
  const pendingAmount = pendingSales.reduce((sum, s) => sum + s.balance_due, 0)
  const todaySales   = salesHook.sales.filter(s => {
    const d = new Date(s.created_at)
    const n = new Date()
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
  })

  const handlePaymentRecorded = async (saleId: string) => {
    await salesHook.recalcBalance(saleId)
    salesHook.fetchAll(100)
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Ventas</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Historial de cobros y seguimiento de ingresos
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            icon:  <TrendingUp className="w-4 h-4" />,
            color: '#22C55E',
            label: 'Ingresos',
            value: formatCurrency(totalRevenue, currency),
          },
          {
            icon:  <Clock className="w-4 h-4" />,
            color: '#F59E0B',
            label: 'Pendiente',
            value: formatCurrency(pendingAmount, currency),
          },
          {
            icon:  <CreditCard className="w-4 h-4" />,
            color: '#3B82F6',
            label: 'Hoy',
            value: String(todaySales.length),
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl p-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="mb-2" style={{ color: stat.color }}>{stat.icon}</div>
            <p className="text-base font-bold text-white leading-none mb-1 truncate">{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Métodos de pago */}
      <div
        className="rounded-2xl overflow-hidden mb-5"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          className="w-full px-5 py-4 flex items-center justify-between"
          onClick={() => setShowMethods(p => !p)}
        >
          <span className="text-sm font-bold text-white">Métodos de pago</span>
          <span className="text-xs font-semibold" style={{ color: '#F4705A' }}>
            {methodsHook.methods.length} activos
          </span>
        </button>
        {showMethods && (
          <div
            className="px-5 pb-4 space-y-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="pt-3 space-y-2">
              {methodsHook.methods.map(m => {
                const cfg = PAYMENT_METHOD_TYPE_CONFIG[m.type]
                return (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cfg.emoji}</span>
                      <span className="text-sm text-white">{m.name}</span>
                    </div>
                    <button
                      onClick={() => methodsHook.deactivate(m.id)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                    >
                      Desactivar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ventas pendientes */}
      {pendingSales.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4" style={{ color: '#F59E0B' }} />
            <h2 className="text-sm font-bold text-white">Cobros pendientes</h2>
          </div>
          <div className="space-y-2">
            {pendingSales.map(sale => (
              <SaleCard
                key={sale.id}
                sale={sale}
                methods={methodsHook.methods}
                onChangeStatus={(id, status: SaleStatus) => salesHook.updateStatus(id, status)}
                onPaymentRecorded={handlePaymentRecorded}
                onRecordPayment={payHook.record}
              />
            ))}
          </div>
        </div>
      )}

      {/* All sales */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Todas las ventas</h2>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {salesHook.sales.length} ventas
          </span>
        </div>

        {salesHook.loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : salesHook.sales.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Plus className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm font-semibold text-white mb-1">Sin ventas todavía</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Registrá cobros desde el perfil de cada cliente
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {salesHook.sales.map(sale => (
              <SaleCard
                key={sale.id}
                sale={sale}
                methods={methodsHook.methods}
                onChangeStatus={(id, status: SaleStatus) => salesHook.updateStatus(id, status)}
                onPaymentRecorded={handlePaymentRecorded}
                onRecordPayment={payHook.record}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
