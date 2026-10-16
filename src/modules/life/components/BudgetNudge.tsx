import { useMemo } from 'react'
import { PiggyBank } from 'lucide-react'
import { colors, font } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import { useBudgets } from '../hooks/useBudgets'
import { useCategoryLabels } from '../hooks/useCategories'
import { budgetStatuses, monthOf, mostRelevant, type BudgetTx } from '../lib/budgets'
import { lifeNow } from '../lib/zonedTime'

/** Mi día, tarjeta del mes: una sola línea amable si algún presupuesto está cerca del tope o se pasó (el más relevante). */
export function BudgetNudge({ transactions, mainCurrency, locale }: {
  transactions: readonly BudgetTx[]
  mainCurrency: string
  locale: string
}) {
  const t = useLifeT()
  const { items } = useBudgets()
  const { labelOf } = useCategoryLabels()
  const s = useMemo(() => {
    if (!items.length) return null
    const now = lifeNow()   // fecha de la zona de la cuenta
    return mostRelevant(budgetStatuses(items, transactions, monthOf(now), now, mainCurrency))
  }, [items, transactions, mainCurrency])
  if (!s) return null
  const label = labelOf(s.budget.category)
  const money = (n: number) => formatMoney(n, s.budget.currency, locale)
  const text = s.state === 'over' ? t.budgets.overNow(label, money(s.over))
    : s.left === 0 ? t.budgets.nudgeReached(label)
    : t.budgets.nudgeLeft(label, money(s.left), s.daysLeft ?? 1)
  return (
    <p data-testid="budget-nudge" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontFamily: font, fontSize: '12.5px', color: colors.text.secondary, margin: '8px 0 0', lineHeight: 1.45 }}>
      <PiggyBank size={14} aria-hidden="true" style={{ color: colors.area.money, flexShrink: 0, marginTop: 1 }} />
      <span>{text}</span>
    </p>
  )
}
