// NOTE: Requires these RLS policies in Supabase SQL Editor:
//   CREATE POLICY "Superadmins view all restaurants" ON restaurants FOR SELECT
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));
//   CREATE POLICY "Superadmins update restaurants" ON restaurants FOR UPDATE
//     USING (auth.uid() IN (SELECT user_id FROM super_admins));

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, RefreshCw, Search, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RestaurantDetailModal } from '../components/RestaurantDetailModal'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

interface RestaurantRow {
  id: string
  name: string
  slug: string
  city: string | null
  phone: string | null
  plan: 'menu' | 'pro' | 'total'
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
  is_active: boolean
  trial_ends_at: string | null
  created_at: string
  onboarding_completed: boolean
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
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

export function RestaurantsTab() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCity, setFilterCity] = useState('all')
  const [detailRestaurant, setDetailRestaurant] = useState<RestaurantRow | null>(null)

  const fetchRestaurants = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, city, phone, plan, subscription_status, is_active, trial_ends_at, created_at, onboarding_completed')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRestaurants((data ?? []) as RestaurantRow[])
    } catch (err) {
      toast.error('Error cargando negocios. Verificá los permisos RLS.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRestaurants() }, [fetchRestaurants])

  const cities = ['all', ...Array.from(new Set(restaurants.map(r => r.city).filter(Boolean)))] as string[]
  const plans   = ['all', 'menu', 'pro', 'total']
  const statuses = ['all', 'trial', 'active', 'past_due', 'cancelled']

  const filtered = restaurants.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || r.name.toLowerCase().includes(q)
      || r.slug.includes(q)
      || (r.city?.toLowerCase().includes(q) ?? false)
    const matchPlan   = filterPlan   === 'all' || r.plan === filterPlan
    const matchStatus = filterStatus === 'all' || r.subscription_status === filterStatus
    const matchCity   = filterCity   === 'all' || r.city === filterCity
    return matchSearch && matchPlan && matchStatus && matchCity
  })

  const stats = {
    total:  restaurants.length,
    active: restaurants.filter(r => r.is_active).length,
    trial:  restaurants.filter(r => r.subscription_status === 'trial').length,
  }

  const selectClass = "px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
  const selectStyle = { backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }

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
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className={selectClass} style={selectStyle}>
          {plans.map(p => <option key={p} value={p}>{p === 'all' ? 'Todos los planes' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass} style={selectStyle}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'Todos los estados' : STATUS_BADGE[s]?.label ?? s}</option>)}
        </select>
        {cities.length > 2 && (
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectClass} style={selectStyle}>
            {cities.map(c => <option key={c} value={c}>{c === 'all' ? 'Todas las ciudades' : c}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl h-20 animate-pulse"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }} />
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
        <div className="space-y-2">
          {filtered.map(restaurant => (
            <div
              key={restaurant.id}
              className="rounded-2xl p-4 cursor-pointer transition-all"
              style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}
              onClick={() => setDetailRestaurant(restaurant)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    backgroundColor: `${PLAN_BADGE[restaurant.plan]?.color ?? '#888'}20`,
                    color: PLAN_BADGE[restaurant.plan]?.color ?? '#888',
                  }}
                >
                  {restaurant.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold" style={{ color: TEXT }}>{restaurant.name}</span>
                    <Badge value={restaurant.plan} map={PLAN_BADGE} />
                    <Badge value={restaurant.subscription_status} map={STATUS_BADGE} />
                    {!restaurant.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: '#88888820', color: TEXT_MUTED }}>
                        Inactivo
                      </span>
                    )}
                    {!restaurant.onboarding_completed && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                        Onboarding pendiente
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: TEXT_MUTED }}>
                    <span>/{restaurant.slug}</span>
                    {restaurant.city && <span>📍 {restaurant.city}</span>}
                    <span>Desde {new Date(restaurant.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <a
                    href={`/r/${restaurant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    title="Ver menú público"
                    style={{ color: TEXT_MUTED }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setDetailRestaurant(restaurant)}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    style={{ color: TEXT_MUTED }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <RestaurantDetailModal
        restaurant={detailRestaurant}
        onClose={() => setDetailRestaurant(null)}
        onUpdate={updated => {
          setRestaurants(prev => prev.map(r => r.id === updated.id ? updated : r))
          setDetailRestaurant(updated)
        }}
      />
    </div>
  )
}
