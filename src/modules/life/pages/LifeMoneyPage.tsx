import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, TrendingUp, TrendingDown, Pencil, Trash2, Repeat, Pause, Play, FileUp, ChevronLeft, ChevronRight, Search, X, Users, CalendarClock } from 'lucide-react'
import { LifeScreenContainer, LifeCard, LifeSectionHeader, LifeEmptyState, colors, font, radius, stagger, fadeInUp, tint, ink } from '../design-system'
import { localDay, useMoney, type Transaction, type TransactionFormData } from '../hooks/useMoney'
import { useMoneySearch } from '../hooks/useMoneySearch'
import { categoryBreakdown, monthKeyOf, shiftMonth, type CategoryShare } from '../lib/moneyInsights'
import { useCategoryLabels } from '../hooks/useCategories'
import { TransactionSheet } from '../components/TransactionSheet'
import { nextDue, useRecurring, type RecurringTx } from '../hooks/useRecurring'
import { ActionMenu } from '../components/ActionMenu'
import { deleteWithUndo } from '../lib/undo'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { formatMoney } from '@/lib/currencies'
import toast from 'react-hot-toast'
import { featureOn } from '@/lib/features'
import { ImportBankSheet } from '../components/ImportBankSheet'
import { useInstallments, type InstallmentPlan } from '../hooks/useInstallments'
import { InstallmentsCard } from '../components/InstallmentsCard'
import { isInCourse, planName } from '../lib/installments'
import { localDateKey } from '../hooks/useRecurring'
import { newSplitId, useSplits } from '../hooks/useSplits'
import { SettleSheet, SharedCard } from '../components/SharedCard'
import { draftFromSplits, personSuggestions, type EditShared, type PersonBalance, type SplitDebt } from '../lib/splits'
import { daysUntil, type UpcomingTotals } from '../lib/moneyFuture'
import { doneWithUndo } from '../lib/undo'
import { useBudgets } from '../hooks/useBudgets'
import { BudgetsCard } from '../components/BudgetsCard'
import { BudgetSheet, type BudgetDraft } from '../components/BudgetSheet'
import { budgetStatuses, findBudget, type Budget } from '../lib/budgets'
import { lifeNow } from '../lib/zonedTime'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr: string, t: LifeDict, locale: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const today = lifeNow()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return t.money.today
  if (d.toDateString() === yesterday.toDateString()) return t.money.yesterday
  if (d.toDateString() === tomorrow.toDateString()) return t.money.tomorrow
  return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}) })
}


function monthLabel(key: string, locale: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString(locale, { month: 'long', ...(y !== lifeNow().getFullYear() ? { year: 'numeric' as const } : {}) })
}

function groupByDay(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    const key = localDay(tx.occurred_at)
    map.set(key, [...(map.get(key) ?? []), tx])
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => ({ date, items }))
}

const roundBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: radius.full, background: colors.surface.high,
  border: `1px solid ${colors.border.subtle}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ── Mes: ‹ septiembre › ──────────────────────────────────────────────────────
/** `maxMonth`: hasta dónde se avanza (el mes actual o el último con algo programado) */
function MonthSwitcher({ month, maxMonth, locale, onChange }: { month: string; maxMonth: string; locale: string; onChange: (m: string) => void }) {
  const t = useLifeT()
  const isCurrent = month >= maxMonth
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label={t.money.prevMonth} title={t.money.prevMonth} style={roundBtn}>
        {/* En árabe la fila se invierte y `flip-rtl` da vuelta la flecha (el `dir` está en LifeShell, no en <html>) */}
        <ChevronLeft size={18} className="flip-rtl" style={{ color: colors.text.secondary }} aria-hidden="true" />
      </button>
      <h2 aria-live="polite" style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: colors.text.primary, margin: 0, textTransform: 'capitalize' }}>
        {monthLabel(month, locale)}
      </h2>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} aria-label={t.money.nextMonth} title={t.money.nextMonth}
        style={{ ...roundBtn, opacity: isCurrent ? 0.35 : 1, cursor: isCurrent ? 'default' : 'pointer' }}>
        <ChevronRight size={18} className="flip-rtl" style={{ color: colors.text.secondary }} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Próximos: lo programado del mes, aparte (se suma al balance cuando llega su fecha) ──
function UpcomingCard({ items, locale }: { items: UpcomingTotals[]; locale: string }) {
  const t = useLifeT()
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="money-upcoming">
        <h2 id="money-upcoming" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 2px', textTransform: 'uppercase' }}>
          <CalendarClock size={12} aria-hidden="true" /> {t.money.upcomingTitle}
        </h2>
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 8px' }}>{t.money.upcomingHint}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(r => (
            <li key={r.currency} style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', fontFamily: font }}>
              <strong style={{ width: 44, fontSize: 13, color: colors.text.secondary }}>{r.currency}</strong>
              <span style={{ flex: 1, fontSize: 12, color: colors.text.tertiary }}>{t.money.upcomingCount(r.count)}</span>
              {r.income > 0 && (
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: colors.text.secondary }}>
                  <span className="sr-only">{t.money.income} </span>+{formatMoney(r.income, r.currency, locale)}
                </span>
              )}
              {r.expense > 0 && (
                <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: colors.text.secondary }}>
                  <span className="sr-only">{t.money.expense} </span>-{formatMoney(r.expense, r.currency, locale)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </LifeCard>
  )
}

// ── En qué se fue (gastos por categoría, moneda principal) ───────────────────
function CategoryCard({ items, currency, locale, prevMonthName, active, onPick, hasBudget, onBudget }: {
  items: CategoryShare[]; currency: string; locale: string; prevMonthName: string
  active: string | null; onPick: (cat: string) => void
  /** Presupuesto de la categoría elegida (en esta moneda): "Poner un presupuesto" o "Editar presupuesto" */
  hasBudget: (cat: string) => boolean; onBudget: (cat: string) => void
}) {
  const t = useLifeT()
  const { labelOf, colorOf } = useCategoryLabels()
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="money-by-category">
      <h2 id="money-by-category" style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 8px', textTransform: 'uppercase' }}>
        {t.money.byCategory} · {currency}
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(c => {
          const label = labelOf(c.category)
          const color = ink(colorOf(c.category))
          const pct = Math.round(c.share * 100)
          return (
            <li key={c.category}>
              <button type="button" onClick={() => onPick(c.category)} aria-pressed={active === c.category}
                aria-label={`${t.money.onlyCategory(label)}: ${formatMoney(c.amount, currency, locale)}, ${pct} %`}
                style={{
                  width: '100%', textAlign: 'start', background: active === c.category ? colors.surface.high : 'none',
                  border: 'none', borderRadius: radius.sm, padding: '6px 4px', cursor: 'pointer', fontFamily: font,
                }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.text.primary }}>{label}</span>
                  <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>{formatMoney(c.amount, currency, locale)}</span>
                  <span style={{ width: 40, textAlign: 'end', fontSize: 11, color: colors.text.tertiary }}>{pct} %</span>
                </span>
                <span aria-hidden="true" style={{ display: 'block', height: 6, borderRadius: radius.full, background: colors.surface.high, marginTop: 5, overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.max(2, pct)}%`, background: color, borderRadius: radius.full }} />
                </span>
                {c.change !== null && c.change !== 0 && (
                  <span style={{ display: 'block', fontSize: 11, marginTop: 3, color: colors.text.tertiary }}>
                    {c.change > 0 ? t.money.more(c.change, prevMonthName) : t.money.less(-c.change, prevMonthName)}
                  </span>
                )}
              </button>
              {active === c.category && (
                <button type="button" onClick={() => onBudget(c.category)}
                  style={{
                    margin: '2px 4px 4px', minHeight: 32, padding: '4px 12px', borderRadius: radius.full, cursor: 'pointer',
                    background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.ink,
                    fontFamily: font, fontSize: 12, fontWeight: 700,
                  }}>
                  {hasBudget(c.category) ? t.budgets.editFor : t.budgets.setFor}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      </section>
    </LifeCard>
  )
}

