import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import type { ServiceCustomer } from '../../types/customer'
import type { SaleItemInput } from '../../sales/salesTypes'
import { CURRENCIES } from '../../sales/salesTypes'
import { blankSaleItem, computeItemTotal, computeSaleTotals, formatCurrency } from '../../sales/salesUtils'

const STEPS = ['Cliente', 'Ítems', 'Totales', 'Confirmar'] as const

interface CreateSaleInput {
  customer_id:   string
  customer_name?: string
  title?:        string | null
  currency:      string
  tax_percent:   number
  notes?:        string | null
  items:         SaleItemInput[]
}

interface Props {
  open:             boolean
  onClose:          () => void
  customer:         ServiceCustomer
  onCreate:         (input: CreateSaleInput) => Promise<unknown>
  onCreated:        () => void
  defaultCurrency?: string
}

export function CreateSaleDrawer({ open, onClose, customer, onCreate, onCreated, defaultCurrency }: Props) {
  const [step,       setStep]       = useState(0)
  const [title,      setTitle]      = useState('')
  const [currency,   setCurrency]   = useState(defaultCurrency ?? 'ARS')
  const [taxPercent, setTaxPercent] = useState(0)
  const [notes,      setNotes]      = useState('')
  const [items,      setItems]      = useState<SaleItemInput[]>([blankSaleItem()])
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!open) {
      setStep(0)
      setTitle('')
      setCurrency(defaultCurrency ?? 'ARS')
      setTaxPercent(0)
      setNotes('')
      setItems([blankSaleItem()])
    }
  }, [open])

  if (!open) return null

  const validItems = items.filter(it => it.name.trim())
  const { subtotal, discount, tax, total } = computeSaleTotals(validItems, taxPercent)

  const canAdvance = () => {
    if (step === 1) return validItems.length > 0
    return true
  }

  const addItem = () => setItems(prev => [...prev, blankSaleItem()])
  const removeItem = (key: string) => setItems(prev => prev.filter(it => it.key !== key))
  const updateItem = (key: string, field: keyof SaleItemInput, value: string | number) =>
    setItems(prev => prev.map(it => it.key === key ? { ...it, [field]: value } : it))

  const handleSubmit = async () => {
    setSaving(true)
    const result = await onCreate({
      customer_id:   customer.id,
      customer_name: customer.full_name,
      title:         title.trim() || null,
      currency,
      tax_percent:   taxPercent,
      notes:         notes.trim() || null,
      items:         validItems,
    })
    setSaving(false)
    if (result) onCreated()
  }

  const fieldStyle = {
    background: 'rgba(255,255,255,0.04)',
    border:     '1px solid rgba(255,255,255,0.10)',
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl flex flex-col"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="text-sm font-bold text-white">Nueva venta</h3>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{customer.full_name}</p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4 flex items-center gap-2 flex-shrink-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: i <= step ? '#F4705A' : 'rgba(255,255,255,0.06)',
                    color:      i <= step ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] font-semibold" style={{ color: i === step ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {/* Step 0 — Cliente */}
          {step === 0 && (
            <>
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(244,112,90,0.15)', color: '#F4705A' }}
                >
                  {customer.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{customer.full_name}</p>
                  {customer.phone && (
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{customer.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  TÍTULO DE LA VENTA (opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Sesión de fotógrafo"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={fieldStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    MONEDA
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={{ ...fieldStyle, appearance: 'none' }}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c} style={{ background: '#13161C' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    IMPUESTO %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={taxPercent}
                    onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                    style={fieldStyle}
                  />
                </div>
              </div>
            </>
          )}

          {/* Step 1 — Ítems */}
          {step === 1 && (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.key}
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(item.key, 'name', e.target.value)}
                      placeholder="Nombre del ítem *"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={fieldStyle}
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(item.key)} style={{ color: 'rgba(239,68,68,0.7)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Cant.</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.quantity}
                        onChange={e => updateItem(item.key, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg text-sm text-white outline-none text-right"
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Precio</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={e => updateItem(item.key, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg text-sm text-white outline-none text-right"
                        style={fieldStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Dto.</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.discount}
                        onChange={e => updateItem(item.key, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-lg text-sm text-white outline-none text-right"
                        style={fieldStyle}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="text-xs font-bold" style={{ color: '#F4705A' }}>
                      {formatCurrency(computeItemTotal(item), currency)}
                    </span>
                  </div>
                </div>
              ))}
              <button
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
              >
                <Plus className="w-4 h-4" />
                Agregar ítem
              </button>
            </div>
          )}

          {/* Step 2 — Totales */}
          {step === 2 && (
            <div className="space-y-4">
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {validItems.map(item => (
                  <div
                    key={item.key}
                    className="flex justify-between px-4 py-3 text-sm"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {item.name}
                      {item.quantity !== 1 && <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>×{item.quantity}</span>}
                    </span>
                    <span className="font-semibold text-white">{formatCurrency(computeItemTotal(item), currency)}</span>
                  </div>
                ))}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      <span>Descuento</span><span style={{ color: '#22C55E' }}>−{formatCurrency(discount, currency)}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      <span>Impuesto ({taxPercent}%)</span><span>{formatCurrency(tax, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span>Total</span>
                    <span className="text-lg" style={{ color: '#F4705A' }}>{formatCurrency(total, currency)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  NOTAS INTERNAS (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observaciones, acuerdos especiales..."
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                  style={fieldStyle}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Confirmar */}
          {step === 3 && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'rgba(244,112,90,0.06)', border: '1px solid rgba(244,112,90,0.12)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-white">{customer.full_name}</p>
                    {title && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{title}</p>}
                  </div>
                  <p className="text-xl font-bold" style={{ color: '#F4705A' }}>{formatCurrency(total, currency)}</p>
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {validItems.length} ítem{validItems.length !== 1 ? 's' : ''}
                  {tax > 0 && ` · Impuesto ${taxPercent}%`}
                </div>
                {notes && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{notes}</p>
                )}
              </div>
              <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                La venta quedará en estado <span className="font-semibold" style={{ color: '#F59E0B' }}>pendiente</span>.
                Podés registrar el cobro desde el historial.
              </p>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div
          className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {step > 0 ? (
            <button
              onClick={() => setStep(p => p - 1)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
          ) : (
            <div className="flex-1" />
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(p => p + 1)}
              disabled={!canAdvance()}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#F4705A' }}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || validItems.length === 0}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: '#F4705A' }}
            >
              {saving ? 'Creando...' : 'Crear venta'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
