// NOTE: Requires these additional RLS policies in Supabase:
//   CREATE POLICY "Superadmins view menu items" ON menu_items FOR SELECT
//     USING (restaurant_id IN (SELECT id FROM restaurants WHERE TRUE));
//   CREATE POLICY "Superadmins view menu sections" ON menu_sections FOR SELECT
//     USING (restaurant_id IN (SELECT id FROM restaurants WHERE TRUE));
//   CREATE POLICY "Superadmins view waiters" ON waiters FOR SELECT
//     USING (restaurant_id IN (SELECT id FROM restaurants WHERE TRUE));
//   CREATE POLICY "Superadmins view tables" ON tables FOR SELECT
//     USING (restaurant_id IN (SELECT id FROM restaurants WHERE TRUE));

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ExternalLink, ToggleLeft, ToggleRight, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const MODAL_BG  = '#171A21'
const BORDER    = 'rgba(255,255,255,0.06)'
const TEXT      = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT    = '#FF6B7A'

const PLAN_OPTIONS  = ['menu', 'pro', 'total'] as const
const STATUS_OPTIONS = ['trial', 'active', 'past_due', 'cancelled'] as const

const PLAN_LABELS: Record<string, string>   = { menu: 'Menu', pro: 'Pro', total: 'Total' }
const STATUS_LABELS: Record<string, string> = {
  trial: 'Trial', active: 'Activo', past_due: 'Vencido', cancelled: 'Cancelado',
}

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

interface Metrics {
  menuItems: number
  menuSections: number
  waiters: number
  tables: number
  totalOrders: number
  totalRevenue: number
  lastOrderAt: string | null
}

type DetailTab = 'info' | 'metricas' | 'acciones'

interface Props {
  restaurant: RestaurantRow | null
  onClose: () => void
  onUpdate: (r: RestaurantRow) => void
}

