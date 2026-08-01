import { useState, useEffect, useCallback } from 'react'
import { X, ExternalLink, Eye, Mail, MessageCircle, RefreshCw, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  PLAN_COLORS, PLAN_LABELS, PLAN_FEATURES, PLAN_PRICES,
  FEATURE_LABELS, ALL_FEATURES,
  ONBOARDING_LABELS, ONBOARDING_STEPS,
  logAdminAction, openWhatsApp, timeSince,
} from '../lib/adminActions'

const MODAL_BG   = '#171A21'
const INNER_BG   = 'rgba(255,255,255,0.03)'
const BORDER     = 'rgba(255,255,255,0.06)'
const TEXT       = '#F5F7FA'
const TEXT_MUTED = '#98A2B3'
const ACCENT     = '#FF6B7A'

type DetailTab = 'info' | 'metricas' | 'onboarding' | 'notas' | 'plan' | 'features' | 'acciones'

const TAB_LABELS: Record<DetailTab, string> = {
  info:       'Info',
  metricas:   'Métricas',
  onboarding: 'Onboarding',
  notas:      'Notas',
  plan:       'Plan',
  features:   'Features',
  acciones:   'Acciones',
}

export interface RestaurantRow {
  id: string
  name: string
  slug: string
  city: string | null
  phone: string | null
  plan: 'hub_free' | 'os_gastronomy' | 'os_retail' | 'os_full'
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
  is_active: boolean
  trial_ends_at: string | null
  created_at: string
  onboarding_completed: boolean
}

interface RestaurantFull extends RestaurantRow {
  email: string | null
  logo_url: string | null
  features: Record<string, boolean>
  onboarding_steps: Record<string, boolean>
}

interface Metrics {
  menuItems:    number
  waiters:      number
  tables:       number
  drivers:      number
  totalOrders:  number
  totalRevenue: number
  orders7d:     number
  orders30d:    number
  lastOrderAt:  string | null
}

interface AdminNote {
  id: string
  content: string
  created_at: string
  author_email?: string
}

interface PlanChange {
  id: string
  old_plan: string
  new_plan: string
  created_at: string
  admin_label?: string
}

interface Props {
  restaurant: RestaurantRow | null
  onClose: () => void
  onUpdate: (r: RestaurantRow) => void
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-lg font-bold" style={{ color: TEXT }}>{value}</p>
      <p className="text-xs" style={{ color: TEXT_MUTED }}>{label}</p>
    </div>
  )
}

