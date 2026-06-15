import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Users, UserCheck, UserX, TrendingUp, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/modules/menu/hooks/useRestaurant'
import { useTerminology } from '../hooks/useTerminology'
import { useServiceCustomers } from '../hooks/useServiceCustomers'
import { CustomerCard } from '../components/customers/CustomerCard'
import { CreateCustomerDrawer } from '../components/customers/CreateCustomerDrawer'
import { TIER_FILTERS } from '../score/scoreConfig'
import type { CustomerScore } from '../score/scoreConfig'
import { useMemberships } from '../hooks/useMemberships'
import type { MembershipSummary } from '../hooks/useMemberships'
import { isDueSoon } from '../membership/allowanceUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type TierFilterId = (typeof TIER_FILTERS)[number]['id']

type MembershipFilterId = 'all' | 'with' | 'without' | 'due_soon' | 'expired'

const MEMBERSHIP_FILTERS: Array<{ id: MembershipFilterId; label: string }> = [
  { id: 'all',      label: 'Todos'              },
  { id: 'with',     label: '✅ Con membresía'   },
  { id: 'without',  label: '○ Sin membresía'    },
  { id: 'due_soon', label: '⏰ Por vencer'       },
  { id: 'expired',  label: '❌ Vencidas'         },
]

export function ServicesClientesPage() {
  const { restaurant }  = useRestaurant()
  const { term }        = useTerminology()
  const navigate        = useNavigate()
  const customersHook   = useServiceCustomers(restaurant?.id)

  const membershipsHook  = useMemberships(restaurant?.id)

  const [search,            setSearch]            = useState('')
  const [tierFilter,        setTierFilter]        = useState<TierFilterId>('all')
  const [membershipFilter,  setMembershipFilter]  = useState<MembershipFilterId>('all')
  const [showCreate,        setShowCreate]        = useState(false)
  const [scoresMap,         setScoresMap]         = useState<Map<string, CustomerScore>>(new Map())
  const [membershipsMap,    setMembershipsMap]    = useState<Map<string, MembershipSummary>>(new Map())

  useEffect(() => {
    customersHook.fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  useEffect(() => {
    if (!restaurant?.id) return
    db
      .from('service_customer_scores')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .limit(1000)
      .then(({ data }: { data: CustomerScore[] | null }) => {
        const map = new Map<string, CustomerScore>()
        for (const s of data ?? []) map.set(s.customer_id, s)
        setScoresMap(map)
      })
    membershipsHook.fetchSummaryMap().then(setMembershipsMap)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id])

  const filtered = useMemo(() => {
    let list = customersHook.customers

    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(s) ||
        (c.phone  ?? '').includes(s) ||
        (c.email  ?? '').toLowerCase().includes(s)
      )
    }

    if (tierFilter !== 'all') {
      list = list.filter(c => {
        const score = scoresMap.get(c.id)
        if (!score) return false
        if (tierFilter === 'inactive_all') return score.tier === 'inactive' || score.tier === 'lost'
        return score.tier === tierFilter
      })
    }

    if (membershipFilter !== 'all') {
      list = list.filter(c => {
        const m = membershipsMap.get(c.id)
        switch (membershipFilter) {
          case 'with':     return !!m && m.status === 'active'
          case 'without':  return !m || m.status === 'cancelled'
          case 'due_soon': return !!m && m.status === 'active' && isDueSoon(m.renewal_date)
          case 'expired':  return !!m && m.status === 'expired'
          default:         return true
        }
      })
    }

    return list
  }, [customersHook.customers, search, tierFilter, membershipFilter, scoresMap, membershipsMap])

  const { stats } = customersHook
  const termPlural   = term('customers')
  const termSingular = term('customers', 'singular')

  return (
    <div
      className="flex flex-col h-[calc(100vh-theme(spacing.16))] lg:h-[calc(100vh-theme(spacing.4))] -mx-4 -mt-2 lg:-mx-8 lg:-mt-8"
      style={{ background: '#0F1115' }}
    >

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <div
        className="px-4 lg:px-6 pt-4 pb-3 flex-shrink-0"
        style={{ background: '#13161C', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Título + botón */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white capitalize">{termPlural}</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: '#F4705A', color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total',     value: stats.total,        icon: <Users      className="w-3.5 h-3.5" />, color: 'rgba(255,255,255,0.3)' },
            { label: 'Activos',   value: stats.active,       icon: <UserCheck  className="w-3.5 h-3.5" />, color: '#22C55E' },
            { label: 'Inactivos', value: stats.inactive,     icon: <UserX      className="w-3.5 h-3.5" />, color: '#6B7280' },
            { label: 'Este mes',  value: stats.newThisMonth, icon: <TrendingUp className="w-3.5 h-3.5" />, color: '#F4705A' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-2.5 flex flex-col gap-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-1" style={{ color: s.color }}>
                {s.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:block">{s.label}</span>
              </div>
              <span className="text-lg font-bold text-white leading-none">{s.value}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider sm:hidden" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o email..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white outline-none placeholder:text-white/25"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros de tier */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TIER_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setTierFilter(f.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tierFilter === f.id ? '#F4705A' : 'rgba(255,255,255,0.06)',
                color:      tierFilter === f.id ? '#fff'    : 'rgba(255,255,255,0.5)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtros de membresía */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {MEMBERSHIP_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setMembershipFilter(f.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: membershipFilter === f.id ? '#8B5CF6' : 'rgba(255,255,255,0.04)',
                color:      membershipFilter === f.id ? '#fff'    : 'rgba(255,255,255,0.4)',
                border:     `1px solid ${membershipFilter === f.id ? 'transparent' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTA ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {customersHook.loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: '#F4705A' }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(244,112,90,0.08)', border: '1px solid rgba(244,112,90,0.15)' }}
            >
              <Users className="w-6 h-6" style={{ color: 'rgba(244,112,90,0.5)' }} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {search || tierFilter !== 'all' ? 'Sin resultados' : `Sin ${termPlural.toLowerCase()} aún`}
            </p>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {search || tierFilter !== 'all' || membershipFilter !== 'all'
                ? 'Probá con otro filtro o búsqueda'
                : `Creá el primer ${termSingular.toLowerCase()} o generá una reserva con teléfono`}
            </p>
            {!search && tierFilter === 'all' && membershipFilter === 'all' && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#F4705A', color: '#fff' }}
              >
                Crear {termSingular.toLowerCase()}
              </button>
            )}
          </div>
        ) : (
          <div>
            <p
              className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              {filtered.length} {filtered.length === 1 ? termSingular : termPlural}
              {(search || tierFilter !== 'all' || membershipFilter !== 'all') ? ' · filtrados' : ''}
            </p>
            {filtered.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                score={scoresMap.get(customer.id) ?? null}
                onClick={c => navigate(`/dashboard/services/clientes/${c.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCustomerDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={customer => navigate(`/dashboard/services/clientes/${customer.id}`)}
        onCheckDuplicates={customersHook.checkDuplicates}
        onCreate={customersHook.create}
      />
    </div>
  )
}
