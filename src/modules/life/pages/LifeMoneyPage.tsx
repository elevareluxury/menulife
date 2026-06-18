import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Plus, TrendingUp, TrendingDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, LifeConfirmDialog,
  colors, font, radius, stagger, fadeInUp, scaleIn,
} from '../design-system'
import { useMoney, buildMonthCurve, type Transaction } from '../hooks/useMoney'
import { TransactionSheet } from '../components/TransactionSheet'
import { useLocaleStore } from '@/store/localeStore'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('es', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function MoneySkeleton() {
  return (
    <LifeScreenContainer>
      <motion.div animate={{ opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        {[100, 64, 64, 64].map((h, i) => (
          <div key={i} style={{
            height: h, background: colors.surface.base, borderRadius: radius.xl,
            marginBottom: '10px', border: `1px solid ${colors.border.subtle}`,
          }} />
        ))}
      </motion.div>
    </LifeScreenContainer>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ curve, color }: { curve: number[]; color: string }) {
  const W = 240, H = 44
  if (curve.length < 2) {
    return <div style={{ width: W, height: H }} />
  }

  const min = Math.min(...curve)
  const max = Math.max(...curve)
  const range = max - min || 1

  const pts = curve.map((v, i) => ({
    x: (i / (curve.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 8) - 4,
  }))

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${d} L${W},${H} L0,${H} Z`

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r={3} fill={color}
      />
    </svg>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({ tx, currency, onEdit, onDelete }: {
  tx: Transaction
  currency: string
  onEdit: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isIncome = tx.type === 'income'
  const amountColor = isIncome ? colors.semantic.success : colors.semantic.error

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 0',
      borderBottom: `1px solid ${colors.border.subtle}`,
    }}>
      {/* Type icon */}
      <div style={{
        width: 34, height: 34, borderRadius: radius.sm, flexShrink: 0,
        background: isIncome ? `${colors.semantic.success}14` : `${colors.semantic.error}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isIncome
          ? <TrendingUp size={14} style={{ color: colors.semantic.success }} strokeWidth={2.5} />
          : <TrendingDown size={14} style={{ color: colors.semantic.error }} strokeWidth={2.5} />
        }
      </div>

      {/* Description + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: font, fontSize: '13px', fontWeight: 600, color: colors.text.primary,
          margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tx.description || tx.category}
        </p>
        {tx.description && (
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 500, color: colors.text.quaternary, margin: 0 }}>
            {tx.category}
          </p>
        )}
      </div>

      {/* Amount */}
      <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 800, color: amountColor, flexShrink: 0 }}>
        {isIncome ? '+' : '-'}{formatAmount(Number(tx.amount), currency)}
      </span>

      {/* Context menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          style={{
            width: 26, height: 26, borderRadius: radius.full,
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.text.quaternary, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
              style={{
                position: 'absolute', right: 0, top: '30px', zIndex: 10,
                background: colors.surface.high,
                border: `1px solid ${colors.border.medium}`,
                borderRadius: radius.md,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 130, overflow: 'hidden',
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {[
                { icon: Pencil, label: 'Editar',   action: () => { setMenuOpen(false); onEdit() } },
                { icon: Trash2, label: 'Eliminar', action: () => { setMenuOpen(false); onDelete() }, danger: true },
              ].map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: font, fontSize: '13px', fontWeight: 600,
                    color: danger ? colors.semantic.error : colors.text.secondary,
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = colors.border.subtle }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeMoneyPage() {
  const { currency } = useLocaleStore()
  const {
    transactions, grouped, loading,
    monthIncome, monthExpense, monthBalance,
    hasData, createTransaction, updateTransaction, deleteTransaction,
  } = useMoney()

  // Re-compute curve from this month's transactions for the sparkline
  const sparkCurve = useMemo(() => {
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthTxs = transactions.filter(t => t.occurred_at.startsWith(monthStr))
    return buildMonthCurve(monthTxs)
  }, [transactions])

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editTx, setEditTx]             = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  if (loading) return <MoneySkeleton />

  const balanceColor = monthBalance >= 0 ? colors.semantic.success : colors.semantic.error
  const monthName = new Date().toLocaleDateString('es', { month: 'long' })

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${colors.area.money}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} style={{ color: colors.area.money }} strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            Money
          </h1>
        </div>
        <button
          onClick={() => { setEditTx(null); setSheetOpen(true) }}
          style={{
            width: 36, height: 36, borderRadius: radius.full,
            background: colors.accent.soft,
            border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Plus size={18} style={{ color: colors.accent.default }} strokeWidth={2.5} />
        </button>
      </div>

      {/* Monthly balance hero */}
      {hasData && (
        <LifeCard style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.quaternary, letterSpacing: '0.08em', margin: '0 0 6px' }}>
                BALANCE {monthName.toUpperCase()}
              </p>
              <motion.p
                key={monthBalance}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ fontFamily: font, fontSize: '32px', fontWeight: 800, color: balanceColor, margin: '0 0 12px', lineHeight: 1 }}
              >
                {monthBalance >= 0 ? '' : '-'}{formatAmount(Math.abs(monthBalance), currency)}
              </motion.p>

              {/* Income / Expense row */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <TrendingUp size={12} style={{ color: colors.semantic.success }} strokeWidth={2.5} />
                  <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.semantic.success }}>
                    {formatAmount(monthIncome, currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <TrendingDown size={12} style={{ color: colors.semantic.error }} strokeWidth={2.5} />
                  <span style={{ fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.semantic.error }}>
                    {formatAmount(monthExpense, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sparkline */}
            {sparkCurve.length >= 2 && (
              <div style={{ flexShrink: 0 }}>
                <Sparkline curve={sparkCurve} color={balanceColor} />
              </div>
            )}
          </div>
        </LifeCard>
      )}

      {/* Transaction list or empty state */}
      {!hasData ? (
        <LifeCard>
          <LifeEmptyState
            icon={Wallet}
            iconColor={colors.area.money}
            title="Tu dinero, visible"
            subtitle="Registrá ingresos y gastos para ver hacia dónde va tu energía financiera."
            action={{ label: 'Agregar primer movimiento', onClick: () => { setEditTx(null); setSheetOpen(true) } }}
          />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {grouped.map(group => (
            <motion.div key={group.date} variants={fadeInUp}>
              <LifeCard>
                <LifeSectionHeader title={formatDateLabel(group.date)} />
                <div>
                  {group.items.map(tx => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      currency={currency}
                      onEdit={() => { setEditTx(tx); setSheetOpen(true) }}
                      onDelete={() => setDeleteTarget(tx)}
                    />
                  ))}
                </div>
                {/* Day total */}
                {group.items.length > 1 && (() => {
                  const dayTotal = group.items.reduce((s, t) =>
                    s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0)
                  const c = dayTotal >= 0 ? colors.semantic.success : colors.semantic.error
                  return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                      <span style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: c }}>
                        {dayTotal >= 0 ? '+' : ''}{formatAmount(dayTotal, currency)} neto
                      </span>
                    </div>
                  )
                })()}
              </LifeCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Transaction Sheet */}
      <TransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editTx}
        onSave={async data => {
          if (editTx) await updateTransaction(editTx.id, data)
          else await createTransaction(data)
        }}
      />

      {/* Delete Confirm */}
      <LifeConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar movimiento?"
        message={deleteTarget
          ? `${deleteTarget.type === 'income' ? 'Ingreso' : 'Gasto'} de ${formatAmount(Number(deleteTarget.amount), currency)} en ${deleteTarget.category}.`
          : ''
        }
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteTarget) await deleteTransaction(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </LifeScreenContainer>
  )
}
