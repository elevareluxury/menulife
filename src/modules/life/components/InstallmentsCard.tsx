import { CreditCard, Ban, Trash2 } from 'lucide-react'
import { LifeCard, colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import { ActionMenu, type MenuAction } from './ActionMenu'
import type { InstallmentPlan } from '../hooks/useInstallments'
import { useCategoryLabels } from '../hooks/useCategories'
import { nextInstallmentDue, planName, remainingAmount, remainingByCurrency } from '../lib/installments'


/**
 * "Cuotas en curso": por compra, la cuota actual de total, lo que falta (en su moneda) y una barra de progreso.
 * Arriba, lo que falta pagar por moneda (nunca se suman monedas distintas). La barra no usa `position`, así el menú
 * "⋯" de la fila de abajo no queda tapado.
 */
export function InstallmentsCard({ plans, locale, onCancel, onDelete }: {
  plans: InstallmentPlan[]
  locale: string
  onCancel: (p: InstallmentPlan) => void
  onDelete: (p: InstallmentPlan) => void
}) {
  const t = useLifeT()
  const { labelOf } = useCategoryLabels()
  const c = t.installments
  const dateLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const totals = remainingByCurrency(plans)
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="installments-title">
        <h2 id="installments-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 2px', textTransform: 'uppercase' }}>
          <CreditCard size={12} aria-hidden="true" /> {c.title}
        </h2>
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 6px' }}>{c.subtitle}</p>
        {totals.length > 0 && (
          <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: '0 0 4px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
            <span>{c.leftTotal}:</span>
            {totals.map(x => (
              <strong key={x.currency} dir="ltr" style={{ color: colors.text.primary, fontWeight: 800 }}>{formatMoney(x.amount, x.currency, locale)}</strong>
            ))}
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {plans.map(p => {
            const name = planName(labelOf, p)
            const left = remainingAmount(p)
            const next = nextInstallmentDue(p)
            const pct = Math.round((p.last_no / p.installments) * 100)
            const actions: MenuAction[] = []
            if (p.last_no < p.installments) actions.push({ icon: Ban, label: c.cancel, onSelect: () => onCancel(p) })
            actions.push({ icon: Trash2, label: t.common.delete, onSelect: () => onDelete(p), danger: true })
            return (
              <li key={p.id} style={{ padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text.primary, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                    <p style={{ fontFamily: font, fontSize: 11, color: colors.text.tertiary, margin: 0 }}>
                      {c.progress(p.last_no, p.installments)} · {next ? c.next(dateLabel(next)) : c.paidOff}
                    </p>
                  </div>
                  <span dir="ltr" style={{ fontFamily: font, fontSize: 13, fontWeight: 800, flexShrink: 0, color: colors.text.secondary }}>
                    {left > 0 ? c.left(formatMoney(left, p.currency, locale)) : formatMoney(p.total_amount, p.currency, locale)}
                  </span>
                  <ActionMenu label={`${c.options}: ${name}`} actions={actions} />
                </div>
                <div role="progressbar" aria-label={`${name}: ${c.progress(p.last_no, p.installments)}`}
                  aria-valuemin={0} aria-valuemax={p.installments} aria-valuenow={p.last_no}
                  style={{ height: 6, marginTop: 6, borderRadius: radius.full, background: colors.surface.high, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: radius.full, background: colors.area.money }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </LifeCard>
  )
}
