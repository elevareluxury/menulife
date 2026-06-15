import { useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import type { Sale, PaymentMethod } from '../../sales/salesTypes'
import { PAYMENT_METHOD_TYPE_CONFIG } from '../../sales/salesTypes'
import { formatCurrency } from '../../sales/salesUtils'

interface Props {
  open:     boolean
  onClose:  () => void
  sale:     Sale
  methods:  PaymentMethod[]
  onRecord: (input: {
    sale_id:               string
    customer_id?:          string | null
    method_id?:            string | null
    amount:                number
    currency:              string
    transaction_reference?: string | null
    notes?:                string | null
  }) => Promise<unknown>
  onDone:   () => void
}

export function RecordPaymentDrawer({ open, onClose, sale, methods, onRecord, onDone }: Props) {
  const [methodId,   setMethodId]   = useState<string>('')
  const [amount,     setAmount]     = useState<string>(String(sale.balance_due > 0 ? sale.balance_due : sale.total))
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  if (!open) return null

  const numAmount = parseFloat(amount) || 0
  const selected  = methods.find(m => m.id === methodId)

  const handleSubmit = async () => {
    if (numAmount <= 0) return
    setSaving(true)
    const result = await onRecord({
      sale_id:               sale.id,
      customer_id:           sale.customer_id,
      method_id:             methodId || null,
      amount:                numAmount,
      currency:              sale.currency,
      transaction_reference: reference.trim() || null,
      notes:                 notes.trim() || null,
    })
    setSaving(false)
    if (result) {
      setMethodId('')
      setAmount(String(sale.balance_due))
      setReference('')
      setNotes('')
      onDone()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: '#22C55E' }} />
            <h3 className="text-sm font-bold text-white">Registrar pago</h3>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Balance due info */}
          {sale.balance_due > 0 && (
            <div
              className="rounded-xl p-3 flex items-center justify-between"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
            >
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Saldo pendiente</span>
              <span className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                {formatCurrency(sale.balance_due, sale.currency)}
              </span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              MONTO A PAGAR *
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {sale.currency}
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-14 pr-4 py-3 rounded-xl text-white text-lg font-bold bg-transparent outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              MÉTODO DE PAGO
            </label>
            {methods.length === 0 ? (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                No hay métodos configurados
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {methods.map(m => {
                  const cfg     = PAYMENT_METHOD_TYPE_CONFIG[m.type]
                  const isActive = methodId === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMethodId(isActive ? '' : m.id)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                        border:     isActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        color:      isActive ? '#22C55E' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      <span className="text-base">{cfg.emoji}</span>
                      <span className="text-xs font-semibold">{m.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reference */}
          {selected && ['transfer', 'qr', 'wallet'].includes(selected.type) && (
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                REFERENCIA / N° DE OPERACIÓN
              </label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Ej: MP-123456"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              NOTAS (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Pagó con billetes grandes"
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
            />
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={saving || numAmount <= 0}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: '#22C55E' }}
          >
            {saving ? 'Guardando...' : `Registrar ${sale.currency} ${numAmount.toLocaleString('es-AR')}`}
          </button>
        </div>
      </div>
    </>
  )
}
