import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, Plus, X, Trash2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useCashRegister } from '../hooks/useCashRegister'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

/* ── palette ─────────────────────────────────────────────────────────── */
const BG      = '#0F1115'
const SURFACE = '#16181F'
const CARD    = 'rgba(255,255,255,0.04)'
const BDR     = '1px solid rgba(255,255,255,0.08)'
const ACCENT  = '#F4705A'
const RED     = '#ef4444'
const TEXT    = '#F5F7FA'
const MUTED   = 'rgba(255,255,255,0.45)'

/* ── Category config ─────────────────────────────────────────────────── */
const CATEGORIES = ['Insumos', 'Limpieza', 'Sueldos', 'Mantenimiento', 'Servicios', 'Otros'] as const
type Category = (typeof CATEGORIES)[number]

const CAT_COLOR: Record<Category, string> = {
  Insumos:       '#3b82f6',
  Limpieza:      '#14b8a6',
  Sueldos:       '#a855f7',
  Mantenimiento: '#f59e0b',
  Servicios:     '#F4705A',
  Otros:         '#6b7280',
}

const CAT_BG: Record<Category, string> = {
  Insumos:       'rgba(59,130,246,0.12)',
  Limpieza:      'rgba(20,184,166,0.12)',
  Sueldos:       'rgba(168,85,247,0.12)',
  Mantenimiento: 'rgba(245,158,11,0.12)',
  Servicios:     'rgba(244,112,90,0.12)',
  Otros:         'rgba(107,114,128,0.12)',
}

/* ── Types ───────────────────────────────────────────────────────────── */
interface Expense {
  id: string
  restaurant_id: string
  amount: number
  category: Category
  description: string | null
  created_by: string
  created_at: string
  deleted_at: string | null
}

type FilterRange = 'today' | 'week' | 'month' | 'custom'

/* ── Helpers ─────────────────────────────────────────────────────────── */
function fmtARS(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function getRangeStart(range: FilterRange, customStart: string): string {
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (range === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString() }
  if (range === 'month') { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString() }
  return customStart ? new Date(customStart).toISOString() : new Date(0).toISOString()
}

/* ── CategoryBadge ───────────────────────────────────────────────────── */
function CategoryBadge({ cat }: { cat: string }) {
  const c = cat as Category
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: CAT_COLOR[c] ?? '#6b7280',
      background: CAT_BG[c] ?? 'rgba(107,114,128,0.12)',
      borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {cat}
    </span>
  )
}

