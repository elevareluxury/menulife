import { useState, useEffect, useCallback } from 'react'
import {
  Banknote, Plus, X, TrendingUp, TrendingDown,
  Coins, ArrowUpDown, Wallet, History, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
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
const GREEN   = '#22c55e'
const RED     = '#ef4444'
const AMBER   = '#f59e0b'
const TEXT    = '#F5F7FA'
const MUTED   = 'rgba(255,255,255,0.45)'

type MovementType = 'income' | 'expense' | 'adjustment'

const EXPENSE_CATS = ['Insumos', 'Limpieza', 'Sueldos', 'Mantenimiento', 'Servicios', 'Otros']

function fmtARS(n: number) {
  return '$' + Math.abs(n).toLocaleString('es-AR')
}

function fmtDate(d: string) {
  return new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function movBadge(type: MovementType) {
  if (type === 'income')     return { label: 'Ingreso', bg: 'rgba(34,197,94,0.12)',  color: GREEN }
  if (type === 'expense')    return { label: 'Egreso',  bg: 'rgba(239,68,68,0.12)',  color: RED   }
  return                            { label: 'Ajuste',  bg: 'rgba(245,158,11,0.12)', color: AMBER }
}

/* ── KPI card ────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string
}) {
  return (
    <div style={{
      background: CARD, border: BDR, borderRadius: 16,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      </div>
      <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>{value}</span>
    </div>
  )
}

/* ── Open register panel ─────────────────────────────────────────────── */
function OpenRegisterPanel({ restaurantId, userName, onOpened }: {
  restaurantId: string; userName: string; onOpened: () => void
}) {
  const [amount, setAmount]   = useState('')
  const [notes,  setNotes]    = useState('')
  const [saving, setSaving]   = useState(false)

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  async function openRegister() {
    const initialAmount = parseFloat(amount) || 0
    setSaving(true)
    try {
      const { data: reg, error } = await db.from('cash_registers').insert({
        restaurant_id: restaurantId,
        opened_by_name: userName,
        initial_amount: initialAmount,
        notes: notes.trim() || null,
        status: 'open',
      }).select('id').single()
      if (error) throw error

      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name: userName,
        action: 'cash_open',
        entity_type: 'cash_register',
        entity_id: reg.id,
        details: { initial_amount: initialAmount },
      })

      toast.success('✅ Caja abierta correctamente')
      onOpened()
    } catch (err) {
      console.error(err)
      toast.error('Error al abrir la caja')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Banknote style={{ width: 24, height: 24, color: ACCENT }} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
            Apertura de Caja
          </h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Registrá el monto inicial para comenzar</p>
        </div>
      </div>

      <div style={{ background: SURFACE, border: BDR, borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Fecha */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Fecha
          </label>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: BDR, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: MUTED, textTransform: 'capitalize' }}>
            {today}
          </div>
        </div>

        {/* Usuario */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Usuario
          </label>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: BDR, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: MUTED }}>
            {userName}
          </div>
        </div>

        {/* Monto inicial */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Monto inicial <span style={{ color: ACCENT }}>*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="$0"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 10, color: TEXT, fontSize: 18, fontWeight: 700,
              outline: 'none', fontFamily: 'var(--font-ruda, Ruda, sans-serif)',
            }}
          />
        </div>

        {/* Observaciones */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Observaciones (opcional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notas de apertura..."
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)', border: BDR,
              borderRadius: 10, color: TEXT, fontSize: 14, resize: 'none', outline: 'none',
            }}
          />
        </div>

        <button
          onClick={openRegister}
          disabled={saving}
          style={{
            width: '100%', padding: '14px', background: saving ? 'rgba(244,112,90,0.5)' : ACCENT,
            border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.05em',
            fontFamily: 'var(--font-ruda, Ruda, sans-serif)',
          }}
        >
          {saving ? 'Abriendo...' : 'ABRIR CAJA'}
        </button>
      </div>
    </div>
  )
}

