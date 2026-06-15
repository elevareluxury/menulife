import { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import type { MembershipPlan, RenewalStrategy } from '../../membership/membershipTypes'
import { BILLING_CYCLE_LABELS, RENEWAL_STRATEGY_CONFIG } from '../../membership/membershipTypes'
import { computeRenewalDate } from '../../membership/allowanceUtils'

interface CreateMembershipDrawerProps {
  open:       boolean
  onClose:    () => void
  onCreated:  () => void
  plans:      MembershipPlan[]
  customerId: string
  onCreate:   (input: {
    customer_id:      string
    plan_id:          string
    starts_at:        string
    ends_at?:         string | null
    renewal_date?:    string | null
    auto_renew:       boolean
    renewal_strategy: RenewalStrategy
    notes?:           string | null
  }) => Promise<unknown>
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function CreateMembershipDrawer({
  open, onClose, onCreated, plans, customerId, onCreate,
}: CreateMembershipDrawerProps) {
  const [planId,           setPlanId]           = useState(plans[0]?.id ?? '')
  const [startsAt,         setStartsAt]         = useState(todayStr())
  const [renewalStrategy,  setRenewalStrategy]  = useState<RenewalStrategy>('manual')
  const [notes,            setNotes]            = useState('')
  const [saving,           setSaving]           = useState(false)

  if (!open) return null

  const selectedPlan = plans.find(p => p.id === planId)
  const renewalDate  = selectedPlan && startsAt
    ? computeRenewalDate(new Date(startsAt), selectedPlan.billing_cycle).toISOString()
    : null

  const handleSave = async () => {
    if (!planId || !startsAt) return
    setSaving(true)
    await onCreate({
      customer_id:      customerId,
      plan_id:          planId,
      starts_at:        new Date(startsAt).toISOString(),
      ends_at:          renewalDate,
      renewal_date:     renewalDate,
      auto_renew:       renewalStrategy === 'auto',
      renewal_strategy: renewalStrategy,
      notes:            notes.trim() || null,
    })
    setSaving(false)
    onCreated()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px] lg:rounded-3xl"
        style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '92dvh', overflowY: 'auto' }}
      >
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 pt-2 pb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white">Asignar membresía</h2>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {plans.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No hay planes creados. Creá un plan primero desde la sección Membresías.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Plan selector */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Plan</label>
                <div className="space-y-2">
                  {plans.filter(p => p.status === 'active').map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: planId === p.id ? `${p.color ?? '#F4705A'}15` : 'rgba(255,255,255,0.04)',
                        border:     `1px solid ${planId === p.id ? (p.color ?? '#F4705A') + '50' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <span className="text-base">{p.icon ?? '⭐'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {p.currency} {p.price.toLocaleString('es-AR')} / {BILLING_CYCLE_LABELS[p.billing_cycle].toLowerCase()}
                        </p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: planId === p.id ? (p.color ?? '#F4705A') : 'rgba(255,255,255,0.2)' }}
                      >
                        {planId === p.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: p.color ?? '#F4705A' }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {renewalDate && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <RefreshCw className="w-3 h-3" />
                    Renueva:{' '}
                    {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                      .format(new Date(renewalDate))}
                  </p>
                )}
              </div>

              {/* Renewal strategy */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Estrategia de renovación
                </label>
                <div className="space-y-1.5">
                  {(Object.keys(RENEWAL_STRATEGY_CONFIG) as RenewalStrategy[]).map(s => {
                    const cfg = RENEWAL_STRATEGY_CONFIG[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setRenewalStrategy(s)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: renewalStrategy === s ? 'rgba(244,112,90,0.10)' : 'rgba(255,255,255,0.04)',
                          border:     `1px solid ${renewalStrategy === s ? 'rgba(244,112,90,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">{cfg.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.description}</p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                          style={{
                            borderColor: renewalStrategy === s ? '#F4705A' : 'rgba(255,255,255,0.2)',
                            background:  renewalStrategy === s ? '#F4705A' : 'transparent',
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones internas..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none placeholder:text-white/25"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!planId || saving}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                {saving ? 'Guardando...' : 'Asignar membresía'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
