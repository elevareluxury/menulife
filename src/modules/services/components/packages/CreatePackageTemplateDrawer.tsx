import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { PackageTemplate, PackageItem, ConsumptionStrategy } from '../../packages/packageTypes'
import { CONSUMPTION_STRATEGY_CONFIG, PACKAGE_COLORS, PACKAGE_ICONS } from '../../packages/packageTypes'
import type { AllowanceType } from '../../membership/membershipTypes'
import { ALLOWANCE_TYPE_CONFIG } from '../../membership/membershipTypes'

interface CreatePackageTemplateDrawerProps {
  open:             boolean
  onClose:          () => void
  onSave:           (input: Omit<PackageTemplate, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => Promise<unknown>
  template?:        PackageTemplate | null
  defaultCurrency?: string
}

function blankItem(): PackageItem {
  return {
    key:            crypto.randomUUID(),
    name:           '',
    catalog_id:     null,
    quantity:       4,
    unit:           'sesión',
    allowance_type: 'sessions',
  }
}

export function CreatePackageTemplateDrawer({ open, onClose, onSave, template, defaultCurrency }: CreatePackageTemplateDrawerProps) {
  const [name,       setName]       = useState('')
  const [description,setDescription]= useState('')
  const [price,      setPrice]      = useState('0')
  const [currency,   setCurrency]   = useState(defaultCurrency ?? 'ARS')
  const [validityDays,setValidityDays]= useState('')
  const [strategy,   setStrategy]   = useState<ConsumptionStrategy>('manual')
  const [color,      setColor]      = useState(PACKAGE_COLORS[0])
  const [icon,       setIcon]       = useState(PACKAGE_ICONS[0])
  const [items,      setItems]      = useState<PackageItem[]>([blankItem()])
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!open) return
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setPrice(String(template.price))
      setCurrency(template.currency)
      setValidityDays(template.validity_days ? String(template.validity_days) : '')
      setStrategy(template.consumption_strategy)
      setColor(template.color ?? PACKAGE_COLORS[0])
      setIcon(template.icon ?? PACKAGE_ICONS[0])
      setItems(template.items.length > 0 ? template.items : [blankItem()])
    } else {
      setName(''); setDescription(''); setPrice('0'); setCurrency(defaultCurrency ?? 'ARS')
      setValidityDays(''); setStrategy('manual')
      setColor(PACKAGE_COLORS[0]); setIcon(PACKAGE_ICONS[0])
      setItems([blankItem()])
    }
  }, [open, template])

  if (!open) return null

  const updateItem = (key: string, patch: Partial<PackageItem>) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  const onTypeChange = (key: string, type: AllowanceType) => {
    updateItem(key, {
      allowance_type: type,
      quantity:       type === 'unlimited' ? 0 : 4,
      unit:           ALLOWANCE_TYPE_CONFIG[type].defaultUnit,
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name:                name.trim(),
      description:         description.trim() || null,
      price:               parseFloat(price) || 0,
      currency,
      items:               items.filter(it => it.name.trim() || it.allowance_type === 'unlimited'),
      validity_days:       validityDays ? parseInt(validityDays) : null,
      consumption_strategy: strategy,
      status:              'active',
      color,
      icon,
      sort_order:          0,
      metadata:            {},
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[480px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">
              {template ? 'Editar plantilla' : 'Nueva plantilla de paquete'}
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
                  {PACKAGE_ICONS.map(ic => (
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
                  {PACKAGE_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{
                        background: c,
                        outline:    color === c ? `2px solid ${c}` : 'none',
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
                placeholder="Ej: Pack Iniciación 10 sesiones"
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
                placeholder="Breve descripción del paquete..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Price + Currency + Validity */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Moneda</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {['ARS','USD','EUR','BRL','CLP','COP','MXN'].map(c => (
                    <option key={c} value={c} style={{ background: '#13161C' }}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Vigencia (días)</label>
                <input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={e => setValidityDays(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Ítems del paquete</label>
                <button
                  onClick={() => setItems(prev => [...prev, blankItem()])}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(244,112,90,0.12)', color: '#F4705A' }}
                >
                  <Plus className="w-3 h-3" />
                  Agregar
                </button>
              </div>

              <div className="space-y-3">
                {items.map(item => (
                  <div
                    key={item.key}
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Type selector */}
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(ALLOWANCE_TYPE_CONFIG) as AllowanceType[]).map(type => {
                        const cfg = ALLOWANCE_TYPE_CONFIG[type]
                        return (
                          <button
                            key={type}
                            onClick={() => onTypeChange(item.key, type)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: item.allowance_type === type ? 'rgba(244,112,90,0.15)' : 'rgba(255,255,255,0.05)',
                              color:      item.allowance_type === type ? '#F4705A'                 : 'rgba(255,255,255,0.4)',
                              border:     `1px solid ${item.allowance_type === type ? 'rgba(244,112,90,0.3)' : 'transparent'}`,
                            }}
                          >
                            {cfg.emoji} {cfg.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Name + quantity + unit + delete */}
                    <div className="flex gap-2">
                      <input
                        value={item.name}
                        onChange={e => updateItem(item.key, { name: e.target.value })}
                        placeholder="Nombre del ítem"
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/20"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      {item.allowance_type !== 'unlimited' && (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItem(item.key, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-14 px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          />
                          <input
                            value={item.unit}
                            onChange={e => updateItem(item.key, { unit: e.target.value })}
                            placeholder="unidad"
                            className="w-20 px-2 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/20"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                          />
                        </>
                      )}
                      {items.length > 1 && (
                        <button
                          onClick={() => setItems(prev => prev.filter(it => it.key !== item.key))}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
                          style={{ color: 'rgba(239,68,68,0.6)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consumption strategy */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Estrategia de consumo
              </label>
              <div className="space-y-1.5">
                {(Object.keys(CONSUMPTION_STRATEGY_CONFIG) as ConsumptionStrategy[]).map(s => {
                  const cfg = CONSUMPTION_STRATEGY_CONFIG[s]
                  return (
                    <button
                      key={s}
                      onClick={() => setStrategy(s)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        background: strategy === s ? 'rgba(244,112,90,0.10)' : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${strategy === s ? 'rgba(244,112,90,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div>
                        <p className="text-xs font-semibold text-white">{cfg.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.description}</p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                        style={{
                          borderColor: strategy === s ? '#F4705A' : 'rgba(255,255,255,0.2)',
                          background:  strategy === s ? '#F4705A' : 'transparent',
                        }}
                      />
                    </button>
                  )
                })}
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