/* ── New Movement Modal ───────────────────────────────────────────────── */
function NewMovementModal({ registerId, restaurantId, userName, onClose, onSaved }: {
  registerId: string; restaurantId: string; userName: string; onClose: () => void; onSaved: () => void
}) {
  const [type,        setType]        = useState<MovementType>('income')
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [category,    setCategory]    = useState(EXPENSE_CATS[0])
  const [saving,      setSaving]      = useState(false)

  async function save() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Ingresá un monto válido'); return }
    if (!description.trim()) { toast.error('Completá la descripción'); return }
    setSaving(true)
    try {
      const { data: mv, error } = await db.from('cash_movements').insert({
        cash_register_id: registerId,
        restaurant_id: restaurantId,
        type,
        amount: amt,
        description: description.trim(),
        category: type === 'expense' ? category : null,
        created_by_name: userName,
      }).select('id').single()
      if (error) throw error

      await db.from('financial_transactions').insert({
        restaurant_id: restaurantId,
        type,
        amount: amt,
        reference_type: 'cash_movement',
        reference_id: mv.id,
        cash_register_id: registerId,
        description: description.trim(),
      })

      await db.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_name: userName,
        action: 'cash_movement',
        entity_type: 'cash_movement',
        entity_id: mv.id,
        details: { type, amount: amt, description: description.trim() },
      })

      toast.success('✅ Movimiento registrado')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar el movimiento')
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: MovementType; label: string; color: string }[] = [
    { key: 'income',     label: 'Ingreso', color: GREEN },
    { key: 'expense',    label: 'Egreso',  color: RED   },
    { key: 'adjustment', label: 'Ajuste',  color: AMBER },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, background: SURFACE, borderRadius: 20, border: BDR, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
            Nuevo Movimiento
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '4px 8px', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Type tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: type === t.key ? t.color : 'transparent',
                color: type === t.key ? '#fff' : MUTED,
                transition: 'all 200ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Amount */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Monto</label>
            <input
              type="number" min="0" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="$0"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 10, color: TEXT, fontSize: 16, fontWeight: 700, outline: 'none' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Descripción</label>
            <input
              type="text" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle del movimiento..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 10, color: TEXT, fontSize: 14, outline: 'none' }}
            />
          </div>

          {/* Category (only for expense) */}
          {type === 'expense' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 10, color: TEXT, fontSize: 14, outline: 'none' }}
              >
                {EXPENSE_CATS.map(c => <option key={c} value={c} style={{ background: SURFACE }}>{c}</option>)}
              </select>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            style={{
              width: '100%', padding: '12px', background: saving ? 'rgba(244,112,90,0.5)' : ACCENT,
              border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer', marginTop: 4,
            }}
          >
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Close cash modal ─────────────────────────────────────────────────── */
function CloseCashModal({ register, summary, userName, onClose, onClosed }: {
  register: import('../hooks/useCashRegister').CashRegister
  summary: import('../hooks/useCashRegister').CashSummary
  userName: string
  onClose: () => void
  onClosed: () => void
}) {
  const [counted, setCounted] = useState('')
  const [saving,  setSaving]  = useState(false)

  const expectedBalance = register.initial_amount + summary.sales + summary.incomes - summary.expenses + summary.adjustments
  const countedNum      = parseFloat(counted) || 0
  const difference      = countedNum - expectedBalance
  const diffColor       = difference >= 0 ? GREEN : RED

  async function closeRegister() {
    setSaving(true)
    try {
      await db.from('cash_registers').update({
        status:                'closed',
        closed_by_name:        userName,
        closed_at:             new Date().toISOString(),
        final_counted_amount:  countedNum,
        expected_amount:       expectedBalance,
        difference,
      }).eq('id', register.id)

      await db.from('audit_logs').insert({
        restaurant_id: register.restaurant_id,
        user_name:     userName,
        action:        'cash_close',
        entity_type:   'cash_register',
        entity_id:     register.id,
        details: {
          initial_amount:  register.initial_amount,
          sales:           summary.sales,
          expenses:        summary.expenses,
          tips:            summary.tips,
          expected_amount: expectedBalance,
          counted_amount:  countedNum,
          difference,
        },
      })

      toast.success('🔒 Caja cerrada correctamente')
      onClosed()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al cerrar la caja')
    } finally {
      setSaving(false)
    }
  }

  const row = (label: string, value: string, valueColor?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: BDR }}>
      <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? TEXT }}>{value}</span>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: SURFACE, borderRadius: 20, border: BDR, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
            Cierre de Caja
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '4px 8px', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Efectivo contado */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
            Efectivo contado <span style={{ color: ACCENT }}>*</span>
          </label>
          <input
            type="number" min="0" step="0.01" value={counted}
            onChange={e => setCounted(e.target.value)}
            placeholder="$0"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 10, color: TEXT, fontSize: 18, fontWeight: 700, outline: 'none' }}
          />
        </div>

        {/* Resumen */}
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '4px 16px', marginBottom: 20 }}>
          {row('Saldo Inicial',  fmtARS(register.initial_amount))}
          {row('Ventas período', fmtARS(summary.sales),      GREEN)}
          {row('Gastos período', fmtARS(summary.expenses),   RED)}
          {row('Propinas',       fmtARS(summary.tips),       AMBER)}
          {row('Saldo Esperado', fmtARS(expectedBalance))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Diferencia</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: diffColor }}>
              {difference >= 0 ? '+' : '-'}{fmtARS(difference)}
            </span>
          </div>
        </div>

        <button
          onClick={closeRegister}
          disabled={saving || !counted}
          style={{
            width: '100%', padding: '14px', background: saving || !counted ? 'rgba(239,68,68,0.3)' : RED,
            border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: saving || !counted ? 'not-allowed' : 'pointer', letterSpacing: '0.05em',
            fontFamily: 'var(--font-ruda, Ruda, sans-serif)',
          }}
        >
          {saving ? 'Cerrando...' : 'CERRAR CAJA'}
        </button>
      </div>
    </div>
  )
}