export function RestaurantDetailModal({ restaurant, onClose, onUpdate }: Props) {
  const [tab, setTab] = useState<DetailTab>('info')
  const [full, setFull] = useState<RestaurantFull | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [planChanges, setPlanChanges] = useState<PlanChange[]>([])
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [savingActive, setSavingActive] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)

  // Load full restaurant on open
  useEffect(() => {
    if (!restaurant) { setFull(null); return }
    setTab('info')
    ;(async () => {
      try {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name, slug, city, phone, email, logo_url, plan, subscription_status, is_active, trial_ends_at, created_at, onboarding_completed, features, onboarding_steps')
          .eq('id', restaurant.id)
          .single()

        if (data) {
          const f = (data as { features?: Record<string, boolean> }).features ?? {}
          setFull({
            ...data,
            features:         f,
            onboarding_steps: (data as { onboarding_steps?: Record<string, boolean> }).onboarding_steps ?? {},
          } as RestaurantFull)
          setFeatures(f)
        }
      } catch (e) { console.error('Error loading restaurant details:', e) }
    })()
  }, [restaurant?.id])

  const loadMetrics = useCallback(async () => {
    if (!restaurant) return
    setMetricsLoading(true)
    try {
      const ago7d  = new Date(Date.now() -  7 * 24 * 3600 * 1000).toISOString()
      const ago30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

      const [
        { count: menuItems },
        { count: waiters },
        { count: tables },
        { count: drivers },
        { data: orders },
        { count: cnt7d },
        { count: cnt30d },
      ] = await Promise.all([
        supabase.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).eq('is_available', true),
        supabase.from('waiters').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).eq('is_active', true),
        supabase.from('tables').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).eq('is_active', true),
        supabase.from('delivery_drivers').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).eq('is_active', true),
        supabase.from('orders').select('total, created_at').eq('restaurant_id', restaurant.id).neq('status', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).neq('status', 'cancelled').gte('created_at', ago7d),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).neq('status', 'cancelled').gte('created_at', ago30d),
      ])

      const ordersArr = (orders ?? []) as { total: number; created_at: string }[]
      setMetrics({
        menuItems:    menuItems ?? 0,
        waiters:      waiters   ?? 0,
        tables:       tables    ?? 0,
        drivers:      drivers   ?? 0,
        totalOrders:  ordersArr.length,
        totalRevenue: ordersArr.reduce((s, o) => s + (Number(o.total) || 0), 0),
        orders7d:     cnt7d  ?? 0,
        orders30d:    cnt30d ?? 0,
        lastOrderAt:  ordersArr[0]?.created_at ?? null,
      })
    } catch (e) { console.error(e) }
    finally { setMetricsLoading(false) }
  }, [restaurant?.id])

  const loadNotes = useCallback(async () => {
    if (!restaurant) return
    setNotesLoading(true)
    try {
      const { data: notesRaw } = await supabase
        .from('admin_notes')
        .select('id, content, created_at, author_id')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      type NoteRow = { id: string; content: string; created_at: string; author_id: string | null }
      const notesTyped = (notesRaw ?? []) as NoteRow[]
      const authorIds = [...new Set(notesTyped.map(n => n.author_id).filter(Boolean))] as string[]
      const { data: admins } = await supabase
        .from('super_admins')
        .select('user_id, email')
        .in('user_id', authorIds)

      const adminMap = Object.fromEntries((admins ?? []).map(a => [a.user_id, a.email as string]))

      setNotes(
        notesTyped.map(n => ({
          id:           n.id,
          content:      n.content,
          created_at:   n.created_at,
          author_email: n.author_id ? (adminMap[n.author_id] ?? n.author_id.slice(0, 8)) : '—',
        }))
      )
    } catch (e) { console.error(e) }
    finally { setNotesLoading(false) }
  }, [restaurant?.id])

  const loadPlanHistory = useCallback(async () => {
    if (!restaurant) return
    setPlanLoading(true)
    try {
      const { data: changesRaw } = await supabase
        .from('plan_changes')
        .select('id, old_plan, new_plan, changed_by, created_at')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(10)

      type ChangeRow = { id: string; old_plan: string; new_plan: string; changed_by: string | null; created_at: string }
      const changesTyped = (changesRaw ?? []) as ChangeRow[]
      const changerIds = [...new Set(changesTyped.map(c => c.changed_by).filter(Boolean))] as string[]
      const { data: admins } = await supabase
        .from('super_admins')
        .select('user_id, email')
        .in('user_id', changerIds)

      const adminMap = Object.fromEntries((admins ?? []).map(a => [a.user_id, (a.email as string).split('@')[0]]))

      setPlanChanges(
        changesTyped.map(c => ({
          id:          c.id,
          old_plan:    c.old_plan,
          new_plan:    c.new_plan,
          created_at:  c.created_at,
          admin_label: c.changed_by ? (adminMap[c.changed_by] ?? c.changed_by.slice(0, 8)) : '—',
        }))
      )
    } catch (e) { console.error(e) }
    finally { setPlanLoading(false) }
  }, [restaurant?.id])

  useEffect(() => {
    if (tab === 'metricas')  loadMetrics()
    if (tab === 'notas')     loadNotes()
    if (tab === 'plan')      loadPlanHistory()
  }, [tab, loadMetrics, loadNotes, loadPlanHistory])

  const r = full ?? restaurant

  async function changePlan(newPlan: string) {
    if (!r) return
    setSavingPlan(true)
    try {
      const { data: curr } = await supabase.from('restaurants').select('plan').eq('id', r.id).single()

      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('plan_changes').insert({
        restaurant_id: r.id,
        old_plan:      curr?.plan ?? r.plan,
        new_plan:      newPlan,
        reason:        'Cambio manual desde superadmin',
        changed_by:    session?.user?.id,
      })

      const validPlan = (['hub_free', 'os_gastronomy', 'os_retail', 'os_full'] as const).includes(newPlan as 'hub_free' | 'os_gastronomy' | 'os_retail' | 'os_full')
        ? newPlan as 'hub_free' | 'os_gastronomy' | 'os_retail' | 'os_full'
        : 'hub_free' as const
      const isNewTrial = validPlan === 'hub_free' && r.subscription_status !== 'active'
      await supabase.from('restaurants').update({
        plan: validPlan,
        ...(isNewTrial ? {
          trial_ends_at:       new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
          subscription_status: 'trial' as const,
        } : {}),
      }).eq('id', r.id)

      await logAdminAction('change_plan', 'restaurant', r.id, { old: curr?.plan, new: newPlan })

      toast.success(`✅ Plan cambiado a ${PLAN_LABELS[newPlan] ?? newPlan}`)
      const updated = { ...r, plan: newPlan as RestaurantRow['plan'] }
      setFull(updated as RestaurantFull)
      onUpdate(updated)
      loadPlanHistory()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar plan')
    } finally {
      setSavingPlan(false)
    }
  }

  async function extendTrial(days: number) {
    if (!r) return
    setSavingPlan(true)
    try {
      const base = r.trial_ends_at ? new Date(r.trial_ends_at) : new Date()
      const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 24 * 3600 * 1000)

      await supabase.from('restaurants').update({ trial_ends_at: newEnd.toISOString() }).eq('id', r.id)
      await logAdminAction('extend_trial', 'restaurant', r.id, { days, new_end: newEnd.toISOString() })

      toast.success(`✅ Trial extendido ${days} días`)
      const updated = { ...r, trial_ends_at: newEnd.toISOString() }
      setFull(updated as RestaurantFull)
      onUpdate(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al extender')
    } finally {
      setSavingPlan(false)
    }
  }

  async function saveFeatures() {
    if (!r) return
    setSavingFeatures(true)
    try {
      await supabase.from('restaurants').update({ features }).eq('id', r.id)
      await logAdminAction('update_features', 'restaurant', r.id, features)
      toast.success('✅ Features actualizados')
      setFull(prev => prev ? { ...prev, features } : null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar features')
    } finally {
      setSavingFeatures(false)
    }
  }

  async function toggleActive() {
    if (!r) return
    setSavingActive(true)
    try {
      const newVal = !r.is_active
      await supabase.from('restaurants').update({ is_active: newVal }).eq('id', r.id)
      await logAdminAction(newVal ? 'activate' : 'deactivate', 'restaurant', r.id)
      toast.success(newVal ? '✅ Cuenta activada' : '⛔ Cuenta desactivada')
      const updated = { ...r, is_active: newVal }
      setFull(updated as RestaurantFull)
      onUpdate(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingActive(false)
    }
  }

  async function addNote() {
    if (!r || !newNote.trim()) return
    setSavingNote(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('admin_notes').insert({
        restaurant_id: r.id,
        content:       newNote.trim(),
        author_id:     session?.user?.id,
      })
      await logAdminAction('add_note', 'restaurant', r.id, { preview: newNote.slice(0, 50) })
      toast.success('Nota guardada')
      setNewNote('')
      loadNotes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar nota')
    } finally {
      setSavingNote(false)
    }
  }

  async function resetPassword() {
    if (!r) return
    try {
      const email = (full?.email ?? '')
      if (!email) { toast.error('Sin email registrado'); return }
      await supabase.auth.resetPasswordForEmail(email)
      await logAdminAction('reset_password', 'restaurant', r.id)
      toast.success(`📧 Email de reset enviado a ${email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  function impersonate() {
    if (!r) return
    sessionStorage.setItem('impersonating', JSON.stringify({
      restaurantId:   r.id,
      restaurantName: r.name,
      restaurantSlug: r.slug,
    }))
    logAdminAction('impersonate', 'restaurant', r.id)
    window.open('/dashboard', '_blank')
  }

  if (!restaurant) return null

  const daysLeft = r?.trial_ends_at
    ? Math.ceil((new Date(r.trial_ends_at).getTime() - Date.now()) / (24 * 3600 * 1000))
    : null

  // Compute onboarding from onboarding_steps + metrics fallback
  const oSteps = full?.onboarding_steps ?? {}
  const computedOnboarding: Record<string, boolean> = {
    logo_uploaded:      oSteps.logo_uploaded      ?? !!full?.logo_url,
    products_added:     oSteps.products_added      ?? (metrics ? metrics.menuItems > 0 : false),
    tables_created:     oSteps.tables_created      ?? (metrics ? metrics.tables > 0 : false),
    waiters_registered: oSteps.waiters_registered  ?? (metrics ? metrics.waiters > 0 : false),
    qr_generated:       oSteps.qr_generated        ?? false,
    first_order:        oSteps.first_order         ?? (metrics ? metrics.totalOrders > 0 : false),
  }
  const onboardingCompleted = Object.values(computedOnboarding).filter(Boolean).length
  const onboardingTotal     = ONBOARDING_STEPS.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: MODAL_BG, border: `1px solid ${BORDER}`, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT }}>🏪 {r?.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
              /{r?.slug}{r?.city ? ` · ${r.city}` : ''}
              {' '}·{' '}
              <span style={{ color: PLAN_COLORS[r?.plan ?? 'hub_free'] }}>
                {PLAN_LABELS[r?.plan ?? 'hub_free']}
              </span>
              {r?.subscription_status === 'trial' && daysLeft !== null && (
                <span style={{ color: daysLeft <= 3 ? '#EF4444' : '#F59E0B' }}>
                  {' '}· trial{daysLeft > 0 ? ` (${daysLeft}d)` : ' vencido'}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: TEXT_MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-2 flex-shrink-0 overflow-x-auto" style={{ borderBottom: `1px solid ${BORDER}` }}>
          {(Object.keys(TAB_LABELS) as DetailTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: tab === t ? `${ACCENT}18` : 'transparent',
                color:           tab === t ? ACCENT : TEXT_MUTED,
              }}
            >
              {TAB_LABELS[t]}
              {t === 'notas' && notes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ backgroundColor: `${ACCENT}25`, color: ACCENT }}>
                  {notes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── INFO ────────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Email',      value: full?.email ?? '—' },
                  { label: 'Teléfono',   value: r?.phone ?? '—'   },
                  { label: 'Ciudad',     value: r?.city  ?? '—'   },
                  { label: 'Registrado', value: new Date(r?.created_at ?? '').toLocaleDateString('es-AR') },
                  { label: 'Estado',     value: r?.is_active ? '✅ Activo' : '⛔ Inactivo' },
                  { label: 'Suscripción', value: r?.subscription_status ?? '—' },
                  { label: 'Onboarding', value: r?.onboarding_completed ? '✅ Completado' : `⏳ ${onboardingCompleted}/${onboardingTotal} pasos` },
                  ...(r?.trial_ends_at ? [{ label: 'Trial vence', value: new Date(r.trial_ends_at).toLocaleDateString('es-AR') }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-3" style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}` }}>
                    <p className="text-[11px] mb-0.5" style={{ color: TEXT_MUTED }}>{label}</p>
                    <p style={{ color: TEXT }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── MÉTRICAS ────────────────────────────────────────── */}
          {tab === 'metricas' && (
            metricsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse"
                    style={{ backgroundColor: INNER_BG }} />
                ))}
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Pedidos totales"  value={metrics.totalOrders} />
                  <StatBox label="Revenue total"    value={`$${metrics.totalRevenue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`} />
                  <StatBox label="Pedidos últimos 7d"  value={metrics.orders7d}  />
                  <StatBox label="Pedidos últimos 30d" value={metrics.orders30d} />
                  <StatBox label="Ticket promedio"  value={metrics.totalOrders > 0 ? `$${Math.round(metrics.totalRevenue / metrics.totalOrders).toLocaleString('es-AR')}` : '—'} />
                  <StatBox label="Productos activos" value={metrics.menuItems} />
                  <StatBox label="Mozos activos"    value={metrics.waiters}   />
                  <StatBox label="Mesas activas"    value={metrics.tables}    />
                  <StatBox label="Repartidores"     value={metrics.drivers}   />
                </div>
                {metrics.lastOrderAt && (
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>
                    Último pedido: {new Date(metrics.lastOrderAt).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <button onClick={loadMetrics}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm"
                  style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Cargar métricas
                </button>
              </div>
            )
          )}

          {/* ── ONBOARDING ──────────────────────────────────────── */}
          {tab === 'onboarding' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: TEXT }}>
                  Progreso: {onboardingCompleted}/{onboardingTotal}
                </p>
                <div className="w-32 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(onboardingCompleted / onboardingTotal) * 100}%`, backgroundColor: '#10B981' }} />
                </div>
              </div>
              <div className="space-y-2">
                {ONBOARDING_STEPS.map(step => {
                  const done = computedOnboarding[step] ?? false
                  return (
                    <div key={step}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{
                        backgroundColor: done ? '#10B98110' : INNER_BG,
                        border: `1px solid ${done ? '#10B98130' : BORDER}`,
                      }}>
                      <span className="text-base">{done ? '✅' : '❌'}</span>
                      <span className="text-sm" style={{ color: done ? '#10B981' : TEXT_MUTED }}>
                        {ONBOARDING_LABELS[step]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── NOTAS ───────────────────────────────────────────── */}
          {tab === 'notas' && (
            <div className="space-y-4">
              {/* Add note */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Agregar nota interna..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}`, color: TEXT }}
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || savingNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {savingNote ? 'Guardando...' : 'Agregar nota'}
                </button>
              </div>

              {/* Notes list */}
              {notesLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 rounded-xl animate-pulse"
                      style={{ backgroundColor: INNER_BG }} />
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: TEXT_MUTED }}>
                  Sin notas internas aún
                </p>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className="rounded-xl p-3"
                      style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}` }}>
                      <p className="text-sm mb-1.5" style={{ color: TEXT }}>{note.content}</p>
                      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                        {note.author_email} · {timeSince(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PLAN ────────────────────────────────────────────── */}
          {tab === 'plan' && (
            <div className="space-y-5">
              {/* Current plan */}
              <div className="rounded-xl p-4" style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: TEXT_MUTED }}>Plan actual</p>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${PLAN_COLORS[r?.plan ?? 'hub_free']}20`, color: PLAN_COLORS[r?.plan ?? 'hub_free'] }}>
                    {PLAN_LABELS[r?.plan ?? 'hub_free']}
                  </span>
                </div>
                {r?.trial_ends_at && (
                  <p className="text-sm" style={{ color: daysLeft !== null && daysLeft <= 3 ? '#EF4444' : TEXT_MUTED }}>
                    Trial: {daysLeft !== null && daysLeft > 0 ? `vence en ${daysLeft} días` : daysLeft === 0 ? 'vence hoy' : 'vencido'}
                    {' '}({new Date(r.trial_ends_at).toLocaleDateString('es-AR')})
                  </p>
                )}
              </div>

              {/* Change plan */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Cambiar plan</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['hub_free', 'os_gastronomy', 'os_retail', 'os_full'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => changePlan(p)}
                      disabled={savingPlan || r?.plan === p}
                      className="py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: r?.plan === p ? `${PLAN_COLORS[p]}22` : INNER_BG,
                        border: `1.5px solid ${r?.plan === p ? PLAN_COLORS[p] : BORDER}`,
                        color:  PLAN_COLORS[p],
                      }}
                    >
                      {PLAN_LABELS[p]}
                      <br />
                      <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>${PLAN_PRICES[p]}/mes</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extend trial */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Extender trial</p>
                <div className="flex gap-2">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => extendTrial(days)}
                      disabled={savingPlan}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-40"
                      style={{ backgroundColor: '#3B82F618', color: '#3B82F6', border: '1px solid #3B82F630' }}
                    >
                      +{days} días
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan history */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Historial</p>
                {planLoading ? (
                  <div className="space-y-2">
                    {[1,2].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: INNER_BG }} />)}
                  </div>
                ) : planChanges.length === 0 ? (
                  <p className="text-xs py-4 text-center" style={{ color: TEXT_MUTED }}>Sin cambios registrados</p>
                ) : (
                  <div className="space-y-1.5">
                    {planChanges.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs"
                        style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: '6px' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: PLAN_COLORS[c.old_plan] ?? TEXT_MUTED }}>{PLAN_LABELS[c.old_plan] ?? c.old_plan}</span>
                          <span style={{ color: TEXT_MUTED }}>→</span>
                          <span style={{ color: PLAN_COLORS[c.new_plan] ?? TEXT_MUTED }}>{PLAN_LABELS[c.new_plan] ?? c.new_plan}</span>
                        </div>
                        <span style={{ color: TEXT_MUTED }}>
                          {c.admin_label} · {new Date(c.created_at).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FEATURES ────────────────────────────────────────── */}
          {tab === 'features' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {ALL_FEATURES.map(f => (
                  <div key={f} className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}` }}>
                    <span className="text-sm" style={{ color: TEXT }}>{FEATURE_LABELS[f]}</span>
                    <button
                      onClick={() => setFeatures(prev => ({ ...prev, [f]: !prev[f] }))}
                      className="text-lg transition-opacity"
                    >
                      {features[f] ? '✅' : '❌'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Templates */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: TEXT_MUTED }}>Aplicar template</p>
                <div className="flex gap-2">
                  {(['hub_free', 'os_gastronomy', 'os_retail', 'os_full'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setFeatures({ ...PLAN_FEATURES[p] })}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold"
                      style={{
                        backgroundColor: `${PLAN_COLORS[p]}15`,
                        color: PLAN_COLORS[p],
                        border: `1px solid ${PLAN_COLORS[p]}30`,
                      }}
                    >
                      {PLAN_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveFeatures}
                disabled={savingFeatures}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #FF8E53)` }}
              >
                {savingFeatures ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── ACCIONES ────────────────────────────────────────── */}
          {tab === 'acciones' && (
            <div className="space-y-2">
              <a
                href={`/r/${r?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium"
                style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}`, color: TEXT }}
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: TEXT_MUTED }} />
                Ver menú público
              </a>

              <button
                onClick={impersonate}
                className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium"
                style={{ backgroundColor: `${ACCENT}12`, border: `1px solid ${ACCENT}33`, color: ACCENT }}
              >
                <Eye className="w-4 h-4 flex-shrink-0" />
                Ver su dashboard (impersonar)
                <span className="ml-auto text-xs opacity-60">→ nueva pestaña</span>
              </button>

              {full?.email && (
                <a
                  href={`mailto:${full.email}`}
                  className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
                  Enviar email
                  <span className="ml-auto text-xs" style={{ color: TEXT_MUTED }}>{full.email}</span>
                </a>
              )}

              {r?.phone && (
                <button
                  onClick={() => openWhatsApp(r.phone!, r.name)}
                  className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: INNER_BG, border: `1px solid ${BORDER}`, color: TEXT }}
                >
                  <MessageCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#25D366' }} />
                  WhatsApp directo
                  <span className="ml-auto text-xs" style={{ color: TEXT_MUTED }}>{r.phone}</span>
                </button>
              )}

              <button
                onClick={resetPassword}
                className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F59E0B12', border: '1px solid #F59E0B30', color: '#F59E0B' }}
              >
                <RefreshCw className="w-4 h-4 flex-shrink-0" />
                Reset contraseña del dueño
              </button>

              <button
                onClick={toggleActive}
                disabled={savingActive}
                className="flex items-center gap-3 w-full p-4 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: r?.is_active ? '#EF444412' : '#10B98112',
                  border: `1px solid ${r?.is_active ? '#EF444430' : '#10B98130'}`,
                  color: r?.is_active ? '#EF4444' : '#10B981',
                }}
              >
                {r?.is_active ? '⛔ Desactivar cuenta' : '✅ Reactivar cuenta'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
