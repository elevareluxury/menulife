import { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius, stagger, fadeInUp, tint } from '../design-system'
import { useMoney, type Transaction } from '../hooks/useMoney'
import { TransactionSheet } from '../components/TransactionSheet'
import { ActionMenu } from '../components/ActionMenu'
import { deleteWithUndo } from '../lib/undo'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { formatMoney } from '@/lib/currencies'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr: string, t: LifeDict, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t.money.today
  if (d.toDateString() === yesterday.toDateString()) return t.money.yesterday
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}

const categoryLabel = (t: LifeDict, cat: string) => t.categories[cat] ?? cat

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

// ── Sparkline (se adapta al ancho disponible) ────────────────────────────────
function Sparkline({ curve, color }: { curve: number[]; color: string }) {
  const W = 240, H = 44
  if (curve.length < 2) return null
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
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true"
      style={{ width: '100%', height: H, display: 'block', marginTop: 14, overflow: 'visible' }}>
      <defs>
        <linearGradient id="moneySparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#moneySparkGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({ tx, fallbackCurrency, locale, onEdit, onDelete }: {
  tx: Transaction
  fallbackCurrency: string
  locale: string
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useLifeT()
  const isIncome = tx.type === 'income'
  const amountColor = isIncome ? colors.semantic.success : colors.semantic.error
  const category = categoryLabel(t, tx.category)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
      <div style={{
        width: 34, height: 34, borderRadius: radius.sm, flexShrink: 0,
        background: isIncome ? `${tint(colors.semantic.success, 8)}` : `${tint(colors.semantic.error, 8)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isIncome
          ? <TrendingUp size={14} style={{ color: colors.semantic.success }} strokeWidth={2.5} aria-hidden="true" />
          : <TrendingDown size={14} style={{ color: colors.semantic.error }} strokeWidth={2.5} aria-hidden="true" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: font, fontSize: '13px', fontWeight: 600, color: colors.text.primary,
          margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tx.description || category}
        </p>
        {tx.description && (
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 500, color: colors.text.tertiary, margin: 0 }}>
            {category}
          </p>
        )}
      </div>

      <span style={{ fontFamily: font, fontSize: '14px', fontWeight: 800, color: amountColor, flexShrink: 0 }} dir="ltr">
        {isIncome ? '+' : '-'}{formatMoney(Number(tx.amount), tx.currency || fallbackCurrency, locale)}
      </span>

      <ActionMenu label={t.money.options} actions={[
        { icon: Pencil, label: t.common.edit, onSelect: onEdit },
        { icon: Trash2, label: t.common.delete, onSelect: onDelete, danger: true },
      ]} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeMoneyPage() {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const {
    grouped, loading, mainCurrency,
    monthIncome, monthExpense, monthBalance, monthCurve, otherTotals,
    hasData, reload, createTransaction, updateTransaction, deleteTransaction, hideTransaction,
  } = useMoney()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editTx, setEditTx]             = useState<Transaction | null>(null)

  if (loading) return <MoneySkeleton />

  const balanceColor = monthBalance >= 0 ? colors.semantic.success : colors.semantic.error
  const monthName = new Date().toLocaleDateString(locale, { month: 'long' })
  const openNew = () => { setEditTx(null); setSheetOpen(true) }
  const remove = (tx: Transaction) => {
    hideTransaction(tx.id)
    const what = `${tx.description || categoryLabel(t, tx.category)} · ${formatMoney(Number(tx.amount), tx.currency || mainCurrency, locale)}`
    deleteWithUndo({ message: t.undo.deleted(what), commit: () => deleteTransaction(tx.id), restore: () => void reload() })
  }

  return (
    <LifeScreenContainer>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, borderRadius: '14px', background: `${tint(colors.area.money, 9)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} style={{ color: colors.area.money }} strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 style={{ fontFamily: font, fontSize: '26px', fontWeight: 800, color: colors.text.primary, margin: 0 }}>
            {t.money.title}
          </h1>
        </div>
        <button type="button" onClick={openNew} aria-label={t.money.add} title={t.money.add}
          style={{
            width: 40, height: 40, borderRadius: radius.full,
            background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Plus size={18} style={{ color: colors.accent.ink }} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* Balance del mes en la moneda principal */}
      {hasData && (
        <LifeCard style={{ marginBottom: '12px' }}>
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 6px', textTransform: 'uppercase' }}>
            {t.money.balance(monthName)} · {mainCurrency}
          </p>
          <motion.p key={monthBalance} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} dir="ltr"
            style={{ fontFamily: font, fontSize: '32px', fontWeight: 800, color: balanceColor, margin: '0 0 12px', lineHeight: 1, textAlign: 'start' }}>
            {formatMoney(monthBalance, mainCurrency, locale)}
          </motion.p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.semantic.success }}>
              <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" />
              <span className="sr-only">{t.money.income}</span>{formatMoney(monthIncome, mainCurrency, locale)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: font, fontSize: '12px', fontWeight: 700, color: colors.semantic.error }}>
              <TrendingDown size={12} strokeWidth={2.5} aria-hidden="true" />
              <span className="sr-only">{t.money.expense}</span>{formatMoney(monthExpense, mainCurrency, locale)}
            </span>
          </div>
          <Sparkline curve={monthCurve} color={balanceColor} />
        </LifeCard>
      )}

      {/* Otras monedas: cada una por separado, sin convertir */}
      {otherTotals.length > 0 && (
        <LifeCard style={{ marginBottom: '12px' }}>
          <LifeSectionHeader title={t.money.otherCurrencies} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherTotals.map(r => (
              <div key={r.currency} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: font }}>
                <strong style={{ width: 44, fontSize: 13, color: colors.text.secondary }}>{r.currency}</strong>
                <span dir="ltr" style={{ flex: 1, fontSize: 15, fontWeight: 800, color: r.balance >= 0 ? colors.semantic.success : colors.semantic.error }}>
                  {formatMoney(r.balance, r.currency, locale)}
                </span>
                <span dir="ltr" style={{ fontSize: 11, color: colors.text.tertiary }}>
                  +{formatMoney(r.income, r.currency, locale)} · -{formatMoney(r.expense, r.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        </LifeCard>
      )}

      {!hasData ? (
        <LifeCard>
          <LifeEmptyState
            icon={Wallet}
            iconColor={colors.area.money}
            title={t.money.emptyTitle}
            subtitle={t.money.emptyText}
            action={{ label: t.money.emptyAction, onClick: openNew }}
          />
        </LifeCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {grouped.map(group => {
            const currencies = new Set(group.items.map(i => i.currency || mainCurrency))
            const single = currencies.size === 1 ? [...currencies][0] : null
            const dayTotal = group.items.reduce((s, i) => s + (i.type === 'income' ? Number(i.amount) : -Number(i.amount)), 0)
            return (
              <motion.div key={group.date} variants={fadeInUp}>
                <LifeCard>
                  <LifeSectionHeader title={formatDateLabel(group.date, t, locale)} />
                  <div>
                    {group.items.map(tx => (
                      <TransactionRow key={tx.id} tx={tx} fallbackCurrency={mainCurrency} locale={locale}
                        onEdit={() => { setEditTx(tx); setSheetOpen(true) }}
                        onDelete={() => remove(tx)} />
                    ))}
                  </div>
                  {group.items.length > 1 && single && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                      <span dir="ltr" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: dayTotal >= 0 ? colors.semantic.success : colors.semantic.error }}>
                        {dayTotal >= 0 ? '+' : ''}{formatMoney(dayTotal, single, locale)} {t.money.net}
                      </span>
                    </div>
                  )}
                </LifeCard>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      <TransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editTx}
        onSave={async data => {
          if (editTx) await updateTransaction(editTx.id, data)
          else await createTransaction(data)
        }}
      />

    </LifeScreenContainer>
  )
}
