import type { LifeDict } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import type { SplitPlan } from './splits'

/** Qué va a quedar con un gasto compartido (o qué falta para poder guardarlo). */
export function planMessage(plan: SplitPlan, t: LifeDict, currency: string, locale: string): { ok: boolean; lines: string[] } {
  const money = (n: number) => formatMoney(n, currency, locale)
  const s = t.shared
  if (!plan.ok) {
    const diff = plan.diff ?? 0
    switch (plan.reason) {
      case 'noPeople': return { ok: false, lines: [s.needPeople] }
      case 'noAmount': return { ok: false, lines: [s.needAmount] }
      case 'payerMissing': return { ok: false, lines: [s.whichPerson] }
      case 'manualMismatch': return { ok: false, lines: [diff > 0 ? s.missing(money(diff)) : s.over(money(-diff))] }
      case 'nothingShared': return { ok: false, lines: [s.nothing] }
      default: return { ok: false, lines: [s.invalid] }
    }
  }
  const debts = plan.debts.map(d => d.direction === 'owed_to_me' ? s.owesYou(d.person, money(d.amount)) : s.youOwe(d.person, money(d.amount)))
  const owesMe = plan.debts.some(d => d.direction === 'owed_to_me')
  return { ok: true, lines: [...debts, owesMe ? s.explainMe(money(plan.expense)) : s.explainOther(money(plan.expense))] }
}
