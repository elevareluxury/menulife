import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useSales } from '../../hooks/useSales'
import { usePayments } from '../../hooks/usePayments'
import { usePaymentMethods } from '../../hooks/usePaymentMethods'
import { SaleCard } from './SaleCard'
import { CreateSaleDrawer } from './CreateSaleDrawer'
import type { ServiceCustomer } from '../../types/customer'
import type { SaleStatus } from '../../sales/salesTypes'

interface Props {
  customer:         ServiceCustomer
  restaurantId:     string
  defaultCurrency?: string
}

export function CustomerSalesSection({ customer, restaurantId, defaultCurrency }: Props) {
  const salesHook   = useSales(restaurantId)
  const payHook     = usePayments(restaurantId)
  const methodsHook = usePaymentMethods(restaurantId)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    salesHook.fetchByCustomer(customer.id)
    methodsHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.id, restaurantId])

  const pendingCount = salesHook.sales.filter(s =>
    ['pending', 'partially_paid'].includes(s.status)
  ).length

  const handleCreated = () => {
    setShowCreate(false)
    salesHook.fetchByCustomer(customer.id)
  }

  const handlePaymentRecorded = async (saleId: string) => {
    await salesHook.recalcBalance(saleId)
    salesHook.fetchByCustomer(customer.id)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">Ventas</h2>
          {pendingCount > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
            >
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      <div className="p-4 space-y-3">
        {salesHook.loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : salesHook.sales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin ventas registradas</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold mt-2"
              style={{ color: '#F4705A' }}
            >
              + Crear venta
            </button>
          </div>
        ) : (
          salesHook.sales.map(sale => (
            <SaleCard
              key={sale.id}
              sale={sale}
              methods={methodsHook.methods}
              onChangeStatus={(id, status: SaleStatus) => salesHook.updateStatus(id, status)}
              onPaymentRecorded={handlePaymentRecorded}
              onRecordPayment={payHook.record}
            />
          ))
        )}
      </div>

      <CreateSaleDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        customer={customer}
        onCreate={salesHook.create}
        onCreated={handleCreated}
        defaultCurrency={defaultCurrency}
      />
    </div>
  )
}