/* ── New Expense Modal ───────────────────────────────────────────────── */
function NewExpenseModal({ restaurantId, userName, cashRegisterId, onClose, onSaved }: {
  restaurantId:   string
  userName:       string
  cashRegisterId: string | null
  onClose:        () => void
  onSaved:        () => void
}) {
  const [amount,      setAmount]      = useState('')
  const [category,    setCategory]    = useState<Category>('Insumos')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)

  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Ingresá un monto válido'); return }

    setSaving(true)
    try {
      // 1. Insert expense
      const { data: expense, error: ee } = await db.from('expenses').insert({
        restaurant_id: restaurantId,
        amount:        amt,
        category,
        description:   description.trim() || null,
        created_by:    userName,
      }).select('id').single()
      if (ee) throw ee

      // 2. financial_transaction
      const { error: ftErr } = await db.from('financial_transactions').insert({
        restaurant_id:    restaurantId,
        type:             'expense',
        amount:           amt,
        reference_type:   'expense',
        reference_id:     expense.id,
        cash_register_id: cashRegisterId,
        description:      `${category}${description.trim() ? ' — ' + description.trim() : ''}`,
      })
      if (ftErr) throw ftErr

      // 3. cash_movement (solo si hay caja abierta)
      if (cashRegisterId) {
        const { error: cmErr } = await db.from('cash_movements').insert({
          cash_register_id: cashRegisterId,
          restaurant_id:    restaurantId,
          type:             'expense',
          amount:           amt,
          description:      `${category}${description.trim() ? ' — ' + description.trim() : ''}`,
          category,
          created_by_name:  userName,
        })
        if (cmErr) throw cmErr
      }

      // 4. audit_log (warn only — no debe bloquear el gasto)
      const { error: alErr } = await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name:     userName,
        action:        'expense_created',
        entity_type:   'expense',
        entity_id:     expense.id,
        details:       { amount: amt, category, description: description.trim() || null },
      })
      if (alErr) console.warn('audit_log failed:', alErr)

      toast.success('✅ Gasto registrado')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar el gasto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, background: SURFACE, borderRadius: 20, border: BDR, padding: 28 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
            Nuevo Gasto
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '4px 8px', color: MUTED, cursor: 'pointer', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Monto */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Monto <span style={{ color: ACCENT }}>*</span>
            </label>
            <input
              type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="$0"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 10, color: TEXT, fontSize: 20, fontWeight: 800, outline: 'none', fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}
            />
          </div>

          {/* Categoría */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Categoría
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: '8px 4px', borderRadius: 9, border: category === c ? `2px solid ${CAT_COLOR[c]}` : BDR,
                    background: category === c ? CAT_BG[c] : 'rgba(255,255,255,0.03)',
                    color: category === c ? CAT_COLOR[c] : MUTED,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Responsable (readonly) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Responsable
            </label>
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: BDR, borderRadius: 10, fontSize: 14, color: MUTED }}>
              {userName}
            </div>
          </div>

          {/* Fecha (readonly) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Fecha
            </label>
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: BDR, borderRadius: 10, fontSize: 14, color: MUTED }}>
              {today}
            </div>
          </div>

          {/* Observación */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Observación
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle del gasto..."
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: BDR, borderRadius: 10, color: TEXT, fontSize: 14, resize: 'none', outline: 'none' }}
            />
          </div>

          {/* Comprobante (disabled) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Comprobante
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: BDR, borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Subir archivo...</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: `${ACCENT}18`, borderRadius: 6, padding: '2px 8px', marginLeft: 'auto' }}>
                Próximamente
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={save}
            disabled={saving}
            style={{
              width: '100%', padding: '13px', background: saving ? 'rgba(244,112,90,0.5)' : ACCENT,
              border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.04em',
              fontFamily: 'var(--font-ruda, Ruda, sans-serif)', marginTop: 4,
            }}
          >
            {saving ? 'Guardando...' : 'Registrar Gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Analytics section ───────────────────────────────────────────────── */
function AnalyticsSection({ restaurantId }: { restaurantId: string }) {
  const [range,    setRange]    = useState<'today' | 'week' | 'month'>('month')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = getRangeStart(range, '')
      const { data } = await db
        .from('expenses')
        .select('id, amount, category, created_at, deleted_at')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .gte('created_at', from)
      setExpenses(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [restaurantId, range])

  useEffect(() => { load() }, [load])

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Group by category
  const byCategory: Record<string, number> = {}
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  })
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const RANGES = [
    { key: 'today' as const, label: 'Hoy'   },
    { key: 'week'  as const, label: 'Semana' },
    { key: 'month' as const, label: 'Mes'    },
  ]

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
          Analytics
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: range === r.key ? ACCENT : 'rgba(255,255,255,0.06)',
                color:      range === r.key ? '#fff'  : MUTED,
                transition: 'all 150ms',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <Spinner size="lg" />
        </div>
      ) : expenses.length === 0 ? (
        <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '32px 16px', textAlign: 'center', color: MUTED }}>
          Sin gastos en este período
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

          {/* Total card */}
          <div style={{ background: SURFACE, border: BDR, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Total gastado
            </p>
            <p style={{ fontSize: 32, fontWeight: 800, color: RED, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
              {fmtARS(total)}
            </p>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Pie chart */}
          {pieData.length > 0 && (
            <div style={{ background: SURFACE, border: BDR, borderRadius: 16, padding: '20px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
                Por categoría
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={CAT_COLOR[entry.name as Category] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmtARS(Number(v))}
                      contentStyle={{ background: SURFACE, border: BDR, borderRadius: 10, color: TEXT, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[d.name as Category] ?? '#6b7280', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: MUTED, flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{fmtARS(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Horizontal bar chart */}
          {pieData.length > 0 && (
            <div style={{ background: SURFACE, border: BDR, borderRadius: 16, padding: '20px 24px', gridColumn: pieData.length > 0 ? '1 / -1' : undefined }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
                Top categorías
              </p>
              <ResponsiveContainer width="100%" height={Math.max(120, pieData.length * 36)}>
                <BarChart
                  data={pieData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
                  <Tooltip
                    formatter={(v) => fmtARS(Number(v))}
                    contentStyle={{ background: SURFACE, border: BDR, borderRadius: 10, color: TEXT, fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CAT_COLOR[entry.name as Category] ?? '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export function GastosPage() {
  const { user }                                 = useAuthStore()
  const { restaurantId }                         = useRestaurantStore()
  const { register: cashRegister, loading: cashLoading } = useCashRegister()
  const [expenses,     setExpenses]              = useState<Expense[]>([])
  const [loading,      setLoading]               = useState(true)
  const [showModal,    setShowModal]             = useState(false)
  const [deletingId,   setDeletingId]            = useState<string | null>(null)
  const [range,        setRange]                 = useState<FilterRange>('month')
  const [customFrom,   setCustomFrom]            = useState('')
  const [customTo,     setCustomTo]              = useState('')

  const userName = (user?.user_metadata?.full_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'Dueño'

  const load = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    try {
      const from = getRangeStart(range, customFrom)
      let q = db
        .from('expenses')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
        .gte('created_at', from)
        .order('created_at', { ascending: false })

      if (range === 'custom' && customTo) {
        q = q.lte('created_at', new Date(customTo + 'T23:59:59').toISOString())
      }

      const { data, error } = await q
      if (error) throw error
      setExpenses(data ?? [])
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar los gastos')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, range, customFrom, customTo])

  useEffect(() => { load() }, [load])

  // FIX 3: si no llega restaurantId en 3s (restaurant no encontrado), para el spinner
  useEffect(() => {
    if (restaurantId || cashLoading) return
    const timer = setTimeout(() => setLoading(false), 3000)
    return () => clearTimeout(timer)
  }, [restaurantId, cashLoading])

  async function softDelete(expense: Expense) {
    if (!confirm(`¿Eliminar gasto de ${fmtARS(expense.amount)} (${expense.category})?`)) return
    setDeletingId(expense.id)
    try {
      await db.from('expenses').update({ deleted_at: new Date().toISOString() }).eq('id', expense.id)
      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name:     userName,
        action:        'expense_deleted',
        entity_type:   'expense',
        entity_id:     expense.id,
        details:       { amount: expense.amount, category: expense.category },
      })
      toast.success('Gasto eliminado')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const RANGES: { key: FilterRange; label: string }[] = [
    { key: 'today',  label: 'Hoy'          },
    { key: 'week',   label: 'Semana'       },
    { key: 'month',  label: 'Mes'          },
    { key: 'custom', label: 'Personalizado'},
  ]

  const totalPeriod = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, padding: '24px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `${RED}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown style={{ width: 22, height: 22, color: RED }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                Gastos
              </h1>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
                {totalPeriod > 0 ? `${fmtARS(totalPeriod)} en el período` : 'Gastos operativos'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={!restaurantId}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: ACCENT, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: !restaurantId ? 'not-allowed' : 'pointer', opacity: !restaurantId ? 0.5 : 1 }}
          >
            <Plus style={{ width: 18, height: 18 }} />
            Nuevo Gasto
          </button>
        </div>

        {/* Filter range */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: range === r.key ? ACCENT : 'rgba(255,255,255,0.06)',
                color:      range === r.key ? '#fff'  : MUTED,
                transition: 'all 150ms',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {range === 'custom' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none' }}
            />
            <input
              type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, color: TEXT, fontSize: 13, outline: 'none' }}
            />
          </div>
        )}

        {/* Expenses list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spinner size="lg" />
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '48px 16px', textAlign: 'center', color: MUTED }}>
            <TrendingDown style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.12)', margin: '0 auto 12px' }} />
            {!restaurantId ? (
              <>
                <p style={{ fontSize: 14, margin: '0 0 4px' }}>No se pudo cargar el negocio</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{ marginTop: 16, padding: '9px 20px', background: 'rgba(255,255,255,0.08)', border: BDR, borderRadius: 9, color: MUTED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Reintentar
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, margin: 0 }}>Sin gastos en este período</p>
                <button
                  onClick={() => setShowModal(true)}
                  style={{ marginTop: 16, padding: '9px 20px', background: ACCENT, border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Registrar primer gasto
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ background: SURFACE, border: BDR, borderRadius: 16, overflow: 'hidden' }}>

            {/* Desktop table header */}
            <div
              className="hidden md:grid"
              style={{ gridTemplateColumns: '130px 120px 130px 110px 1fr 44px', gap: 0, padding: '10px 20px', borderBottom: BDR }}
            >
              {['Fecha', 'Categoría', 'Responsable', 'Monto', 'Observación', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>

            {expenses.map((exp, i) => {
              const isLast = i === expenses.length - 1
              return (
                <div key={exp.id}>
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid"
                    style={{ gridTemplateColumns: '130px 120px 130px 110px 1fr 44px', gap: 0, padding: '14px 20px', borderBottom: isLast ? 'none' : BDR, alignItems: 'center' }}
                  >
                    <span style={{ fontSize: 12, color: MUTED }}>{fmtDateTime(exp.created_at)}</span>
                    <CategoryBadge cat={exp.category} />
                    <span style={{ fontSize: 13, color: TEXT }}>{exp.created_by}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: RED, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                      -{fmtARS(exp.amount)}
                    </span>
                    <span style={{ fontSize: 13, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                      {exp.description ?? '—'}
                    </span>
                    <button
                      onClick={() => softDelete(exp)}
                      disabled={deletingId === exp.id}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deletingId === exp.id ? 0.5 : 1 }}
                    >
                      <Trash2 style={{ width: 14, height: 14, color: RED }} />
                    </button>
                  </div>

                  {/* Mobile card */}
                  <div
                    className="md:hidden"
                    style={{ padding: '14px 16px', borderBottom: isLast ? 'none' : BDR, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <CategoryBadge cat={exp.category} />
                        <span style={{ fontSize: 11, color: MUTED }}>{fmtDateTime(exp.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: MUTED }}>{exp.created_by}</p>
                      {exp.description && (
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: RED, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
                        -{fmtARS(exp.amount)}
                      </span>
                      <button
                        onClick={() => softDelete(exp)}
                        disabled={deletingId === exp.id}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px', cursor: 'pointer', display: 'flex', opacity: deletingId === exp.id ? 0.5 : 1 }}
                      >
                        <Trash2 style={{ width: 14, height: 14, color: RED }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Analytics */}
        {restaurantId && <AnalyticsSection restaurantId={restaurantId} />}

      </div>

      {/* Modal */}
      {showModal && restaurantId && (
        <NewExpenseModal
          restaurantId={restaurantId}
          userName={userName}
          cashRegisterId={cashRegister?.id ?? null}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
