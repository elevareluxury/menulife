import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { useLocaleStore } from '@/store/localeStore'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../lib/lifePalette'
import type { Transaction, TransactionFormData } from '../hooks/useMoney'

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
  const { currency } = useLocaleStore()  // ← NO hardcoded 'ARS'

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
    if (open) {
      if (initial) {
        setForm({ type: initial.type, amount: initial.amount, category: initial.category,
          description: initial.description ?? '', currency: initial.currency,
          occurred_at: initial.occurred_at.split('T')[0] })
        setAmountStr(String(initial.amount))
      } else {
        setForm({ ...DEFAULT, currency })
        setAmountStr('')
      }
      setError('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleTypeChange = (type: 'income' | 'expense') => {
    const defaultCat = type === 'income' ? 'Sueldo' : 'Comida'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  const handleSave = async () => {
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (!amount || amount <= 0) { setError('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        amount,
        description: form.description?.trim() || undefined,
        occurred_at: new Date(form.occurred_at + 'T12:00:00').toISOString(),
      })
      onClose()
    } catch { setError('Error al guardar. Intentá de nuevo.') }
    finally { setSaving(false) }
  }

  const isIncome = form.type === 'income'

  return (
    <LifeSheet open={open} onClose={onClose} title={initial ? 'Editar movimiento' : 'Nuevo movimiento'}>

      {/* Type toggle */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '8px', marginBottom: '24px',
        padding: '4px',
        background: colors.surface.high,
        borderRadius: radius.md,
      }}>
        {([['income', 'Ingreso', TrendingUp, colors.semantic.success],
           ['expense', 'Gasto', TrendingDown, colors.semantic.error]] as const).map(([type, label, Icon, clr]) => (
          <button
            key={type}
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
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
          MONTO ({form.currency})
        </label>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontFamily: font, fontSize: '28px', fontWeight: 700,
            color: isIncome ? colors.semantic.success : colors.semantic.error,
          }}>
            $
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
            style={{
              padding: '12px 14px 12px 36px', width: '200px',
              borderRadius: radius.md,
              background: colors.surface.high,
              border: `1.5px solid ${error && !amountStr ? colors.semantic.error : isIncome ? colors.semantic.success + '40' : colors.semantic.error + '40'}`,
              color: isIncome ? colors.semantic.success : colors.semantic.error,
              fontFamily: font, fontSize: '28px', fontWeight: 800,
              textAlign: 'right', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          CATEGORÍA
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setForm(f => ({ ...f, category: cat }))}
              style={{
                padding: '6px 12px', borderRadius: radius.full,
                background: form.category === cat ? (isIncome ? colors.semantic.success + '20' : colors.semantic.error + '20') : colors.surface.high,
                border: `1px solid ${form.category === cat ? (isIncome ? colors.semantic.success + '50' : colors.semantic.error + '50') : colors.border.subtle}`,
                color: form.category === cat ? (isIncome ? colors.semantic.success : colors.semantic.error) : colors.text.secondary,
                fontFamily: font, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          DESCRIPCIÓN (opcional)
        </label>
        <input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="¿Para qué fue?"
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
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
          FECHA
        </label>
        <input
          type="date"
          value={form.occurred_at}
          onChange={e => setForm(f => ({ ...f, occurred_at: e.target.value }))}
          style={{
            width: '100%', padding: '10px 14px', boxSizing: 'border-box',
            borderRadius: radius.md,
            background: colors.surface.high,
            border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary,
            fontFamily: font, fontSize: '14px', outline: 'none',
            colorScheme: 'dark',
          }}
        />
      </div>

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Registrar movimiento'}
      </LifeButton>
    </LifeSheet>
  )
}
