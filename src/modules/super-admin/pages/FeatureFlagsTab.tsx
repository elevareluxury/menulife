import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { FEATURE_LABELS, ALL_FEATURES, PLAN_FEATURES, PLAN_LABELS, PLAN_COLORS, logAdminAction } from '../lib/adminActions'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const CARD_BG    = '#171A21'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'

interface RestFeatures {
  id: string
  name: string
  plan: string
  features: Record<string, boolean>
}

export function FeatureFlagsTab() {
  const [restaurants, setRestaurants] = useState<RestFeatures[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, plan, features')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setRestaurants(
        (data ?? []).map(r => ({
          id:       r.id,
          name:     r.name,
          plan:     r.plan,
          features: ((r as { features?: Record<string, boolean> }).features ?? {}) as Record<string, boolean>,
        }))
      )
    } catch (e) {
      console.error(e)
      toast.error('Error cargando features')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleFeature(restaurantId: string, feature: string, currentVal: boolean) {
    setSaving(`${restaurantId}-${feature}`)
    try {
      const rest = restaurants.find(r => r.id === restaurantId)
      if (!rest) return

      const newFeatures = { ...rest.features, [feature]: !currentVal }

      const { error } = await supabase
        .from('restaurants')
        .update({ features: newFeatures })
        .eq('id', restaurantId)

      if (error) throw error

      await logAdminAction('update_features', 'restaurant', restaurantId, {
        feature,
        old: currentVal,
        new: !currentVal,
      })

      setRestaurants(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, features: newFeatures } : r)
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar feature')
    } finally {
      setSaving(null)
    }
  }

  async function applyTemplate(restaurantId: string, plan: string) {
    setSaving(`${restaurantId}-template`)
    try {
      const template = PLAN_FEATURES[plan] ?? PLAN_FEATURES['hub_free']

      const { error } = await supabase
        .from('restaurants')
        .update({ features: template })
        .eq('id', restaurantId)

      if (error) throw error

      await logAdminAction('update_features', 'restaurant', restaurantId, {
        template: plan,
        features: template,
      })

      setRestaurants(prev =>
        prev.map(r => r.id === restaurantId ? { ...r, features: template } : r)
      )
      toast.success(`✅ Template ${PLAN_LABELS[plan] ?? plan} aplicado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar template')
    } finally {
      setSaving(null)
    }
  }

  const filtered = search
    ? restaurants.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : restaurants

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: TEXT }}>Feature Flags</h1>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            Activá o desactivá funciones por negocio. Click en ✅/❌ para cambiar.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar negocio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-xs px-4 py-2 rounded-xl text-sm outline-none"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, color: TEXT }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-4 py-3 font-semibold text-xs sticky left-0 z-10"
                  style={{ backgroundColor: CARD_BG, color: TEXT_MUTED, minWidth: '160px' }}>
                  Negocio
                </th>
                {ALL_FEATURES.map(f => (
                  <th key={f} className="px-3 py-3 font-medium text-[11px] text-center whitespace-nowrap"
                    style={{ color: TEXT_MUTED }}>
                    {FEATURE_LABELS[f]}
                  </th>
                ))}
                <th className="px-3 py-3 font-medium text-[11px] text-center"
                  style={{ color: TEXT_MUTED }}>
                  Template
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded animate-pulse"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    </td>
                    {ALL_FEATURES.map(f => (
                      <td key={f} className="px-3 py-3 text-center">
                        <div className="h-5 w-5 rounded-full mx-auto animate-pulse"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={ALL_FEATURES.length + 2}
                    className="text-center py-10 text-sm"
                    style={{ color: TEXT_MUTED }}>
                    {search ? 'Sin resultados para esa búsqueda' : 'Sin negocios activos'}
                  </td>
                </tr>
              ) : (
                filtered.map(rest => (
                  <tr key={rest.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-4 py-3 sticky left-0 z-10"
                      style={{ backgroundColor: CARD_BG }}>
                      <div className="font-medium text-sm" style={{ color: TEXT }}>{rest.name}</div>
                      <div className="text-[11px]" style={{ color: TEXT_MUTED }}>{rest.plan}</div>
                    </td>
                    {ALL_FEATURES.map(feature => {
                      const enabled = rest.features[feature] ?? false
                      const isSaving = saving === `${rest.id}-${feature}`
                      return (
                        <td key={feature} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggleFeature(rest.id, feature, enabled)}
                            disabled={!!saving}
                            title={`${enabled ? 'Desactivar' : 'Activar'} ${FEATURE_LABELS[feature]}`}
                            className="text-lg transition-opacity disabled:opacity-40"
                            style={{ opacity: isSaving ? 0.4 : 1 }}
                          >
                            {enabled ? '✅' : '❌'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="px-3 py-3">
                      <div className="flex gap-1 justify-center">
                        {(['hub_free', 'os_gastronomy', 'os_retail', 'os_full'] as const).map(plan => (
                          <button
                            key={plan}
                            onClick={() => applyTemplate(rest.id, plan)}
                            disabled={!!saving}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-opacity disabled:opacity-40"
                            style={{
                              backgroundColor: `${PLAN_COLORS[plan]}18`,
                              color:           PLAN_COLORS[plan],
                              border: `1px solid ${PLAN_COLORS[plan]}30`,
                            }}
                          >
                            {PLAN_LABELS[plan]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs mt-3" style={{ color: TEXT_MUTED }}>
        Los cambios se aplican inmediatamente. Cada toggle queda registrado en el log de acciones.
      </p>
    </div>
  )
}
