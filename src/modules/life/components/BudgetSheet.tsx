import { useEffect, useId, useState } from 'react'
import { LifeSheet, LifeButton, colors, font, radius, ink } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { useLocaleStore } from '@/store/localeStore'
import { usePrefs } from '@/lib/prefs'
import { useCategoryLabels } from '../hooks/useCategories'
import { budgetSaveError } from '../hooks/useBudgets'
import { findBudget, parseBudgetAmount, type Budget } from '../lib/budgets'

/** Lo que se abre: un presupuesto para editar el monto, o uno nuevo (con categoría y moneda propuestas). */
export type BudgetDraft = { editing: Budget } | { editing: null; category?: string; currency?: string }

const sectionTitle: React.CSSProperties = {
  fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em',
  textTransform: 'uppercase', margin: '0 0 8px',
}

/** Nuevo presupuesto (categoría de gasto, moneda y monto por mes) o cambiar el monto de uno. */
export function BudgetSheet({ draft, budgets, onClose, onSave }: {
  draft: BudgetDraft | null
  budgets: readonly Budget[]
  onClose: () => void
  onSave: (category: string, currency: string, amount: number) => Promise<void>
}) {
  const t = useLifeT()
  const b = t.budgets
  const id = useId()
  const { labelOf, colorOf, keysFor } = useCategoryLabels()
  const mainCurrency = useLocaleStore(s => s.currency)
  const extra = usePrefs(s => s.extra_currencies)
  const [category, setCategory] = useState('Comida')
  const [currency, setCurrency] = useState(mainCurrency)
  const [amountStr, setAmountStr] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia al abrir */
    if (!draft) return
    setError(''); setSaving(false)
    if (draft.editing) {
      setCategory(draft.editing.category); setCurrency(draft.editing.currency); setAmountStr(String(draft.editing.amount))
    } else {
      setCategory(draft.category ?? 'Comida'); setCurrency(draft.currency ?? mainCurrency); setAmountStr('')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [draft, mainCurrency])

  const editing = draft?.editing ?? null
  const existing = !editing ? findBudget(budgets, category, currency) : null
  const categories = keysFor('expense')
  // La categoría propuesta puede estar archivada: igual se muestra para elegirla
  const categoryOptions = categories.includes(category) ? categories : [...categories, category]
  const currencyOptions = [...new Set([mainCurrency, ...(extra ?? []), currency].filter(Boolean))]

  const submit = async () => {
    const amount = parseBudgetAmount(amountStr)
    if (amount === null) { setError(b.invalidAmount); return }
    setSaving(true)
    try {
      await onSave(category, currency, amount)
      onClose()
    } catch (err) {
      setError(budgetSaveError(err, t))
    } finally { setSaving(false) }
  }

  const chip = (selected: boolean): React.CSSProperties => ({
    minHeight: 36, padding: '6px 12px', borderRadius: radius.full, cursor: 'pointer',
    background: selected ? colors.accent.soft : colors.surface.high,
    border: `1px solid ${selected ? colors.accent.default : colors.border.subtle}`,
    color: selected ? colors.accent.ink : colors.text.secondary,
    fontFamily: font, fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
  })

  return (
    <LifeSheet open={!!draft} onClose={onClose} title={editing ? b.editTitle(labelOf(editing.category)) : b.newTitle}>
      {draft && (
        <>
          {!editing && (
            <>
              <div style={{ marginBottom: 16 }}>
                <p id={`${id}-cat`} style={sectionTitle}>{b.category}</p>
                <div role="radiogroup" aria-labelledby={`${id}-cat`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {categoryOptions.map(key => (
                    <button key={key} type="button" role="radio" aria-checked={category === key}
                      onClick={() => { setCategory(key); setError('') }} style={chip(category === key)}>
                      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: radius.full, background: ink(colorOf(key)) }} />
                      {labelOf(key)}
                    </button>
                  ))}
                </div>
              </div>
              {currencyOptions.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <p id={`${id}-cur`} style={sectionTitle}>{b.currency}</p>
                  <div role="radiogroup" aria-labelledby={`${id}-cur`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {currencyOptions.map(c => (
                      <button key={c} type="button" role="radio" aria-checked={currency === c}
                        onClick={() => { setCurrency(c); setError('') }} style={chip(currency === c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label htmlFor={`${id}-amount`} style={{ ...sectionTitle, display: 'block' }}>{b.amount(currency)}</label>
            <input id={`${id}-amount`} type="text" inputMode="decimal" dir="ltr" value={amountStr} placeholder="0"
              aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
              onChange={e => { setAmountStr(e.target.value.replace(/[^0-9.,\s]/g, '')); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '10px 14px', borderRadius: radius.md,
                background: colors.surface.high, border: `1px solid ${error ? colors.semantic.error : colors.border.subtle}`,
                color: colors.text.primary, fontFamily: font, fontSize: 20, fontWeight: 800, outline: 'none',
              }} />
          </div>
          <p id={`${id}-hint`} style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: '0 0 12px', lineHeight: 1.5 }}>
            {existing ? b.existing : b.hint}
          </p>
          {error && <p id={`${id}-error`} role="alert" style={{ fontFamily: font, fontSize: 12, color: colors.semantic.error, margin: '0 0 12px' }}>{error}</p>}

          <LifeButton onClick={() => void submit()} disabled={saving} style={{ width: '100%' }}>
            {saving ? t.common.saving : b.save}
          </LifeButton>
        </>
      )}
    </LifeSheet>
  )
}
