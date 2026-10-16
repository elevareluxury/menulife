import { useEffect, useState } from 'react'
import { Users, Trash2 } from 'lucide-react'
import { LifeCard, LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { formatMoney } from '@/lib/currencies'
import { ActionMenu } from './ActionMenu'
import { settlementIncome, type PersonBalance } from '../lib/splits'
import { lifeTimeZone } from '../lib/zonedTime'

// Cuentas compartidas en Dinero: lo pendiente con cada persona (por moneda, sin sumar monedas distintas) y "Saldar".

export function SharedCard({ items, locale, onSettle, onDelete }: {
  items: PersonBalance[]
  locale: string
  onSettle: (b: PersonBalance) => void
  onDelete: (b: PersonBalance) => void
}) {
  const t = useLifeT()
  const s = t.shared
  return (
    <LifeCard style={{ marginBottom: '12px' }}>
      <section aria-labelledby="shared-title">
        <h2 id="shared-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 2px', textTransform: 'uppercase' }}>
          <Users size={12} aria-hidden="true" /> {s.cardTitle}
        </h2>
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 6px' }}>{s.cardSubtitle}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map(b => {
            const owesMe = b.net > 0
            const even = b.net === 0
            const amount = formatMoney(Math.abs(b.net), b.currency, locale)
            return (
              <li key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: colors.text.primary, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.person}</p>
                  <p style={{ fontFamily: font, fontSize: 11, color: colors.text.tertiary, margin: 0 }}>
                    {even ? s.even : owesMe ? s.owesYouShort : s.youOweShort}
                  </p>
                </div>
                {!even && (
                  <span dir="ltr" role="img" aria-label={owesMe ? s.owesYou(b.person, amount) : s.youOwe(b.person, amount)}
                    style={{ fontFamily: font, fontSize: 14, fontWeight: 800, flexShrink: 0, color: owesMe ? colors.semantic.success : colors.text.primary }}>
                    {amount}
                  </span>
                )}
                <button type="button" onClick={() => onSettle(b)} aria-label={s.settleTitle(b.person)}
                  style={{
                    minHeight: 36, padding: '6px 14px', borderRadius: radius.full, cursor: 'pointer', flexShrink: 0,
                    background: colors.accent.soft, border: `1px solid ${colors.accent.soft}`, color: colors.accent.ink,
                    fontFamily: font, fontSize: 13, fontWeight: 700,
                  }}>
                  {s.settle}
                </button>
                <ActionMenu label={s.options(b.person)} actions={[
                  { icon: Trash2, label: t.common.delete, onSelect: () => onDelete(b), danger: true },
                ]} />
              </li>
            )
          })}
        </ul>
      </section>
    </LifeCard>
  )
}

export function SettleSheet({ balance, locale, onClose, onConfirm }: {
  balance: PersonBalance | null
  locale: string
  onClose: () => void
  /** `record`: registrar el ingreso de lo que te devolvieron */
  onConfirm: (b: PersonBalance, income: number, record: boolean) => Promise<void>
}) {
  const t = useLifeT()
  const s = t.shared
  const [record, setRecord] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia al abrir */
    if (balance) { setRecord(true); setError(''); setSaving(false) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [balance])

  const b = balance
  const income = b ? settlementIncome(b) : 0
  const money = (n: number) => formatMoney(n, b?.currency ?? 'USD', locale)

  const confirm = async () => {
    if (!b) return
    setSaving(true)
    try {
      await onConfirm(b, income, record)
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  return (
    <LifeSheet open={!!b} onClose={onClose} title={b ? s.settleTitle(b.person) : s.settle}>
      {b && (
        <>
          <p style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: colors.text.primary, margin: '0 0 12px' }}>
            {b.net > 0 ? s.owesYou(b.person, money(b.net)) : b.net < 0 ? s.youOwe(b.person, money(-b.net)) : s.even}
          </p>
          <h3 style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 6px' }}>
            {s.pendingList}
          </h3>
          <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0 }}>
            {b.items.map(it => (
              <li key={it.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${colors.border.subtle}`, fontFamily: font, fontSize: 13 }}>
                <span style={{ flex: 1, minWidth: 0, color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.note || new Date(it.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: lifeTimeZone() })}
                </span>
                <span style={{ color: colors.text.tertiary }}>{it.direction === 'owed_to_me' ? s.owesYouShort : s.youOweShort}</span>
                <span dir="ltr" style={{ fontWeight: 700, color: colors.text.primary }}>{money(Number(it.amount))}</span>
              </li>
            ))}
          </ul>

          {income > 0 && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, padding: '12px 14px', cursor: 'pointer',
              borderRadius: radius.md, background: record ? colors.accent.soft : colors.surface.high,
              border: `1px solid ${record ? colors.accent.default : colors.border.subtle}`,
            }}>
              <input type="checkbox" checked={record} onChange={e => setRecord(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: colors.accent.default }} />
              <span style={{ fontFamily: font }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: colors.text.primary }}>{s.recordIncome(money(income))}</span>
                <span style={{ display: 'block', fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>“{s.repaidDesc(b.person)}”</span>
              </span>
            </label>
          )}
          {b.iOwe > 0 && (
            <p style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: '0 0 16px', lineHeight: 1.5 }}>
              {income > 0 ? s.mixedHint : s.alreadyCounted}
            </p>
          )}

          {error && <p role="alert" style={{ fontFamily: font, fontSize: 12, color: colors.semantic.error, margin: '0 0 12px' }}>{error}</p>}

          <LifeButton onClick={confirm} disabled={saving} style={{ width: '100%' }}>
            {saving ? t.common.saving : s.settle}
          </LifeButton>
        </>
      )}
    </LifeSheet>
  )
}
