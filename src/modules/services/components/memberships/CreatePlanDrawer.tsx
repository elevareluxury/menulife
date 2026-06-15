import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type {
  MembershipPlan, Allowance, AllowanceType, BillingCycle,
  AllowanceResetCycle, MembershipVisibility,
} from '../../membership/membershipTypes'
import {
  BILLING_CYCLE_LABELS, ALLOWANCE_TYPE_CONFIG, RESET_CYCLE_LABELS,
  PLAN_COLORS, PLAN_ICONS,
} from '../../membership/membershipTypes'

interface CreatePlanDrawerProps {
  open:             boolean
  plan?:            MembershipPlan | null
  onClose:          () => void
  onSave:           (input: Omit<MembershipPlan, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => Promise<unknown>
  defaultCurrency?: string
}

const genKey = () => Math.random().toString(36).slice(2, 9)

const blankAllowance = (): Allowance => ({
  key:             genKey(),
  allowance_type:  'sessions',
  allowance_limit: 4,
  label:           '',
  unit:            'sesión',
  reset_cycle:     'billing',
})

export function CreatePlanDrawer({ open, plan, onClose, onSave, defaultCurrency }: CreatePlanDrawerProps) {
  const [name,         setName]         = useState('')
  const [description,  setDescription]  = useState('')
  const [price,        setPrice]        = useState('')
  const [currency,     setCurrency]     = useState(defaultCurrency ?? 'ARS')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [visibility,   setVisibility]   = useState<MembershipVisibility>('all_locations')
  const [color,        setColor]        = useState(PLAN_COLORS[0])
  const [icon,         setIcon]         = useState(PLAN_ICONS[0])
  const [allowances,   setAllowances]   = useState<Allowance[]>([])
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    if (plan) {
      setName(plan.name)
      setDescription(plan.description ?? '')
      setPrice(String(plan.price))
      setCurrency(plan.currency)
      setBillingCycle(plan.billing_cycle)
      setVisibility(plan.visibility ?? 'all_locations')
      setColor(plan.color ?? PLAN_COLORS[0])
      setIcon(plan.icon ?? PLAN_ICONS[0])
      setAllowances(plan.benefits ?? [])
    } else {
      setName(''); setDescription(''); setPrice(''); setCurrency(defaultCurrency ?? 'ARS')
      setBillingCycle('monthly'); setVisibility('all_locations')
      setColor(PLAN_COLORS[0]); setIcon(PLAN_ICONS[0]); setAllowances([])
    }
  }, [plan, open])

  if (!open) return null

  const addAllowance = () => setAllowances(prev => [...prev, blankAllowance()])
  const removeAllowance = (key: string) => setAllowances(prev => prev.filter(a => a.key !== key))
  const updateAllowance = (key: string, patch: Partial<Allowance>) =>
    setAllowances(prev => prev.map(a => a.key === key ? { ...a, ...patch } : a))

  const onTypeChange = (key: string, type: AllowanceType) => {
    const cfg   = ALLOWANCE_TYPE_CONFIG[type]
    const limit = type === 'unlimited' ? null : 4
    updateAllowance(key, { allowance_type: type, unit: cfg.defaultUnit, allowance_limit: limit })
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name:          name.trim(),
      description:   description.trim() || null,
      price:         parseFloat(price) || 0,
      currency,
      billing_cycle: billingCycle,
      visibility,
      status:        'active',
      benefits:      allowances,
      color,
      icon,
      sort_order:    0,
    })
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[540px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '94dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">
              {plan ? 'Editar plan' : 'Nuevo plan'}
            </h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Color + Icon */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PLAN_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px', opacity: color === c ? 1 : 0.5 }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Ícono</label>
                <div className="flex gap-1.5 flex-wrap">
                  {PLAN_ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                      style={{
                        background: icon === ic ? `${color}20` : 'rgba(255,255,255,0.05)',
                        border:     `1px solid ${icon === ic ? color + '50' : 'transparent'}`,
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Nombre *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Club Premium, Plan Básico, Membresía VIP..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Descripción (opcional)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Acceso completo a todos los servicios..."
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>

            {/* Price + Currency + Cycle */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Moneda</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {['ARS','USD','EUR','CLP','MXN','BRL','COP'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Precio</label>
                <input
                  type="number" min="0"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Ciclo</label>
                <select
                  value={billingCycle}
                  onChange={e => setBillingCycle(e.target.value as BillingCycle)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map(k => (
                    <option key={k} value={k}>{BILLING_CYCLE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visibility — multi-location ready */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Visibilidad
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'all_locations',      label: 'Todas las sucursales', desc: 'Disponible en todos los locales' },
                  { id: 'specific_locations', label: 'Sucursales específicas', desc: 'Preparado para multi-local' },
                ] as const).map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVisibility(v.id)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: visibility === v.id ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                      border:     `1px solid ${visibility === v.id ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <p className="text-xs font-semibold text-white mb-0.5">{v.label}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Allowances */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Beneficios incluidos
                </label>
                <button
                  onClick={addAllowance}
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>

              {allowances.length === 0 && (
                <p
                  className="text-xs text-center py-4 rounded-xl"
                  style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                  Sin beneficios · agregá sesiones, horas, créditos, visitas o acceso ilimitado
                </p>
              )}

              {allowances.map((a, idx) => (
                <div
                  key={a.key}
                  className="rounded-xl p-3 space-y-2.5 mb-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Beneficio {idx + 1}
                    </span>
                    <button onClick={() => removeAllowance(a.key)} style={{ color: '#EF4444' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Type + Reset */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Tipo
                      </label>
                      <select
                        value={a.allowance_type}
                        onChange={e => onTypeChange(a.key, e.target.value as AllowanceType)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {(Object.keys(ALLOWANCE_TYPE_CONFIG) as AllowanceType[]).map(t => (
                          <option key={t} value={t}>
                            {ALLOWANCE_TYPE_CONFIG[t].emoji} {ALLOWANCE_TYPE_CONFIG[t].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        Reset
                      </label>
                      <select
                        value={a.reset_cycle}
                        onChange={e => updateAllowance(a.key, { reset_cycle: e.target.value as AllowanceResetCycle })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {(Object.keys(RESET_CYCLE_LABELS) as AllowanceResetCycle[]).map(r => (
                          <option key={r} value={r}>{RESET_CYCLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Nombre del beneficio
                    </label>
                    <input
                      value={a.label}
                      onChange={e => updateAllowance(a.key, { label: e.target.value })}
                      placeholder="Ej: Sesiones de pilates, Horas de sala, Créditos..."
                      className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/20"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                  </div>

                  {/* Limit + Unit — hidden when unlimited */}
                  {a.allowance_type !== 'unlimited' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Límite
                        </label>
                        <input
                          type="number" min="1"
                          value={a.allowance_limit ?? ''}
                          onChange={e => updateAllowance(a.key, { allowance_limit: parseInt(e.target.value) || 1 })}
                          placeholder="—"
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/30"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          Unidad
                        </label>
                        <input
                          value={a.unit}
                          onChange={e => updateAllowance(a.key, { unit: e.target.value })}
                          placeholder="sesión, hora, crédito..."
                          className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none placeholder:text-white/20"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#F4705A', color: '#fff' }}
            >
              {saving ? 'Guardando...' : plan ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
