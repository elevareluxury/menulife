import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useMemberships } from '../../hooks/useMemberships'
import { useMembershipUsage } from '../../hooks/useMembershipUsage'
import { useMembershipPlans } from '../../hooks/useMembershipPlans'
import { MembershipCard } from './MembershipCard'
import { CreateMembershipDrawer } from './CreateMembershipDrawer'
import { computeAllowanceSummaries } from '../../membership/allowanceUtils'
import type { MembershipStatus, MembershipUsage } from '../../membership/membershipTypes'

interface CustomerMembershipsSectionProps {
  customerId:   string
  restaurantId: string
}

export function CustomerMembershipsSection({ customerId, restaurantId }: CustomerMembershipsSectionProps) {
  const membershipsHook = useMemberships(restaurantId)
  const usageHook       = useMembershipUsage(restaurantId)
  const plansHook       = useMembershipPlans(restaurantId)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    membershipsHook.fetchByCustomer(customerId)
    plansHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId])

  useEffect(() => {
    usageHook.fetchByCustomer(customerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, restaurantId])

  const handleStatusChange = async (id: string, status: MembershipStatus, _cid: string, planName?: string | null) => {
    await membershipsHook.updateStatus(id, status, customerId, planName)
  }

  const handleCreated = () => {
    setShowCreate(false)
    membershipsHook.fetchByCustomer(customerId)
    usageHook.fetchByCustomer(customerId)
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
          <h2 className="text-sm font-bold text-white">Membresías</h2>
          {membershipsHook.memberships.filter(m => m.status === 'active').length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
            >
              {membershipsHook.memberships.filter(m => m.status === 'active').length} activa
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: '#F4705A', color: '#fff' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Asignar
        </button>
      </div>

      <div className="p-4 space-y-3">
        {membershipsHook.loading ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : membershipsHook.memberships.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Sin membresías asignadas
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold mt-2"
              style={{ color: '#F4705A' }}
            >
              + Asignar membresía
            </button>
          </div>
        ) : (
          membershipsHook.memberships.map(m => {
            const memberUsages: MembershipUsage[] = usageHook.usagesByMembership[m.id] ?? []
            const summaries = m.plan
              ? computeAllowanceSummaries(m.plan.benefits, memberUsages, m.starts_at, m.plan.billing_cycle)
              : []
            return (
              <MembershipCard
                key={m.id}
                membership={m}
                summaries={summaries}
                onChangeStatus={handleStatusChange}
              />
            )
          })
        )}
      </div>

      <CreateMembershipDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        plans={plansHook.plans}
        customerId={customerId}
        onCreate={membershipsHook.create}
      />
    </div>
  )
}
