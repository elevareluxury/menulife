import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreHorizontal, CreditCard, XCircle } from 'lucide-react'
import type { Sale, SaleStatus } from '../../sales/salesTypes'
import type { PaymentMethod } from '../../sales/salesTypes'
import { SALE_STATUS_CONFIG, PAYMENT_METHOD_TYPE_CONFIG } from '../../sales/salesTypes'
import { formatCurrency } from '../../sales/salesUtils'
import { RecordPaymentDrawer } from './RecordPaymentDrawer'

interface Props {
  sale:              Sale
  methods:           PaymentMethod[]
  onChangeStatus:    (id: string, status: SaleStatus) => Promise<boolean>
  onPaymentRecorded: (saleId: string) => Promise<void>
  onRecordPayment:   (input: {
    sale_id:               string
    customer_id?:          string | null
    method_id?:            string | null
    amount:                number
    currency:              string
    transaction_reference?: string | null
    notes?:                string | null
  }) => Promise<unknown>
}

export function SaleCard({ sale, methods, onChangeStatus, onPaymentRecorded, onRecordPayment }: Props) {
  const [expanded,   setExpanded]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [payOpen,    setPayOpen]    = useState(false)

  const cfg    = SALE_STATUS_CONFIG[sale.status]
  const isPaid = sale.status === 'paid'
  const isCancelled = ['cancelled', 'refunded'].includes(sale.status)

  const statusActions: Array<{ label: string; status: SaleStatus; color?: string }> = [
    ...(sale.status !== 'cancelled' && !isPaid ? [{ label: 'Cancelar venta', status: 'cancelled' as SaleStatus, color: '#EF4444' }] : []),
    ...(sale.status !== 'paid'      && !isCancelled ? [{ label: 'Marcar como pagado', status: 'paid' as SaleStatus }] : []),
  ]

  const dateStr = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(sale.created_at))

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header row */}
        <div
          className="px-4 py-3 flex items-center gap-3 cursor-pointer"
          onClick={() => setExpanded(p => !p)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-white">{sale.sale_number}</span>
              {sale.title && (
                <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  — {sale.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{dateStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-white">{formatCurrency(sale.total, sale.currency)}</p>
              {sale.balance_due > 0 && (
                <p className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>
                  Debe {formatCurrency(sale.balance_due, sale.currency)}
                </p>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            )}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Items */}
            {sale.items && sale.items.length > 0 && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Ítems
                </p>
                {sale.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-white">{item.name}</span>
                      <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        ×{item.quantity}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-white flex-shrink-0">
                      {formatCurrency(item.total, sale.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div
              className="px-4 py-3 space-y-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(sale.subtotal, sale.currency)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span>Descuento</span>
                  <span style={{ color: '#22C55E' }}>−{formatCurrency(sale.discount, sale.currency)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span>Impuesto</span>
                  <span>{formatCurrency(sale.tax, sale.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span>Total</span>
                <span>{formatCurrency(sale.total, sale.currency)}</span>
              </div>
            </div>

            {/* Payments */}
            {sale.payments && sale.payments.length > 0 && (
              <div
                className="px-4 py-3 space-y-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Pagos
                </p>
                {sale.payments.map(payment => {
                  const mType = payment.method?.type
                  const mCfg  = mType ? PAYMENT_METHOD_TYPE_CONFIG[mType] : null
                  return (
                    <div key={payment.id} className="flex items-center gap-2">
                      {mCfg && <span className="text-sm">{mCfg.emoji}</span>}
                      <span className="flex-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {payment.method?.name ?? 'Pago'}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div
              className="px-4 py-3 flex items-center gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {!isPaid && !isCancelled && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Registrar pago
                </button>
              )}

              {statusActions.length > 0 && (
                <div className="relative ml-auto">
                  <button
                    onClick={() => setMenuOpen(p => !p)}
                    className="p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <MoreHorizontal className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div
                        className="absolute right-0 bottom-10 z-20 rounded-xl overflow-hidden min-w-[180px]"
                        style={{ background: '#1E2128', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      >
                        {statusActions.map(action => (
                          <button
                            key={action.status}
                            onClick={async () => {
                              setMenuOpen(false)
                              await onChangeStatus(sale.id, action.status)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors"
                            style={{ color: action.color ?? 'rgba(255,255,255,0.7)' }}
                          >
                            {action.status === 'cancelled' && <XCircle className="w-4 h-4 flex-shrink-0" />}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <RecordPaymentDrawer
        open={payOpen}
        onClose={() => setPayOpen(false)}
        sale={sale}
        methods={methods}
        onRecord={onRecordPayment}
        onDone={async () => {
          setPayOpen(false)
          await onPaymentRecorded(sale.id)
        }}
      />
    </>
  )
}