/* ── Caja Dashboard ───────────────────────────────────────────────────── */
function CajaDashboard({ register, movements, summary, userName, onReload, onClosed }: {
  register: import('../hooks/useCashRegister').CashRegister
  movements: import('../hooks/useCashRegister').CashMovement[]
  summary:   import('../hooks/useCashRegister').CashSummary
  userName:  string
  onReload:  () => void
  onClosed:  () => void
}) {
  const [showNewMovement, setShowNewMovement] = useState(false)
  const [showClose,       setShowClose]       = useState(false)

  const expectedBalance = register.initial_amount + summary.sales + summary.incomes - summary.expenses + summary.adjustments

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, Ruda, sans-serif)' }}>
              Caja
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.12)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>Abierta</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: MUTED, margin: '4px 0 0' }}>
            Por {register.opened_by_name} · Desde {new Date(register.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => setShowClose(true)}
          style={{ padding: '9px 18px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: RED, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Cerrar Caja
        </button>
      </div>

      {/* 5 KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
        <KpiCard label="Saldo Inicial" value={fmtARS(register.initial_amount)} icon={Wallet}      color="#6366f1" />
        <KpiCard label="Ventas"        value={fmtARS(summary.sales)}            icon={TrendingUp}  color={GREEN}   />
        <KpiCard label="Gastos"        value={fmtARS(summary.expenses)}         icon={TrendingDown} color={RED}    />
        <KpiCard label="Propinas"      value={fmtARS(summary.tips)}             icon={Coins}       color={AMBER}  />
      </div>
      <div style={{ marginBottom: 24 }}>
        <KpiCard label="Saldo Esperado" value={fmtARS(expectedBalance)} icon={ArrowUpDown} color={ACCENT} />
      </div>

      {/* New movement button */}
      <button
        onClick={() => setShowNewMovement(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: ACCENT, border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 24 }}
      >
        <Plus style={{ width: 18, height: 18 }} />
        Nuevo movimiento
      </button>

      {/* Movements table */}
      <div>
        <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, marginBottom: 12, margin: '0 0 12px' }}>
          MOVIMIENTOS DEL TURNO
        </h2>

        {movements.length === 0 ? (
          <div style={{ background: CARD, border: BDR, borderRadius: 16, padding: '32px 16px', textAlign: 'center', color: MUTED, fontSize: 14 }}>
            Sin movimientos en este turno
          </div>
        ) : (
          <div className="hidden lg:block" style={{ background: SURFACE, border: BDR, borderRadius: 16, overflow: 'hidden' }}>
            {/* Table header (desktop only) */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 140px 100px', gap: 0, padding: '10px 18px', borderBottom: BDR }}>
              {['Hora', 'Tipo', 'Descripción', 'Responsable', 'Monto'].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
              ))}
            </div>
            {movements.map((mv, i) => {
              const badge = movBadge(mv.type)
              const isLast = i === movements.length - 1
              return (
                <div
                  key={mv.id}
                  style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 140px 100px', gap: 0, padding: '14px 18px', borderBottom: isLast ? 'none' : BDR, alignItems: 'center' }}
                >
                  <span style={{ fontSize: 13, color: MUTED }}>{fmtDate(mv.created_at)}</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 6, padding: '2px 8px' }}>
                      {badge.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: TEXT, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mv.description}
                    {mv.category && <span style={{ color: MUTED, marginLeft: 6 }}>· {mv.category}</span>}
                  </span>
                  <span style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mv.created_by_name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: mv.type === 'expense' ? RED : GREEN, textAlign: 'right' }}>
                    {mv.type === 'expense' ? '-' : '+'}{fmtARS(mv.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile card list (shown on small screens via CSS) */}
      <div className="lg:hidden" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {movements.map(mv => {
          const badge = movBadge(mv.type)
          return (
            <div key={`m-${mv.id}`} style={{ background: CARD, border: BDR, borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 6, padding: '2px 8px' }}>{badge.label}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>{fmtDate(mv.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{mv.description}</p>
                {mv.category && <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>{mv.category}</p>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: mv.type === 'expense' ? RED : GREEN, flexShrink: 0, marginLeft: 12 }}>
                {mv.type === 'expense' ? '-' : '+'}{fmtARS(mv.amount)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Modals */}
      {showNewMovement && (
        <NewMovementModal
          registerId={register.id}
          restaurantId={register.restaurant_id}
          userName={userName}
          onClose={() => setShowNewMovement(false)}
          onSaved={onReload}
        />
      )}
      {showClose && (
        <CloseCashModal
          register={register}
          summary={summary}
          userName={userName}
          onClose={() => setShowClose(false)}
          onClosed={onClosed}
        />
      )}
    </>
  )
}

/* ── Historial de cierres ────────────────────────────────────────────── */

type HistorialView = 'turnos' | 'diario' | 'mensual'

interface ClosedRegister {
  id: string; restaurant_id: string
  opened_by_name: string; closed_by_name: string | null
  created_at: string; closed_at: string | null
  initial_amount: number; expected_amount: number | null
  final_counted_amount: number | null; difference: number | null
  notes: string | null
}

interface DailySummary {
  date: string
  sales: number; expenses: number; tips: number; refunds: number; courtesies: number; net: number
}

function useClosedRegisters(restaurantId: string) {
  const [registers, setRegisters] = useState<ClosedRegister[]>([])
  const [loading, setLoading]     = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await db
        .from('cash_registers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(100)
      setRegisters(data ?? [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { registers, loading }
}

function useDailySummaries(restaurantId: string) {
  const [data, setData] = useState<DailySummary[]>([])
  useEffect(() => {
    db.from('view_daily_finance')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data: rows }: any) => {
        setData((rows ?? []).map((r: any) => ({
          date:       r.date ?? '',
          sales:      Number(r.sales      ?? 0),
          expenses:   Number(r.expenses   ?? 0),
          tips:       Number(r.tips       ?? 0),
          refunds:    Number(r.refunds    ?? 0),
          courtesies: Number(r.courtesies ?? 0),
          net:        Number(r.net        ?? 0),
        })))
      })
      .catch(() => {})
  }, [restaurantId])
  return data
}

function CierreDetailModal({ reg, onClose }: { reg: ClosedRegister; onClose: () => void }) {
  const [movements, setMovements] = useState<any[]>([])
  const [loadingMv, setLoadingMv] = useState(true)

  useEffect(() => {
    db.from('cash_movements')
      .select('*')
      .eq('cash_register_id', reg.id)
      .order('created_at')
      .then(({ data }: any) => { setMovements(data ?? []); setLoadingMv(false) })
      .catch(() => setLoadingMv(false))
  }, [reg.id])

  const expected   = reg.expected_amount ?? reg.initial_amount
  const counted    = reg.final_counted_amount ?? 0
  const diff       = reg.difference ?? (counted - expected)
  const diffColor  = diff === 0 ? AMBER : diff > 0 ? GREEN : RED
  const diffLabel  = diff === 0 ? '±' : diff > 0 ? '+' : '-'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 540, background: SURFACE, borderRadius: 20, border: BDR, padding: 28, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>Detalle del cierre</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: BDR, borderRadius: 8, padding: '4px 8px', color: MUTED, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '4px 16px', marginBottom: 20 }}>
          {[
            { label: 'Abrió',     value: reg.opened_by_name },
            { label: 'Cerró',     value: reg.closed_by_name ?? '—' },
            { label: 'Apertura',  value: new Date(reg.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
            { label: 'Cierre',    value: reg.closed_at ? new Date(reg.closed_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—' },
            { label: 'Inicial',   value: fmtARS(reg.initial_amount) },
            { label: 'Esperado',  value: fmtARS(expected) },
            { label: 'Contado',   value: fmtARS(counted) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: BDR }}>
              <span style={{ fontSize: 13, color: MUTED }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Diferencia</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: diffColor }}>{diffLabel}{fmtARS(diff)}</span>
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, margin: '0 0 10px' }}>
          Movimientos ({movements.length})
        </p>
        {loadingMv ? (
          <div style={{ textAlign: 'center', padding: 20, color: MUTED }}>Cargando...</div>
        ) : movements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: MUTED, fontSize: 13 }}>Sin movimientos registrados</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movements.map(mv => {
              const badge = movBadge(mv.type)
              return (
                <div key={mv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 6, padding: '1px 7px' }}>{badge.label}</span>
                      <span style={{ fontSize: 11, color: MUTED }}>{fmtDate(mv.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: TEXT, margin: 0 }}>{mv.description}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: mv.type === 'expense' ? RED : GREEN, marginLeft: 12, flexShrink: 0 }}>
                    {mv.type === 'expense' ? '-' : '+'}{fmtARS(mv.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HistorialCierresSection({ restaurantId }: { restaurantId: string }) {
  const [view, setView] = useState<HistorialView>('turnos')
  const [selected, setSelected] = useState<ClosedRegister | null>(null)
  const { registers, loading } = useClosedRegisters(restaurantId)
  const dailySummaries = useDailySummaries(restaurantId)

  // Group registers by day for "diario" view
  const byDay = registers.reduce((acc, r) => {
    const d = (r.closed_at ?? r.created_at).slice(0, 10)
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {} as Record<string, ClosedRegister[]>)

  const days = Object.keys(byDay).sort().reverse()

  // Group by month for "mensual" view
  const byMonth = days.reduce((acc, d) => {
    const m = d.slice(0, 7)
    if (!acc[m]) acc[m] = []
    acc[m].push(...byDay[d])
    return acc
  }, {} as Record<string, ClosedRegister[]>)
  const months = Object.keys(byMonth).sort().reverse()

  const viewBtns: { id: HistorialView; label: string }[] = [
    { id: 'turnos',  label: 'Turnos'  },
    { id: 'diario',  label: 'Diario'  },
    { id: 'mensual', label: 'Mensual' },
  ]

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    background: active ? ACCENT : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : MUTED,
  })

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 8, padding: '14px 18px', cursor: 'pointer',
    transition: 'background 150ms',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <History style={{ width: 20, height: 20, color: ACCENT }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0, fontFamily: 'var(--font-ruda, sans-serif)' }}>
          Historial de cierres
        </h2>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {viewBtns.map(b => <button key={b.id} onClick={() => setView(b.id)} style={btnStyle(view === b.id)}>{b.label}</button>)}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>Cargando...</div>
      ) : registers.length === 0 ? (
        <div style={{ background: CARD, border: BDR, borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ color: TEXT, fontSize: 14 }}>Sin cierres registrados</p>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Los cierres aparecerán aquí cuando cierres la caja</p>
        </div>
      ) : view === 'turnos' ? (
        /* TURNOS — each register */
        <div style={{ background: SURFACE, border: BDR, borderRadius: 20, overflow: 'hidden' }}>
          {registers.map((reg, idx) => {
            const diff = reg.difference ?? 0
            const diffColor = diff === 0 ? AMBER : diff > 0 ? GREEN : RED
            const closeDate = reg.closed_at ? new Date(reg.closed_at) : null
            return (
              <div key={reg.id}
                style={{ ...rowStyle, borderBottom: idx < registers.length - 1 ? BDR : 'none' }}
                onClick={() => setSelected(reg)}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 2px' }}>
                    {closeDate ? closeDate.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                    Abrió {reg.opened_by_name}{reg.closed_by_name ? ` · Cerró ${reg.closed_by_name}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <span style={{ color: MUTED }}>Inicial </span>
                    <span style={{ color: TEXT, fontWeight: 600 }}>{fmtARS(reg.initial_amount)}</span>
                    <span style={{ color: MUTED, margin: '0 4px' }}>→</span>
                    <span style={{ color: TEXT, fontWeight: 600 }}>{fmtARS(reg.expected_amount ?? reg.initial_amount)}</span>
                    <span style={{ color: MUTED, margin: '0 4px' }}>→</span>
                    <span style={{ color: TEXT, fontWeight: 600 }}>{fmtARS(reg.final_counted_amount ?? 0)}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: diffColor, minWidth: 60, textAlign: 'right' }}>
                    {diff >= 0 ? '+' : ''}{fmtARS(diff)}
                  </span>
                  <ChevronRight style={{ width: 16, height: 16, color: MUTED, flexShrink: 0 }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : view === 'diario' ? (
        /* DIARIO — per day (from view_daily_finance or grouping) */
        <div style={{ background: SURFACE, border: BDR, borderRadius: 20, overflow: 'hidden' }}>
          {(dailySummaries.length > 0 ? dailySummaries : days.map(d => {
            const regs = byDay[d]
            const sales = regs.reduce((s, r) => s + (r.expected_amount ?? r.initial_amount), 0)
            return { date: d, sales, expenses: 0, tips: 0, refunds: 0, courtesies: 0, net: sales } as DailySummary
          })).map((day, idx, arr) => {
            const netColor = day.net >= 0 ? GREEN : RED
            return (
              <div key={day.date} style={{ ...rowStyle, borderBottom: idx < arr.length - 1 ? BDR : 'none', cursor: 'default' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 2px' }}>
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
                    Ventas {fmtARS(day.sales)} · Gastos {fmtARS(day.expenses)} · Propinas {fmtARS(day.tips)}
                  </p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: netColor }}>{fmtARS(day.net)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        /* MENSUAL */
        <div style={{ background: SURFACE, border: BDR, borderRadius: 20, overflow: 'hidden' }}>
          {months.map((month, idx) => {
            const regs = byMonth[month]
            const net  = regs.reduce((s, r) => s + (r.difference ?? 0), 0)
            const netColor = net >= 0 ? GREEN : RED
            const [yr, mo] = month.split('-')
            const label = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
            return (
              <div key={month} style={{ ...rowStyle, borderBottom: idx < months.length - 1 ? BDR : 'none', cursor: 'default' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: '0 0 2px', textTransform: 'capitalize' }}>{label}</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{regs.length} cierres de turno</p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: netColor }}>{net >= 0 ? '+' : ''}{fmtARS(net)}</span>
              </div>
            )
          })}
        </div>
      )}

      {selected && <CierreDetailModal reg={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */
export function CajaPage() {
  const { user }                           = useAuthStore()
  const { register, movements, summary, loading, reload, restaurantId } = useCashRegister()
  const [tab, setTab] = useState<'turno' | 'historial'>('turno')

  const userName = (user?.user_metadata?.full_name as string | undefined)
    || user?.email?.split('@')[0]
    || 'Dueño'

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!restaurantId) return null

  const tabBtn = (id: 'turno' | 'historial'): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: tab === id ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: tab === id ? TEXT : MUTED,
    transition: 'all 150ms',
  })

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, padding: '24px 0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 24, alignSelf: 'flex-start', width: 'fit-content' }}>
          <button style={tabBtn('turno')} onClick={() => setTab('turno')}>
            <Banknote style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Turno Actual
          </button>
          <button style={tabBtn('historial')} onClick={() => setTab('historial')}>
            <History style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Historial
          </button>
        </div>

        {tab === 'turno' ? (
          !register ? (
            <OpenRegisterPanel
              restaurantId={restaurantId}
              userName={userName}
              onOpened={reload}
            />
          ) : (
            <CajaDashboard
              register={register}
              movements={movements}
              summary={summary}
              userName={userName}
              onReload={reload}
              onClosed={reload}
            />
          )
        ) : (
          <HistorialCierresSection restaurantId={restaurantId} />
        )}
      </div>
    </div>
  )
}