type Kind = 'all' | 'income' | 'expense'

function Chip({ pressed, onClick, children, label }: { pressed?: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={label}
      style={{
        padding: '6px 12px', borderRadius: radius.full, fontFamily: font, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: pressed ? colors.accent.soft : colors.surface.high,
        border: `1px solid ${pressed ? colors.accent.soft : colors.border.subtle}`,
        color: pressed ? colors.accent.ink : colors.text.secondary,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
      {children}
    </button>
  )
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
function TransactionRow({ tx, fallbackCurrency, locale, onEdit, onDelete, installmentsOf, shared, inDays }: {
  tx: Transaction
  /** Programado: días que faltan para su fecha (no cuenta en el balance hasta entonces) */
  inDays?: number
  /** Parte de una cuenta compartida */
  shared?: boolean
  fallbackCurrency: string
  locale: string
  /** Cantidad de cuotas de la compra, si el movimiento es una cuota ("3 de 12") */
  installmentsOf?: number
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useLifeT()
  const isIncome = tx.type === 'income'
  const scheduled = !!inDays && inDays > 0
  // Lo programado va en tono neutro: todavía no pasó
  const amountColor = scheduled ? colors.text.secondary : isIncome ? colors.semantic.success : colors.semantic.error
  const { labelOf } = useCategoryLabels()
  const category = labelOf(tx.category)

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
          {shared && <Users size={11} aria-label={t.shared.badge} style={{ display: 'inline', marginInlineEnd: 5, verticalAlign: '-1px', color: colors.text.tertiary }} />}
          {tx.recurring_id && <Repeat size={11} aria-label={t.recurring.badge} style={{ display: 'inline', marginInlineEnd: 5, verticalAlign: '-1px', color: colors.text.tertiary }} />}
          {tx.description || category}
        </p>
        {tx.description && (
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 500, color: colors.text.tertiary, margin: 0 }}>
            {category}
          </p>
        )}
      </div>

      {scheduled && (
        <span role="img" aria-label={`${t.money.scheduled}, ${t.money.inDays(inDays)}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.secondary, background: colors.surface.high, borderRadius: radius.full, padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <CalendarClock size={11} aria-hidden="true" /> {t.money.inDays(inDays)}
        </span>
      )}

      {installmentsOf && tx.installment_no ? (
        <span role="img" aria-label={t.installments.badgeLabel(tx.installment_no, installmentsOf)}
          style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.secondary, background: colors.surface.high, borderRadius: radius.full, padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {t.installments.badge(tx.installment_no, installmentsOf)}
        </span>
      ) : null}

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

// ── Fijos del mes (se repiten cada mes) ─────────────────────────────────────
function FixedCard({ items, locale, onEdit, onToggle, onDelete }: {
  items: RecurringTx[]
  locale: string
  onEdit: (r: RecurringTx) => void
  onToggle: (r: RecurringTx) => void
  onDelete: (r: RecurringTx) => void
}) {
  const t = useLifeT()
  const r = t.recurring
  const { labelOf } = useCategoryLabels()
  const dateLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="fixed-title">
        <h2 id="fixed-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 2px', textTransform: 'uppercase' }}>
          <Repeat size={12} aria-hidden="true" /> {r.title}
        </h2>
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 6px' }}>{r.subtitle}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map(item => {
            const isIncome = item.type === 'income'
            const name = item.description || labelOf(item.category)
            return (
              <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}`, opacity: item.active ? 1 : 0.6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text.primary, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                  <p style={{ fontFamily: font, fontSize: 11, color: colors.text.tertiary, margin: 0 }}>
                    {item.active ? `${r.schedule(item.day_of_month)} · ${r.next(dateLabel(nextDue(item)))}` : r.paused}
                  </p>
                </div>
                <span dir="ltr" style={{ fontFamily: font, fontSize: 14, fontWeight: 800, flexShrink: 0, color: isIncome ? colors.semantic.success : colors.semantic.error }}>
                  {isIncome ? '+' : '-'}{formatMoney(item.amount, item.currency, locale)}
                </span>
                <ActionMenu label={`${r.options}: ${name}`} actions={[
                  { icon: Pencil, label: t.common.edit, onSelect: () => onEdit(item) },
                  item.active
                    ? { icon: Pause, label: r.pause, onSelect: () => onToggle(item) }
                    : { icon: Play, label: r.resume, onSelect: () => onToggle(item) },
                  { icon: Trash2, label: t.common.delete, onSelect: () => onDelete(item), danger: true },
                ]} />
              </li>
            )
          })}
        </ul>
      </section>
    </LifeCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LifeMoneyPage() {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const [month, setMonth] = useState(() => monthKeyOf(lifeNow()))
  const {
    transactions, previous, loading, mainCurrency, upcoming, upcomingTotals, maxMonth, today: todayKey,
    monthIncome, monthExpense, monthBalance, monthCurve, otherTotals,
    hasData, everHasData, reload, createTransaction, updateTransaction, deleteTransaction, hideTransaction,
  } = useMoney(month)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind>('all')
  const [cat, setCat] = useState<string | null>(null)
  const { labelOf, allKeys } = useCategoryLabels()
  const search = useMoneySearch(query, labelOf, allKeys)
  const searchingAll = search.results !== null || search.searching
  const breakdown = useMemo(() => categoryBreakdown(transactions, previous, mainCurrency), [transactions, previous, mainCurrency])
  // La lista muestra también lo programado del mes (marcado); los totales, sólo lo que ya llegó
  const shown = useMemo(() => (search.results ?? [...upcoming, ...transactions])
    .filter(tx => kind === 'all' || tx.type === kind)
    .filter(tx => !cat || tx.category === cat), [search.results, upcoming, transactions, kind, cat])
  const grouped = useMemo(() => groupByDay(shown), [shown])
  const isCurrentMonth = month === todayKey.slice(0, 7)

  const fixed = useRecurring()
  const plans = useInstallments()
  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editTx, setEditTx]             = useState<Transaction | null>(null)
  const [editFixed, setEditFixed]       = useState<RecurringTx | null>(null)
  const [importOpen, setImportOpen]     = useState(false)
  const [canImport] = useState(() => featureOn('bankImport'))
  const splits = useSplits()
  const [settling, setSettling] = useState<PersonBalance | null>(null)
  // Al editar un movimiento: cómo está su parte compartida (si las deudas todavía no cargaron, no se toca)
  const [editShared, setEditShared] = useState<EditShared>({ kind: 'none' })
  const knownPeople = useMemo(() => personSuggestions(splits.items, '', [], 30), [splits.items])
  const budgets = useBudgets()
  const [budgetDraft, setBudgetDraft] = useState<BudgetDraft | null>(null)
  const budgetRows = useMemo(
    // Hoy de la zona de la cuenta, como fecha de calendario
    () => budgetStatuses(budgets.items, transactions, month, new Date(`${todayKey}T12:00:00`), mainCurrency),
    [budgets.items, transactions, month, mainCurrency, todayKey],
  )

  if (loading && !everHasData && !transactions.length) return <MoneySkeleton />

  const balanceColor = monthBalance >= 0 ? colors.semantic.success : colors.semantic.error
  const monthName = monthLabel(month, locale)
  const prevMonthName = monthLabel(shiftMonth(month, -1), locale)
  const changeMonth = (m: string) => { setMonth(m); setCat(null) }
  const openNew = () => { setEditTx(null); setEditFixed(null); setEditShared({ kind: 'none' }); setSheetOpen(true) }
  const openEdit = (tx: Transaction) => {
    setEditFixed(null)
    setEditTx(tx)
    setEditShared(splits.loading ? { kind: 'locked' } : draftFromSplits(Number(tx.amount), splits.forTransaction(tx.id)))
    setSheetOpen(true)
  }
  /** Edita el movimiento y, si es (o pasa a ser) compartido, recalcula sus deudas pendientes. */
  const saveEdit = async (tx: Transaction, data: TransactionFormData, debts: SplitDebt[]) => {
    await updateTransaction(tx.id, data)
    // Nada que tocar: ya se saldó algo, o no era ni pasa a ser compartido
    if (editShared.kind === 'locked' || (editShared.kind === 'none' && !debts.length)) return
    try {
      const res = await splits.applyEdit(tx.id, debts, data.currency, data.description || labelOf(data.category))
      if (res.removedAll) doneWithUndo({ message: t.shared.unshared, undo: res.undo })
    } catch (e) {
      // Las deudas no se pudieron cambiar: el movimiento vuelve a como estaba (no queda a medias)
      await updateTransaction(tx.id, {
        type: tx.type, amount: Number(tx.amount), category: tx.category, description: tx.description ?? undefined,
        currency: tx.currency, occurred_at: tx.occurred_at, goal_id: tx.goal_id ?? null,
      }).catch(() => {})
      throw e
    }
  }
  const fail = () => toast.error(t.common.saveError)
  const fixedAsTx = (r: RecurringTx): Transaction => ({
    id: r.id, type: r.type, amount: r.amount, category: r.category ?? 'Otros', description: r.description,
    currency: r.currency, occurred_at: nextDue(r), goal_id: r.goal_id,
  })
  const removeFixed = (r: RecurringTx) => {
    fixed.hide(r.id)
    const what = r.description || labelOf(r.category)
    deleteWithUndo({ message: t.recurring.removed(what), commit: () => fixed.remove(r.id), restore: () => void fixed.reload() })
  }
  const planSize = new Map(plans.items.map(p => [p.id, p.installments]))
  const today = localDateKey()
  const plansInCourse = plans.items.filter(p => isInCourse(p, today))
  const cancelPlan = (p: InstallmentPlan) => {
    plans.cancel(p.id).then(() => toast.success(t.installments.cancelled(planName(labelOf, p)))).catch(fail)
  }
  const removePlan = (p: InstallmentPlan) => {
    plans.hide(p.id)
    for (const g of grouped) for (const tx of g.items) if (tx.installment_plan_id === p.id) hideTransaction(tx.id)
    deleteWithUndo({
      message: t.installments.removed(planName(labelOf, p)),
      commit: () => plans.remove(p.id),
      restore: () => { void plans.reload(); void reload() },
    })
  }
  const remove = (tx: Transaction) => {
    hideTransaction(tx.id)
    const what = `${tx.description || labelOf(tx.category)} · ${formatMoney(Number(tx.amount), tx.currency || mainCurrency, locale)}`
    // Un gasto compartido se lleva sus deudas pendientes (las saldadas quedan)
    const pendingSplits = splits.pendingFor(tx.id)
    splits.hide(pendingSplits)
    deleteWithUndo({
      message: t.undo.deleted(what),
      commit: async () => { await splits.remove(pendingSplits); await deleteTransaction(tx.id) },
      restore: () => { void reload(); void splits.reload() },
    })
  }
  const removeShared = (b: PersonBalance) => {
    const ids = b.items.map(i => i.id)
    splits.hide(ids)
    deleteWithUndo({ message: t.shared.removed(b.person), commit: () => splits.remove(ids), restore: () => void splits.reload() })
  }
  const openBudget = (category: string) => {
    const existing = findBudget(budgets.items, category, mainCurrency)
    setBudgetDraft(existing ? { editing: existing } : { editing: null, category, currency: mainCurrency })
  }
  const saveBudget = async (category: string, currency: string, amount: number) => {
    const target = budgetDraft?.editing ?? findBudget(budgets.items, category, currency)
    if (target) await budgets.setAmount(target.id, amount)
    else await budgets.create(category, currency, amount)
    toast.success(t.budgets.saved)
  }
  const removeBudget = (b: Budget) => {
    budgets.hide(b.id)
    deleteWithUndo({ message: t.budgets.removed(labelOf(b.category)), commit: () => budgets.remove(b.id), restore: () => void budgets.reload() })
  }
  const settle = async (b: PersonBalance, income: number, record: boolean) => {
    const undo = await splits.settle(b, income, { record, description: t.shared.repaidDesc(b.person) })
    doneWithUndo({ message: t.shared.settled(b.person), undo })
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
        <div style={{ display: 'flex', gap: 8 }}>
        {canImport && (
          <button type="button" onClick={() => setImportOpen(true)} aria-label={t.bankImport.action} title={t.bankImport.action}
            style={{
              width: 40, height: 40, borderRadius: radius.full, background: colors.surface.high,
              border: `1px solid ${colors.border.subtle}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <FileUp size={17} style={{ color: colors.text.secondary }} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={openNew} aria-label={t.money.add} title={t.money.add}
          style={{
            width: 40, height: 40, borderRadius: radius.full,
            background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Plus size={18} style={{ color: colors.accent.ink }} strokeWidth={2.5} aria-hidden="true" />
        </button>
        </div>
      </div>

      {everHasData && <MonthSwitcher month={month} maxMonth={maxMonth} locale={locale} onChange={changeMonth} />}

      {/* Balance del mes en la moneda principal (sólo lo que ya llegó) */}
      {transactions.length > 0 && (
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
                  {r.income > 0 ? '+' : ''}{formatMoney(r.income, r.currency, locale)} · {r.expense > 0 ? '-' : ''}{formatMoney(r.expense, r.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        </LifeCard>
      )}

      {upcomingTotals.length > 0 && !searchingAll && <UpcomingCard items={upcomingTotals} locale={locale} />}

      {breakdown.length > 0 && !searchingAll && (
        <CategoryCard items={breakdown} currency={mainCurrency} locale={locale} prevMonthName={prevMonthName}
          active={cat} onPick={c => setCat(prev => (prev === c ? null : c))}
          hasBudget={c => !!findBudget(budgets.items, c, mainCurrency)} onBudget={openBudget} />
      )}

      {everHasData && budgets.loaded && !searchingAll && (
        <BudgetsCard statuses={budgetRows} locale={locale} monthName={monthName}
          onAdd={() => setBudgetDraft({ editing: null, currency: mainCurrency })}
          onEdit={b => setBudgetDraft({ editing: b })} onDelete={removeBudget} />
      )}

      {isCurrentMonth && fixed.items.length > 0 && (
        <FixedCard items={fixed.items} locale={locale}
          onEdit={r => { setEditTx(null); setEditFixed(r); setSheetOpen(true) }}
          onToggle={r => { fixed.setActive(r, !r.active).catch(fail) }}
          onDelete={removeFixed} />
      )}

      {isCurrentMonth && plansInCourse.length > 0 && (
        <InstallmentsCard plans={plansInCourse} locale={locale} onCancel={cancelPlan} onDelete={removePlan} />
      )}
      {splits.byPerson.length > 0 && (
        <SharedCard items={splits.byPerson} locale={locale} onSettle={setSettling} onDelete={removeShared} />
      )}

      {everHasData && (
        <div role="search" style={{ marginBottom: 12 }}>
          {/* Sin posicionar (nada de position: relative): así los menús "⋯" de arriba quedan por encima */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', borderRadius: radius.full,
            background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
          }}>
            <span className="sr-only">{t.money.search}</span>
            <Search size={16} aria-hidden="true" style={{ color: colors.text.tertiary, flexShrink: 0 }} />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t.money.searchPlaceholder}
              style={{
                flex: 1, minWidth: 0, padding: '11px 0', background: 'transparent', border: 'none', color: colors.text.primary,
                fontFamily: font, fontSize: 16, outline: 'none',
              }} />
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <Chip pressed={kind === 'all'} onClick={() => setKind('all')}>{t.money.all}</Chip>
            <Chip pressed={kind === 'income'} onClick={() => setKind('income')}>{t.money.income}</Chip>
            <Chip pressed={kind === 'expense'} onClick={() => setKind('expense')}>{t.money.expense}</Chip>
            {cat && (
              <Chip pressed onClick={() => setCat(null)} label={t.money.clearCategory(labelOf(cat))}>
                {labelOf(cat)} <X size={12} aria-hidden="true" />
              </Chip>
            )}
          </div>
          {searchingAll && (
            <p role="status" style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '8px 0 0' }}>
              {search.searching ? t.money.searching
                : shown.length ? `${t.money.results(shown.length)}${search.limited ? ` ${t.money.resultsLimited}` : ''}`
                : t.money.noResults}
            </p>
          )}
        </div>
      )}

      {!everHasData ? (
        <LifeCard>
          <LifeEmptyState
            icon={Wallet}
            iconColor={colors.area.money}
            title={t.money.emptyTitle}
            subtitle={t.money.emptyText}
            action={{ label: t.money.emptyAction, onClick: openNew }}
          />
        </LifeCard>
      ) : !grouped.length ? (
        !searchingAll && (
          <LifeCard>
            <p style={{ fontFamily: font, fontSize: 14, color: colors.text.secondary, margin: 0, textAlign: 'center', padding: '12px 0' }}>
              {hasData ? t.money.noneFiltered : t.money.emptyMonth(monthName)}
            </p>
          </LifeCard>
        )
      ) : (
        <motion.div key={`${month}|${query}|${kind}|${cat}`} variants={stagger} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      <TransactionRow key={tx.id} tx={tx} fallbackCurrency={mainCurrency} locale={locale} shared={splits.sharedTxIds.has(tx.id)}
                        inDays={daysUntil(group.date, todayKey)}
                        onEdit={() => openEdit(tx)}
                        onDelete={() => remove(tx)}
                        installmentsOf={tx.installment_plan_id ? planSize.get(tx.installment_plan_id) : undefined} />
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

      {canImport && <ImportBankSheet open={importOpen} onClose={() => setImportOpen(false)} />}

      <TransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editFixed ? fixedAsTx(editFixed) : editTx}
        repeatable
        template={!!editFixed}
        shareable
        editShared={editTx && !editFixed ? editShared : undefined}
        knownPeople={knownPeople}
        onSave={async (data, repeat, installments, shared) => {
          if (editFixed) await fixed.update(editFixed.id, data)
          else if (editTx) await saveEdit(editTx, data, shared?.debts ?? [])
          else if (installments) await plans.create(data, installments)
          else if (repeat) await fixed.create(data)
          else if (shared?.debts.length) {
            // Gasto compartido: el movimiento (con id del cliente) y sus deudas; si las deudas fallan, no queda a medias
            const id = newSplitId()
            // Sin conexión no se deja en la cola (las deudas no se podrían guardar): falla y se avisa
            await createTransaction({ ...data, id }, { queue: false })
            try {
              await splits.create(id, data.currency, shared.debts, data.description || labelOf(data.category))
            } catch (e) {
              await deleteTransaction(id).catch(() => {})
              throw e
            }
          }
          else await createTransaction(data)
        }}
      />

      <SettleSheet balance={settling} locale={locale} onClose={() => setSettling(null)} onConfirm={settle} />

      <BudgetSheet draft={budgetDraft} budgets={budgets.items} onClose={() => setBudgetDraft(null)} onSave={saveBudget} />

    </LifeScreenContainer>
  )
}
