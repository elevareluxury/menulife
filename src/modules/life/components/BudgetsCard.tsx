import { PiggyBank, Plus, Pencil, Trash2 } from 'lucide-react'
import { LifeCard, colors, font, radius, ink } from '../design-system'
import { useLifeT, type LifeDict } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import { ActionMenu } from './ActionMenu'
import { useCategoryLabels } from '../hooks/useCategories'
import type { Budget, BudgetStatus } from '../lib/budgets'

/**
 * Frase amable de un presupuesto en el mes que se mira. Mes en curso: lo que queda y cuánto por día; si se pasó, cuánto
 * más de lo previsto (sin rojo ni "te pasaste"). Mes pasado: sólo el resultado.
 */
function budgetMessage(s: BudgetStatus, label: string, t: LifeDict, locale: string, monthName: string): string {
  const b = t.budgets
  const money = (n: number) => formatMoney(n, s.budget.currency, locale)
  const current = s.daysLeft !== null
  if (s.state === 'over') return current ? b.overNow(label, money(s.over)) : b.overIn(monthName, label, money(s.over))
  if (s.left === 0) return b.reached
  if (!current) return b.pastLeft(money(s.left))
  return b.left(money(s.left), s.daysLeft!, money(s.perDay ?? 0))
}

/**
 * "Presupuestos" del mes que se está viendo: por categoría, lo gastado de lo previsto, una barra con el color de la
 * categoría y una frase amable. La barra no usa `position`, así el menú "⋯" de la fila de abajo no queda tapado.
 */
export function BudgetsCard({ statuses, locale, monthName, onAdd, onEdit, onDelete }: {
  statuses: BudgetStatus[]
  locale: string
  monthName: string
  onAdd: () => void
  onEdit: (b: Budget) => void
  onDelete: (b: Budget) => void
}) {
  const t = useLifeT()
  const b = t.budgets
  const { labelOf, colorOf } = useCategoryLabels()
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="budgets-title">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="budgets-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 2px', textTransform: 'uppercase' }}>
              <PiggyBank size={12} aria-hidden="true" /> {b.title}
            </h2>
            <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 6px' }}>
              {statuses.length ? b.subtitle : b.emptyText}
            </p>
          </div>
          <button type="button" onClick={onAdd} aria-label={b.newTitle}
            style={{
              minHeight: 36, padding: '6px 12px', borderRadius: radius.full, cursor: 'pointer', flexShrink: 0,
              background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.ink,
              fontFamily: font, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <Plus size={14} aria-hidden="true" /> {b.add}
          </button>
        </div>
        {statuses.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {statuses.map(s => {
              const label = labelOf(s.budget.category)
              const color = ink(colorOf(s.budget.category))
              const money = (n: number) => formatMoney(n, s.budget.currency, locale)
              const pct = Math.round(s.ratio * 100)
              const current = s.daysLeft !== null
              return (
                <li key={s.budget.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: font, margin: 0 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors.text.secondary, flexShrink: 0 }}>
                        {b.of(money(s.spent), money(s.budget.amount))}
                      </span>
                    </p>
                    <span aria-hidden="true" style={{ display: 'block', height: 6, borderRadius: radius.full, background: colors.surface.high, marginTop: 6, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.min(100, Math.max(2, pct))}%`, background: color, borderRadius: radius.full }} />
                    </span>
                    <p style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: '5px 0 0', lineHeight: 1.4 }}>
                      {budgetMessage(s, label, t, locale, monthName)}
                      {current && s.state === 'near' && s.left > 0 && <span style={{ color: colors.text.tertiary }}> · {b.used(pct)}</span>}
                    </p>
                    {current && s.state === 'over' && (
                      <p style={{ fontFamily: font, fontSize: 11, color: colors.text.tertiary, margin: '2px 0 0' }}>{b.overTip}</p>
                    )}
                  </div>
                  <ActionMenu label={b.options(label)} actions={[
                    { icon: Pencil, label: t.common.edit, onSelect: () => onEdit(s.budget) },
                    { icon: Trash2, label: t.common.delete, onSelect: () => onDelete(s.budget), danger: true },
                  ]} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </LifeCard>
  )
}
