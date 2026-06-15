import { useState, useEffect } from 'react'
import { Plus, BadgeCheck } from 'lucide-react'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useMembershipPlans } from '../hooks/useMembershipPlans'
import { MembershipPlanCard } from '../components/memberships/MembershipPlanCard'
import { CreatePlanDrawer } from '../components/memberships/CreatePlanDrawer'
import type { MembershipPlan } from '../membership/membershipTypes'

export function ServicesMembresiasPage() {
  const { restaurant } = useRestaurant()
  const plansHook      = useMembershipPlans(restaurant?.id)

  const [showCreate, setShowCreate] = useState(false)
  const [editPlan,   setEditPlan]   = useState<MembershipPlan | null>(null)

  useEffect(() => {
    plansHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const handleSave = async (input: Omit<MembershipPlan, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>) => {
    if (editPlan) {
      await plansHook.update(editPlan.id, input)
    } else {
      await plansHook.create(input)
    }
    setEditPlan(null)
    setShowCreate(false)
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white">Planes de Membresía</h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Definí los planes que podés ofrecer a tus clientes
          </p>
        </div>
        <button
          onClick={() => { setEditPlan(null); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo plan</span>
        </button>
      </div>

      {/* Future metrics row — dashboard ready */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Activas',      value: '—' },
          { label: 'MRR',          value: '—' },
          { label: 'Renovaciones', value: '—' },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-2xl p-4"
            style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-lg font-bold text-white mb-0.5">{m.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Plans list */}
      {plansHook.loading ? (
        <div className="flex justify-center py-20">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
          />
        </div>
      ) : plansHook.plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
          >
            <BadgeCheck className="w-7 h-7" style={{ color: 'rgba(244,112,90,0.5)' }} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">Sin planes creados</p>
          <p className="text-xs mb-5 max-w-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Creá tu primer plan de membresía y empezá a construir ingresos recurrentes.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            Crear primer plan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plansHook.plans.map(plan => (
            <MembershipPlanCard
              key={plan.id}
              plan={plan}
              onEdit={p => { setEditPlan(p); setShowCreate(true) }}
              onArchive={id => plansHook.archive(id)}
            />
          ))}
        </div>
      )}

      <CreatePlanDrawer
        open={showCreate}
        plan={editPlan}
        onClose={() => { setShowCreate(false); setEditPlan(null) }}
        defaultCurrency={restaurant?.default_currency ?? 'ARS'}
        onSave={handleSave}
      />
    </div>
  )
}
