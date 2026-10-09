import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius, ink, tint } from '../design-system'
import { useLocaleStore } from '@/store/localeStore'
import { usePrefs } from '@/lib/prefs'
import { currencySymbol } from '@/lib/currencies'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../lib/lifePalette'
import type { Transaction, TransactionFormData } from '../hooks/useMoney'
import { GoalSelect } from './GoalSelect'

interface TransactionSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: TransactionFormData) => Promise<void>
  initial?: Transaction | null
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TransactionSheet({ open, onClose, onSave, initial }: TransactionSheetProps) {
  const { currency } = useLocaleStore()  // moneda principal de la cuenta
  const extra = usePrefs(st => st.extra_currencies)
  const t = useLifeT()
  const locale = langLocale(useAppLang(st => st.lang))

  const DEFAULT: TransactionFormData = {
    type: 'expense',
    amount: 0,
    category: 'Otros',
    description: '',
    currency,
    occurred_at: todayISO(),
  }

  const [form, setForm] = useState<TransactionFormData>(DEFAULT)
  const [amountStr, setAmountStr] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia el formulario al abrir */
    if (open) {
      if (initial) {
        setForm({ type: initial.type, amount: initial.amount, category: initial.category,
          description: initial.description ?? '', currency: initial.currency,
          occurred_at: initial.occurred_at.split('T')[0], goal_id: initial.goal_id ?? null })
        setAmountStr(String(initial.amount))
      } else {
        setForm({ ...DEFAULT, currency })
        setAmountStr('')
      }
      setError('')
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleTypeChange = (type: 'income' | 'expense') => {
    const defaultCat = type === 'income' ? 'Sueldo' : 'Comida'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  const handleSave = async () => {
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (!amount || amount <= 0) { setError(t.tx.invalidAmount); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        amount,
        description: form.description?.trim() || undefined,
        occurred_at: new Date(form.occurred_at + 'T12:00:00').toISOString(),
      })
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  const isIncome = form.type === 'income'
  // Moneda principal + adicionales (+ la del movimiento si se edita uno en otra moneda)
  const currencyOptions = [...new Set([currency, ...extra, form.currency].filter(Boolean))]

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? t.tx.editTitle : t.tx.newTitle}>

      {/* Type toggle */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px', marginBottom: '24px',
        padding: '4px',
        background: colors.surface.high,
        borderRadius: radius.md,
      }}>
        {([['income', t.tx.income, TrendingUp, colors.semantic.success],
           ['expense', t.tx.expense, TrendingDown, colors.semantic.error]] as const).map(([type, label, Icon, clr]) => (
          <button
            key={type}
            type="button"
            aria-pressed={form.type === type}
            onClick={() => handleTypeChange(type)}
            style={{
              padding: '11px 8px', borderRadius: radius.sm,
              background: form.type === type ? colors.surface.elevated : 'transparent',
              border: `1.5px solid ${form.type === type ? clr + '50' : 'transparent'}`,
              color: form.type === type ? clr : colors.text.tertiary,
              fontFamily: font, fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <Icon size={15} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
          {t.tx.amount} ({form.currency})
        </label>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontFamily: font, fontSize: '22px', fontWeight: 700,
            color: isIncome ? colors.semantic.success : colors.semantic.error,
          }}>
            {currencySymbol(form.currency, locale)}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9.,]/g, '')
              setAmountStr(v)
            }}
            placeholder="0"
            aria-label={t.tx.amount}
            dir="ltr"
            style={{
              padding: '12px 14px 12px 48px', width: '220px',
              borderRadius: radius.md,
              background: colors.surface.high,
              border: `1.5px solid ${error && !amountStr ? colors.semantic.error : isIncome ? tint(ink(colors.semantic.success), 25) : tint(ink(colors.semantic.error), 25)}`,
              color: isIncome ? colors.semantic.success : colors.semantic.error,
              fontFamily: font, fontSize: '28px', fontWeight: 800,
              textAlign: 'right', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Moneda (sólo si hay más de una configurada) */}
      {currencyOptions.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', margin: '0 0 8px', textTransform: 'uppercase' }}>
            {t.tx.currency}
          </p>
          <div role="radiogroup" aria-label={t.tx.currency} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {currencyOptions.map(c => (
              <button key={c} type="button" role="radio" aria-checked={form.currency === c}
                onClick={() => setForm(f => ({ ...f, currency: c }))}
                style={{
                  minHeight: 36, padding: '6px 14px', borderRadius: radius.full, cursor: 'pointer',
                  background: form.currency === c ? colors.accent.soft : colors.surface.high,
                  border: `1px solid ${form.currency === c ? colors.accent.default : colors.border.subtle}`,
                  color: form.currency === c ? colors.accent.ink : colors.text.secondary,
                  fontFamily: font, fontSize: '13px', fontWeight: 700,
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          {t.tx.category}
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              aria-pressed={form.category === cat}
              onClick={() => setForm(f => ({ ...f, category: cat }))}
              style={{
                padding: '6px 12px', borderRadius: radius.full,
                background: form.category === cat ? (isIncome ? tint(ink(colors.semantic.success), 13) : tint(ink(colors.semantic.error), 13)) : colors.surface.high,
                border: `1px solid ${form.category === cat ? (isIncome ? tint(ink(colors.semantic.success), 31) : tint(ink(colors.semantic.error), 31)) : colors.border.subtle}`,
                color: form.category === cat ? (isIncome ? colors.semantic.success : colors.semantic.error) : colors.text.secondary,
                fontFamily: font, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t.categories[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          {t.tx.description}
        </label>
        <input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder={t.tx.descriptionPlaceholder}
          aria-label={t.tx.description}
          maxLength={120}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '14px', outline: 'none',
          }}
        />
      </div>

      {/* Date */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          {t.tx.date}
        </label>
        <input
          type="date"
          aria-label={t.tx.date}
          value={form.occurred_at}
          onChange={e => setForm(f => ({ ...f, occurred_at: e.target.value }))}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '14px', outline: 'none',
            colorScheme: 'inherit',
          }}
        />
      </div>

      <GoalSelect id="tx-goal" enabled={open} value={form.goal_id} onChange={goal_id => setForm(f => ({ ...f, goal_id }))} />

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t.common.saving : initial ? t.tx.update : t.tx.create}
      </LifeButton>
    </LifeSheet>
  )
}
