import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, RefreshCw, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RestaurantDetailModal, type RestaurantRow } from '../components/RestaurantDetailModal'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

interface RestaurantViewRow extends RestaurantRow {
  total_orders:   number
  total_revenue:  number
  total_products: number
  total_tables:   number
  total_waiters:  number
  onboarding_steps: Record<string, boolean> | null
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  menu:  { label: 'Menu',  color: '#F59E0B' },
  pro:   { label: 'Pro',   color: '#3B82F6' },
  total: { label: 'Total', color: '#10B981' },
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  trial:     { label: 'Trial',     color: '#F59E0B' },
  active:    { label: 'Activo',    color: '#10B981' },
  past_due:  { label: 'Vencido',   color: ACCENT },
  cancelled: { label: 'Cancelado', color: '#EF4444' },
}

function Badge({ value, map }: { value: string; map: typeof PLAN_BADGE }) {
  const cfg = map[value] ?? { label: value, color: TEXT_MUTED }
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function OnboardingBadge({ steps, completed }: { steps: Record<string, boolean> | null; completed: boolean }) {
  if (completed) {
    return <span className="text-xs" style={{ color: '#10B981' }}>✅ 6/6</span>
  }
  if (!steps) {
    return <span className="text-xs" style={{ color: TEXT_MUTED }}>—</span>
  }
  const vals  = Object.values(steps)
  const done  = vals.filter(Boolean).length
  const total = vals.length || 6
  const pct   = (done / total) * 100
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10B981' : '#F59E0B' }} />
      </div>
      <span className="text-xs" style={{ color: pct === 100 ? '#10B981' : TEXT_MUTED }}>{done}/{total}</span>
    </div>
  )
}

export function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState<RestaurantViewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [detailRestaurant, setDetailRestaurant] = useState<RestaurantRow | null>(null)

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    try {
      // Try the enriched view first, fall back to base table
      let data: RestaurantViewRow[] | null = null

      const viewResult = await supabase
        .from('view_superadmin_restaurants')
        .select('id, name, slug, city, phone, plan, subscription_status, is_active, trial_ends_at, created_at, onboarding_completed, onboarding_steps, total_orders, total_revenue, total_products, total_tables, total_waiters')
        .order('created_at', { ascending: false })

      if (!viewResult.error && viewResult.data) {
        data = viewResult.data as RestaurantViewRow[]
      } else {
        // Fall back to base restaurants table
        const baseResult = await supabase
          .from('restaurants')
          .select('id, name, slug, city, phone, plan, subscription_status, is_active, trial_ends_at, created_at, onboarding_completed')
          .order('created_at', { ascending: false })

        if (baseResult.error) throw baseResult.error
        data = (baseResult.data ?? []).map(r => ({
          ...(r as RestaurantRow),
          total_orders:    0,
          total_revenue:   0,
          total_products:  0,
          total_tables:    0,
          total_waiters:   0,
          onboarding_steps: null,
        }))
      }

      setRestaurants(data ?? [])
    } catch (err) {
      toast.error('Error cargando negocios. Verificá los permisos RLS.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRestaurants() }, [fetchRestaurants])

  const cities   = ['all', ...Array.from(new Set(restaurants.map(r => r.city).filter(Boolean)))] as string[]
  const plans    = ['all', 'menu', 'pro', 'total']
  const statuses = ['all', 'trial', 'active', 'past_due', 'cancelled']

  const filtered = restaurants.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || r.name.toLowerCase().includes(q)
      || r.slug.includes(q)
      || (r.city?.toLowerCase().includes(q) ?? false)
    return matchSearch
      && (filterPlan   === 'all' || r.plan               === filterPlan)
      && (filterStatus === 'all' || r.subscription_status === filterStatus)
      && (filterCity   === 'all' || r.city               === filterCity)
  })

  const stats = {
    total:  restaurants.length,
    active: restaurants.filter(r => r.is_active).length,
    trial:  restaurants.filter(r => r.subscription_status === 'trial').length,
  }

  const selectCls = "px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
  const selectSty = { backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Negocios</h1>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {stats.total} registrados · {stats.active} activos · {stats.trial} en trial
          </p>
        </div>
        <button
          onClick={fetchRestaurants}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_MUTED }} />
          <input
            type="text"
            placeholder="Buscar por nombre, slug o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <select value={filterPlan}   onChange={e => setFilterPlan(e.target.value)}   className={selectCls} style={selectSty}>
          {plans.map(p => <option key={p} value={p}>{p === 'all' ? 'Todos los planes' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls} style={selectSty}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'Todos los estados' : STATUS_BADGE[s]?.label ?? s}</option>)}
        </select>
        {cities.length > 2 && (
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectCls} style={selectSty}>
            {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'Todas las ciudades' : c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 animate-pulse mx-4 my-3 rounded-xl"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="text-4xl mb-3">🏪</div>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {search || filterPlan !== 'all' || filterStatus !== 'all'
              ? 'No se encontraron negocios con esos filtros'
              : 'Sin negocios registrados'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Negocio', 'Plan', 'Estado', 'Pedidos', 'Revenue', 'Onboarding', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ color: TEXT_MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(restaurant => (
                  <tr
                    key={restaurant.id}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: `1px solid ${BORDER}` }}
                    onClick={() => setDetailRestaurant(restaurant)}
                  >
                    {/* Negocio */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: `${PLAN_BADGE[restaurant.plan]?.color ?? '#888'}20`,
                            color: PLAN_BADGE[restaurant.plan]?.color ?? '#888',
                          }}
                        >
                          {restaurant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: TEXT }}>{restaurant.name}</p>
                          <p className="text-[11px] truncate" style={{ color: TEXT_MUTED }}>
                            /{restaurant.slug}{restaurant.city ? ` · ${restaurant.city}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <Badge value={restaurant.plan} map={PLAN_BADGE} />
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Badge value={restaurant.subscription_status} map={STATUS_BADGE} />
                        {!restaurant.is_active && (
                          <span className="text-[10px]" style={{ color: TEXT_MUTED }}>Inactivo</span>
                        )}
                      </div>
                    </td>

                    {/* Pedidos */}
                    <td className="px-4 py-3">
                      <span style={{ color: TEXT }}>
                        {restaurant.total_orders > 0
                          ? restaurant.total_orders.toLocaleString('es-AR')
                          : <span style={{ color: TEXT_MUTED }}>—</span>}
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3">
                      <span style={{ color: TEXT }}>
                        {restaurant.total_revenue > 0
                          ? `$${restaurant.total_revenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                          : <span style={{ color: TEXT_MUTED }}>—</span>}
                      </span>
                    </td>

                    {/* Onboarding */}
                    <td className="px-4 py-3">
                      <OnboardingBadge
                        steps={restaurant.onboarding_steps}
                        completed={restaurant.onboarding_completed}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <a
                          href={`/r/${restaurant.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                          title="Ver menú público"
                          style={{ color: TEXT_MUTED }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setDetailRestaurant(restaurant)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                          style={{ color: TEXT_MUTED }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RestaurantDetailModal
        restaurant={detailRestaurant}
        onClose={() => setDetailRestaurant(null)}
        onUpdate={updated => {
          setRestaurants(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
          setDetailRestaurant(updated)
        }}
      />
    </div>
  )
}
