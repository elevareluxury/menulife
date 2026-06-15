import { useState } from 'react'
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { QuoteTemplate, QuoteItemInput } from '../../quotes/quoteTypes'
import { CURRENCIES } from '../../quotes/quoteTypes'
import { blankItem, computeItemTotal, computeTotals, computeExpiresAt, formatCurrency } from '../../quotes/quoteUtils'
import type { ServiceCustomer } from '../../types/customer'

interface CreateQuoteDrawerProps {
  open:             boolean
  onClose:          () => void
  onCreated:        () => void
  customer:         ServiceCustomer
  templates:        QuoteTemplate[]
  defaultCurrency?: string
  onCreate:         (input: {
    customer_id:    string
    customer_name?: string
    title:          string
    description?:   string | null
    template_id?:   string | null
    currency:       string
    tax_percent:    number
    expires_at?:   string | null
    notes?:        string | null
    items:         QuoteItemInput[]
  }) => Promise<unknown>
}

const STEPS = ['Cliente', 'Ítems', 'Totales', 'Enviar']

export function CreateQuoteDrawer({ open, onClose, onCreated, customer, templates, defaultCurrency, onCreate }: CreateQuoteDrawerProps) {
  const [step,       setStep]       = useState(0)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [title,      setTitle]      = useState('')
  const [description,setDescription]= useState('')
  const [currency,   setCurrency]   = useState(defaultCurrency ?? 'ARS')
  const [taxPercent, setTaxPercent] = useState('0')
  const [expiryDays, setExpiryDays] = useState('')
  const [notes,      setNotes]      = useState('')
  const [items,      setItems]      = useState<QuoteItemInput[]>([blankItem()])
  const [saving,     setSaving]     = useState(false)

  if (!open) return null

  const selectedTpl = templates.find(t => t.id === templateId) ?? null
  const expiresAt   = expiryDays
    ? computeExpiresAt(parseInt(expiryDays))
    : selectedTpl?.expiration_days
      ? computeExpiresAt(selectedTpl.expiration_days)
      : null

  const { subtotal, tax_amount, total_amount } = computeTotals(items, parseFloat(taxPercent) || 0)

  const updateItem = (key: string, patch: Partial<QuoteItemInput>) =>
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))

  const canNext = () => {
    if (step === 0) return title.trim().length > 0
    if (step === 1) return items.some(it => it.name.trim())
    return true
  }

  const handleClose = () => {
    setStep(0); setTemplateId(null); setTitle(''); setDescription('')
    setCurrency(defaultCurrency ?? 'ARS'); setTaxPercent('0'); setExpiryDays(''); setNotes('')
    setItems([blankItem()])
    onClose()
  }

  const handleSend = async () => {
    setSaving(true)
    await onCreate({
      customer_id:   customer.id,
      customer_name: customer.full_name,
      title:         title.trim(),
      description:  description.trim() || null,
      template_id:  templateId,
      currency,
      tax_percent:  parseFloat(taxPercent) || 0,
      expires_at:   expiresAt,
      notes:        notes.trim() || null,
      items:        items.filter(it => it.name.trim()),
    })
    setSaving(false)
    handleClose()
    onCreated()
  }

  const activeTemplates = templates.filter(t => t.status === 'active')

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={handleClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[500px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '94dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <h2 className="text-base font-bold text-white">Nueva cotización</h2>
            </div>
            <button onClick={handleClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div
                  className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: i <= step ? '#F4705A' : 'rgba(255,255,255,0.1)' }}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: i < step ? '#F4705A' : 'rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Paso {step + 1} de {STEPS.length} — {STEPS[step]}
          </p>

          {/* ── STEP 0: Cliente + Título ── */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Cliente (read-only) */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.2)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(244,112,90,0.15)', color: '#F4705A' }}
                >
                  {customer.full_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{customer.full_name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {customer.email ?? customer.phone ?? 'Sin datos de contacto'}
                  </p>
                </div>
              </div>

              {/* Plantilla opcional */}
              {activeTemplates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Plantilla (opcional)
                  </label>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setTemplateId(null)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: !templateId ? 'rgba(244,112,90,0.10)' : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${!templateId ? 'rgba(244,112,90,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <span className="text-base">📝</span>
                      <span className="text-xs font-semibold text-white">Personalizada</span>
                    </button>
                    {activeTemplates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTemplateId(t.id); if (!currency) setCurrency(t.currency) }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: templateId === t.id ? `${t.color ?? '#F4705A'}15` : 'rgba(255,255,255,0.04)',
                          border:     `1px solid ${templateId === t.id ? (t.color ?? '#F4705A') + '50' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <span className="text-base">{t.icon ?? '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white">{t.name}</p>
                          {t.description && (
                            <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{t.description}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Título <span style={{ color: '#F4705A' }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={selectedTpl ? selectedTpl.name : 'Ej: Propuesta Plan Premium — Junio 2026'}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Descripción interna (opcional)
                </label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Contexto de esta propuesta..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 1: Ítems ── */}
          {step === 1 && (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.key}
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Ítem {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={() => setItems(prev => prev.filter(it => it.key !== item.key))}
                        className="ml-auto p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        style={{ color: 'rgba(239,68,68,0.5)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Nombre */}
                  <input
                    value={item.name}
                    onChange={e => updateItem(item.key, { name: e.target.value })}
                    placeholder="Nombre del ítem *"
                    className="w-full px-2.5 py-2 rounded-lg text-sm text-white outline-none placeholder:text-white/20"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />

                  {/* Descripción del ítem */}
                  <input
                    value={item.description}
                    onChange={e => updateItem(item.key, { description: e.target.value })}
                    placeholder="Detalle (opcional)"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/20"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />

                  {/* Qty + Price + Discount */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Cantidad</p>
                      <input
                        type="number"
                        min="0.001"
                        step="1"
                        value={item.quantity}
                        onChange={e => updateItem(item.key, { quantity: parseFloat(e.target.value) || 1 })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Precio unit.</p>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={e => updateItem(item.key, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Descuento</p>
                      <input
                        type="number"
                        min="0"
                        value={item.discount}
                        onChange={e => updateItem(item.key, { discount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </div>
                  </div>

                  {/* Subtotal ítem */}
                  <div className="flex justify-end">
                    <span className="text-xs font-bold text-white">
                      Total: {formatCurrency(computeItemTotal(item), currency)}
                    </span>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setItems(prev => [...prev, blankItem()])}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(244,112,90,0.08)', color: '#F4705A', border: '1px dashed rgba(244,112,90,0.3)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar ítem
              </button>
            </div>
          )}

          {/* ── STEP 2: Totales ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Resumen de ítems */}
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {items.filter(it => it.name.trim()).map(it => (
                  <div key={it.key} className="flex justify-between text-sm">
                    <span className="text-white">{it.name} × {it.quantity}</span>
                    <span className="font-semibold text-white">{formatCurrency(computeItemTotal(it), currency)}</span>
                  </div>
                ))}
                <div className="pt-2 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Subtotal</span>
                    <span className="text-white">{formatCurrency(subtotal, currency)}</span>
                  </div>
                  {tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>Impuestos ({taxPercent}%)</span>
                      <span className="text-white">{formatCurrency(tax_amount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-white">Total</span>
                    <span style={{ color: '#F4705A' }}>{formatCurrency(total_amount, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Moneda + Impuesto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Moneda</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c} style={{ background: '#13161C' }}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Impuesto (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={e => setTaxPercent(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {/* Vigencia */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Vigencia (días)
                  {selectedTpl?.expiration_days && !expiryDays && (
                    <span className="ml-1 font-normal" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      (plantilla: {selectedTpl.expiration_days}d)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  value={expiryDays}
                  onChange={e => setExpiryDays(e.target.value)}
                  placeholder={selectedTpl?.expiration_days ? String(selectedTpl.expiration_days) : 'Sin vencimiento'}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {expiresAt && (
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Vence: {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(expiresAt))}
                  </p>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Notas para el cliente (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Condiciones, aclaraciones, próximos pasos..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirmar y enviar ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Cliente</p>
                  <p className="text-sm font-semibold text-white">{customer.full_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Propuesta</p>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: '#F4705A' }}>{formatCurrency(total_amount, currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Ítems</p>
                    <p className="text-sm font-semibold text-white">{items.filter(it => it.name.trim()).length}</p>
                  </div>
                </div>
                {expiresAt && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Vigencia hasta: {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(expiresAt))}
                  </p>
                )}
              </div>

              <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
                La cotización se guardará como <strong className="text-white">borrador</strong>.
                Podés enviarla al cliente desde el perfil.
              </p>

              <button
                onClick={handleSend}
                disabled={saving}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                {saving ? 'Creando...' : 'Crear cotización'}
              </button>
            </div>
          )}

          {/* Navigation */}
          {step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="w-full flex items-center justify-center gap-2 mt-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: canNext() ? '#F4705A' : 'rgba(255,255,255,0.08)', color: '#fff' }}
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
