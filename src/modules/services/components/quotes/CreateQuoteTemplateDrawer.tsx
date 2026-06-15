import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { QuoteTemplate } from '../../quotes/quoteTypes'
import { QUOTE_COLORS, QUOTE_ICONS, CURRENCIES } from '../../quotes/quoteTypes'

interface CreateQuoteTemplateDrawerProps {
  open:             boolean
  onClose:          () => void
  onSave:           (input: Omit<QuoteTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => Promise<unknown>
  template?:        QuoteTemplate | null
  defaultCurrency?: string
}

export function CreateQuoteTemplateDrawer({ open, onClose, onSave, template, defaultCurrency }: CreateQuoteTemplateDrawerProps) {
  const [name,           setName]           = useState('')
  const [description,    setDescription]    = useState('')
  const [currency,       setCurrency]       = useState(defaultCurrency ?? 'ARS')
  const [expirationDays, setExpirationDays] = useState('')
  const [color,          setColor]          = useState(QUOTE_COLORS[0])
  const [icon,           setIcon]           = useState(QUOTE_ICONS[0])
  const [saving,         setSaving]         = useState(false)

  useEffect(() => {
    if (!open) return
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setCurrency(template.currency)
      setExpirationDays(template.expiration_days ? String(template.expiration_days) : '')
      setColor(template.color ?? QUOTE_COLORS[0])
      setIcon(template.icon ?? QUOTE_ICONS[0])
    } else {
      setName(''); setDescription(''); setCurrency(defaultCurrency ?? 'ARS')
      setExpirationDays(''); setColor(QUOTE_COLORS[0]); setIcon(QUOTE_ICONS[0])
    }
  }, [open, template])

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name:            name.trim(),
      description:     description.trim() || null,
      status:          'active',
      currency,
      expiration_days: expirationDays ? parseInt(expirationDays) : null,
      color,
      icon,
      sort_order:      0,
      metadata:        {},
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">
              {template ? 'Editar plantilla' : 'Nueva plantilla'}
            </h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Icon + Color */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Ícono</label>
                <div className="flex flex-wrap gap-1.5">
                  {QUOTE_ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
                      style={{
                        background: icon === ic ? `${color}25` : 'rgba(255,255,255,0.05)',
                        border:     `1px solid ${icon === ic ? color + '60' : 'transparent'}`,
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Color</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {QUOTE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        background:    c,
                        outline:       color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Nombre <span style={{ color: '#F4705A' }}>*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Consulta Inicial, Plan Premium..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Descripción (opcional)
              </label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Breve descripción..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Currency + Expiration */}
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
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Vigencia (días)
                </label>
                <input
                  type="number"
                  min="1"
                  value={expirationDays}
                  onChange={e => setExpirationDays(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#F4705A', color: '#fff' }}
            >
              {saving ? 'Guardando...' : template ? 'Guardar cambios' : 'Crear plantilla'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