export function RestaurantDetailModal({ restaurant, onClose, onUpdate }: Props) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<DetailTab>('info')
  const [plan, setPlan] = useState<'menu' | 'pro' | 'total'>('menu')
  const [status, setStatus] = useState<'trial' | 'active' | 'past_due' | 'cancelled'>('trial')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  useEffect(() => {
    if (restaurant) {
      setPlan(restaurant.plan)
      setStatus(restaurant.subscription_status)
      setIsActive(restaurant.is_active)
      setTab('info')
    }
  }, [restaurant?.id])

  const loadMetrics = useCallback(async () => {
    if (!restaurant) return
    setMetricsLoading(true)
    try {
      const [
        { count: menuItems },
        { count: menuSections },
        { count: waiters },
        { count: tables },
        { data: orders },
      ] = await Promise.all([
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
        supabase.from('menu_sections').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
        supabase.from('waiters').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
        supabase.from('orders').select('total, created_at').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }),
      ])

      const totalRevenue = (orders ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0)

      setMetrics({
        menuItems: menuItems ?? 0,
        menuSections: menuSections ?? 0,
        waiters: waiters ?? 0,
        tables: tables ?? 0,
        totalOrders: orders?.length ?? 0,
        totalRevenue,
        lastOrderAt: (orders ?? [])[0]?.created_at ?? null,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setMetricsLoading(false)
    }
  }, [restaurant?.id])

  useEffect(() => {
    if (tab === 'metricas') loadMetrics()
  }, [tab, loadMetrics])

  const handleSave = async () => {
    if (!restaurant) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ plan, subscription_status: status, is_active: isActive })
        .eq('id', restaurant.id)
      if (error) throw error
      onUpdate({ ...restaurant, plan, subscription_status: status, is_active: isActive })
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleImpersonate = () => {
    if (!restaurant) return
    sessionStorage.setItem('impersonating', JSON.stringify({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
    }))
    navigate('/dashboard')
  }

  if (!restaurant) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: MODAL_BG, border: `1px solid ${BORDER}`, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>🏪 {restaurant.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              /{restaurant.slug}{restaurant.city ? ` · ${restaurant.city}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: TEXT_MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {(['info', 'metricas', 'acciones'] as DetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                backgroundColor: tab === t ? `${ACCENT}18` : 'transparent',
                color: tab === t ? ACCENT : TEXT_MUTED,
              }}
            >
              {t === 'metricas' ? 'Métricas' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Info tab ─────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: TEXT_MUTED }}>Registrado</p>
                  <p style={{ color: TEXT }}>{new Date(restaurant.created_at).toLocaleDateString('es-AR')}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: TEXT_MUTED }}>Onboarding</p>
                  <p style={{ color: restaurant.onboarding_completed ? '#10B981' : '#F59E0B' }}>
                    {restaurant.onboarding_completed ? '✅ Completado' : '⏳ Pendiente'}
                  </p>
                </div>
                {restaurant.phone && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: TEXT_MUTED }}>Teléfono</p>
                    <p style={{ color: TEXT }}>{restaurant.phone}</p>
                  </div>
                )}
                {restaurant.trial_ends_at && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: TEXT_MUTED }}>Trial vence</p>
                    <p style={{ color: TEXT }}>{new Date(restaurant.trial_ends_at).toLocaleDateString('es-AR')}</p>
                  </div>
                )}
              </div>

              {/* Editable fields */}
              <div className="space-y-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>Plan</label>
                  <div className="flex gap-2">
                    {PLAN_OPTIONS.map(p => (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          backgroundColor: plan === p ? `${ACCENT}22` : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${plan === p ? ACCENT : BORDER}`,
                          color: plan === p ? ACCENT : TEXT_MUTED,
                        }}
                      >
                        {PLAN_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-1.5" style={{ color: TEXT_MUTED }}>Estado de suscripción</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          backgroundColor: status === s ? '#3B82F618' : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${status === s ? '#3B82F6' : BORDER}`,
                          color: status === s ? '#3B82F6' : TEXT_MUTED,
                        }}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>Acceso activo</span>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: isActive ? '#10B981' : TEXT_MUTED }}
                  >
                    {isActive
                      ? <><ToggleRight className="w-5 h-5" /> Activo</>
                      : <><ToggleLeft className="w-5 h-5" /> Inactivo</>
                    }
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── Métricas tab ──────────────────────────────────────── */}
          {tab === 'metricas' && (
            metricsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Productos',     value: metrics.menuItems },
                    { label: 'Secciones',     value: metrics.menuSections },
                    { label: 'Mozos',         value: metrics.waiters },
                    { label: 'Mesas',         value: metrics.tables },
                    { label: 'Pedidos',       value: metrics.totalOrders },
                    { label: 'Revenue total', value: `$${metrics.totalRevenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                      <p className="text-lg font-bold" style={{ color: TEXT }}>{stat.value}</p>
                      <p className="text-xs" style={{ color: TEXT_MUTED }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
                {metrics.lastOrderAt && (
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>
                    Último pedido: {new Date(metrics.lastOrderAt).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: TEXT_MUTED }}>No se pudieron cargar las métricas</p>
            )
          )}

          {/* ── Acciones tab ──────────────────────────────────────── */}
          {tab === 'acciones' && (
            <div className="space-y-3">
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-4 rounded-xl transition-all text-sm font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_MUTED }} />
                Ver menú público
              </a>

              <button
                onClick={handleImpersonate}
                className="flex items-center gap-3 w-full p-4 rounded-xl transition-all text-sm font-medium"
                style={{ backgroundColor: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, color: ACCENT }}
              >
                <Eye className="w-4 h-4 flex-shrink-0" />
                Ver su dashboard
                <span className="ml-auto text-xs opacity-60">Impersonar →</span>
              </button>

              <button
                onClick={async () => {
                  const { error } = await supabase
                    .from('restaurants')
                    .update({ is_active: !restaurant.is_active })
                    .eq('id', restaurant.id)
                  if (!error) {
                    onUpdate({ ...restaurant, is_active: !restaurant.is_active })
                    setIsActive(!restaurant.is_active)
                    toast.success(restaurant.is_active ? 'Cuenta desactivada' : 'Cuenta activada')
                  }
                }}
                className="flex items-center gap-3 w-full p-4 rounded-xl transition-all text-sm font-medium"
                style={{
                  backgroundColor: '#EF444412',
                  border: '1px solid #EF444433',
                  color: '#EF4444',
                }}
              >
                <ToggleLeft className="w-4 h-4 flex-shrink-0" />
                {restaurant.is_active ? 'Desactivar cuenta' : 'Activar cuenta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
