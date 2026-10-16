import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Repeat, Plus, CreditCard } from 'lucide-react'
import { LifeSheet, LifeButton, colors, font, radius, ink, tint } from '../design-system'
import { useLocaleStore } from '@/store/localeStore'
import { usePrefs } from '@/lib/prefs'
import { currencySymbol, formatMoney } from '@/lib/currencies'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { useCategoryMemory } from '../hooks/useCategoryMemory'
import { suggestCategory } from '../lib/moneyInsights'
import type { Transaction, TransactionFormData } from '../hooks/useMoney'
import { GoalSelect } from './GoalSelect'
import { CategoryForm } from './CategoryForm'
import { useCategories, useCategoryLabels } from '../hooks/useCategories'
import { isCustomKey, suggestColor } from '../lib/moneyCategories'
import { installmentAmount, validInstallments, MAX_INSTALLMENTS, MIN_INSTALLMENTS } from '../lib/installments'
import { SharedExpenseFields } from './SharedExpenseFields'
import { planMessage } from '../lib/splitMessage'
import { followTotal, planSplit, type EditShared, type SharedDraft, type SplitDebt } from '../lib/splits'
import { useOutbox } from '../lib/outbox'
import { localDateOf } from '../lib/moneyFuture'
import { lifeTimeZone, lifeToday, noonOfLocalDayISO } from '../lib/zonedTime'

/** Gasto compartido: las deudas que quedan (el importe del movimiento ya viene ajustado en `data.amount`) */
export interface SharedSave { debts: SplitDebt[] }

interface TransactionSheetProps {
  open: boolean
  onClose: () => void
  /**
   * `repeat`: el usuario pidió que se repita todos los meses (sólo al crear con `repeatable`).
   * `installments`: compra en cuotas (cantidad); `data.amount` es el total y la fecha, la de la primera cuota.
   * `shared`: gasto compartido (las deudas que quedan; `data.amount` ya viene ajustado).
   */
  onSave: (data: TransactionFormData, repeat: boolean, installments?: number | null, shared?: SharedSave | null) => Promise<void>
  initial?: Transaction | null
  /** Ofrece "Repetir todos los meses" al crear */
  repeatable?: boolean
  /** Edita un fijo: la fecha es la próxima y los cambios valen de acá en adelante */
  template?: boolean
  /** Ofrece "Compartido" en un gasto nuevo; `knownPeople`: nombres ya usados (el más reciente primero) */
  shareable?: boolean
  knownPeople?: string[]
  /**
   * Al editar un movimiento con `shareable`: cómo está su parte compartida ('draft' = se ve y se puede cambiar;
   * 'locked' = ya se saldó algo y el monto, la moneda, el tipo y el reparto quedan como están).
   */
  editShared?: EditShared
}

/** Hoy en la zona de la cuenta (lib/zonedTime.ts). */
const todayISO = (): string => lifeToday()

export function TransactionSheet({ open, onClose, onSave, initial, repeatable, template, shareable, knownPeople, editShared }: TransactionSheetProps) {
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
  const [repeat, setRepeat]       = useState(false)
  // Movimiento nuevo: la categoría se sugiere por la descripción (lo que ya ordenaste) hasta que elegís una a mano
  const [catTouched, setCatTouched] = useState(false)
  const memory = useCategoryMemory(open && !initial)
  // Categorías propias: se crean acá mismo ("+ Nueva") y quedan elegidas
  const { labelOf, colorOf, keysFor, items: customCats } = useCategoryLabels()
  const { createCategory } = useCategories()
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [split, setSplit]         = useState(false)
  const [countStr, setCountStr]   = useState('12')
  // Gasto compartido (sólo al crear un gasto; no se combina con "Repetir todos los meses")
  const [shared, setShared] = useState<SharedDraft | null>(null)
  // Sin conexión, el movimiento simple queda en la cola del dispositivo; fijos, cuotas y compartidos no (no se pierden datos)
  const { offline } = useOutbox()

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia el formulario al abrir */
    if (open) {
      if (initial) {
        setForm({ type: initial.type, amount: initial.amount, category: initial.category,
          description: initial.description ?? '', currency: initial.currency,
          occurred_at: localDateOf(initial.occurred_at), goal_id: initial.goal_id ?? null })
        setAmountStr(String(initial.amount))
      } else {
        setForm({ ...DEFAULT, currency })
        setAmountStr('')
      }
      setError('')
      setRepeat(false)
      setCatTouched(false)
      setNewCatOpen(false)
      setSplit(false)
      setCountStr('12')
      setShared(initial && editShared?.kind === 'draft' ? editShared.draft : null)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const typeKeys = keysFor(form.type)
  // Una propia archivada sigue apareciendo en el movimiento que ya la tenía
  const categories = isCustomKey(form.category) && !typeKeys.includes(form.category) ? [...typeKeys, form.category] : typeKeys

  const handleTypeChange = (type: 'income' | 'expense') => {
    const defaultCat = type === 'income' ? 'Sueldo' : 'Comida'
    setForm(f => ({ ...f, type, category: defaultCat }))
    setNewCatOpen(false)
  }

  // En cuotas: sólo para un gasto nuevo, excluyente con "Repetir todos los meses"
  const canSplit = !!repeatable && !initial && !template && form.type === 'expense'
  // Ya se saldó parte de la cuenta: monto, moneda, tipo y reparto no se tocan
  const sharedLocked = !!shareable && !!initial && !template && editShared?.kind === 'locked'
  // Sin conexión no se pueden activar (si ya estaban activadas, se avisa al guardar)
  const offlineOptions = offline && !initial && !template && (!!repeatable || !!shareable)
  const inInstallments = canSplit && split
  const count = Number(countStr)

  const handleSave = async () => {
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (!amount || amount <= 0) { setError(t.tx.invalidAmount); return }
    if (inInstallments && !validInstallments(amount, count)) { setError(t.installments.invalid); return }
    const sharing = canShare && shared ? planSplit(amount, shared) : null
    if (sharing && !sharing.ok) { setError(planMessage(sharing, t, form.currency, locale).lines[0]); return }
    if (offlineOptions && (inInstallments || (repeatable && repeat) || sharing)) { setError(t.money.offlineOptions); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        // Compartido: el movimiento es lo que salió de tu bolsillo (el total) o tu parte, si pagó otra persona
        amount: sharing?.ok ? sharing.expense : amount,
        description: form.description?.trim() || undefined,
        // Fecha vacía o inválida (se borró el campo): hoy
        occurred_at: template || (repeatable && repeat && !initial) || inInstallments
          // Un fijo guarda la fecha tal cual (el día del mes); un movimiento, el mediodía de esa fecha en la zona de la cuenta
          ? (/^\d{4}-\d{2}-\d{2}$/.test(form.occurred_at) ? form.occurred_at : todayISO())
          : noonOfLocalDayISO(/^\d{4}-\d{2}-\d{2}$/.test(form.occurred_at) ? form.occurred_at : todayISO(), lifeTimeZone()),
      }, !inInstallments && !!(repeatable && repeat && !initial), inInstallments ? count : null, sharing?.ok ? { debts: sharing.debts } : null)
      onClose()
    } catch { setError(t.common.saveError) }
    finally { setSaving(false) }
  }

  const isIncome = form.type === 'income'
  // Compartido no se combina con "Repetir todos los meses" ni con "En cuotas"
  const canShare = !!shareable && !template && !isIncome && !repeat && !split && !sharedLocked
  // Moneda principal + adicionales (+ la del movimiento si se edita uno en otra moneda)
  const currencyOptions = [...new Set([currency, ...extra, form.currency].filter(Boolean))]

  return (
    <LifeSheet open={open} onClose={onClose} title={template ? t.recurring.editTitle : initial ? t.tx.editTitle : t.tx.newTitle}>

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
            disabled={sharedLocked && form.type !== type}
            onClick={() => handleTypeChange(type)}
            style={{
              padding: '11px 8px', borderRadius: radius.sm,
              background: form.type === type ? colors.surface.elevated : 'transparent',
              border: `1.5px solid ${form.type === type ? clr + '50' : 'transparent'}`,
              color: form.type === type ? clr : colors.text.tertiary,
              fontFamily: font, fontSize: '14px', fontWeight: 700,
              cursor: sharedLocked ? 'default' : 'pointer', transition: 'all 0.18s',
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
              // Editando un gasto que pagó otra persona: tu parte sigue al monto
              if (initial && shared) setShared(followTotal(shared, v))
            }}
            readOnly={sharedLocked}
            aria-describedby={sharedLocked ? 'tx-shared-locked' : undefined}
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
                disabled={sharedLocked && form.currency !== c}
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
              onClick={() => { setCatTouched(true); setForm(f => ({ ...f, category: cat })) }}
              style={{
                padding: '6px 12px', borderRadius: radius.full,
                background: form.category === cat ? (isIncome ? tint(ink(colors.semantic.success), 13) : tint(ink(colors.semantic.error), 13)) : colors.surface.high,
                border: `1px solid ${form.category === cat ? (isIncome ? tint(ink(colors.semantic.success), 31) : tint(ink(colors.semantic.error), 31)) : colors.border.subtle}`,
                color: form.category === cat ? (isIncome ? colors.semantic.success : colors.semantic.error) : colors.text.secondary,
                fontFamily: font, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {isCustomKey(cat) && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: radius.full, background: ink(colorOf(cat)) }} />}
              {labelOf(cat)}
            </button>
          ))}
          <button type="button" aria-expanded={newCatOpen} aria-label={t.categoriesUi.newTitle} onClick={() => setNewCatOpen(v => !v)}
            style={{
              padding: '6px 12px', borderRadius: radius.full, background: 'transparent', border: `1px dashed ${colors.border.medium}`,
              color: colors.text.secondary, fontFamily: font, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <Plus size={12} aria-hidden="true" /> {t.categoriesUi.newChip}
          </button>
        </div>
        {newCatOpen && (
          <div style={{ marginTop: 10 }}>
            <CategoryForm type={form.type} items={customCats} defaultColor={suggestColor(form.type, customCats)}
              submitLabel={t.categoriesUi.create}
              onCancel={() => setNewCatOpen(false)}
              onSubmit={async (name, color) => {
                const key = await createCategory(form.type, name, color)
                setCatTouched(true)
                setForm(f => ({ ...f, category: key }))
                setNewCatOpen(false)
              }} />
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
          {t.tx.description}
        </label>
        <input
          value={form.description}
          onChange={e => {
            const description = e.target.value
            setForm(f => {
              const suggested = !initial && !catTouched && memory ? suggestCategory(memory, f.type, description) : null
              const list = keysFor(f.type)
              return { ...f, description, ...(suggested && list.includes(suggested) ? { category: suggested } : {}) }
            })
          }}
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
          {template ? t.recurring.nextDate : t.tx.date}
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

      {sharedLocked && (
        <p id="tx-shared-locked" style={{
          fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: '0 0 16px', lineHeight: 1.5,
          padding: '12px 14px', borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
        }}>
          {t.shared.lockedEdit}
        </p>
      )}

      {canShare && (
        <SharedExpenseFields total={parseFloat(amountStr.replace(',', '.'))} currency={form.currency} locale={locale}
          value={shared} onChange={setShared} knownPeople={knownPeople ?? []} disabled={offlineOptions && !shared} />
      )}

      {repeatable && !initial && !(canShare && shared) && (
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '16px', padding: '12px 14px', cursor: 'pointer',
          borderRadius: radius.md, background: repeat ? colors.accent.soft : colors.surface.high,
          border: `1px solid ${repeat ? colors.accent.default : colors.border.subtle}`,
        }}>
          <input type="checkbox" checked={repeat} disabled={offlineOptions && !repeat}
            onChange={e => { setRepeat(e.target.checked); if (e.target.checked) setSplit(false) }}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: colors.accent.default }} />
          <span style={{ fontFamily: font }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
              <Repeat size={14} aria-hidden="true" /> {t.recurring.repeat}
            </span>
            {repeat && (
              <span style={{ display: 'block', fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                {t.recurring.repeatHint(Number((form.occurred_at || todayISO()).slice(8, 10)) || Number(todayISO().slice(8, 10)))}
              </span>
            )}
          </span>
        </label>
      )}

      {canSplit && !(canShare && shared) && (() => {
        const amount = parseFloat(amountStr.replace(',', '.'))
        const each = amount > 0 && validInstallments(amount, count)
          ? t.installments.each(count, formatMoney(installmentAmount(amount, count, 1), form.currency, locale))
          : null
        return (
          <div style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: radius.md,
            background: split ? colors.accent.soft : colors.surface.high,
            border: `1px solid ${split ? colors.accent.default : colors.border.subtle}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={split} disabled={offlineOptions && !split}
                onChange={e => { setSplit(e.target.checked); if (e.target.checked) setRepeat(false) }}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: colors.accent.default }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: font, fontSize: 14, fontWeight: 700, color: colors.text.primary }}>
                <CreditCard size={14} aria-hidden="true" /> {t.installments.option}
              </span>
            </label>
            {split && (
              <div style={{ marginTop: 10, fontFamily: font }}>
                <label htmlFor="tx-installments" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: colors.text.secondary, marginBottom: 6 }}>
                  {t.installments.count}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <input id="tx-installments" type="number" inputMode="numeric" min={MIN_INSTALLMENTS} max={MAX_INSTALLMENTS} step={1}
                    value={countStr} onChange={e => setCountStr(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                    aria-describedby="tx-installments-each"
                    style={{
                      width: 72, minHeight: 40, padding: '6px 10px', boxSizing: 'border-box', borderRadius: radius.sm,
                      background: colors.surface.elevated, border: `1px solid ${colors.border.medium}`, color: colors.text.primary,
                      fontFamily: font, fontSize: 16, fontWeight: 700, outline: 'none',
                    }} />
                  {[3, 6, 12, 18, 24].map(n => (
                    <button key={n} type="button" aria-pressed={count === n} onClick={() => setCountStr(String(n))}
                      style={{
                        minWidth: 40, minHeight: 40, padding: '6px 10px', borderRadius: radius.full, cursor: 'pointer',
                        background: count === n ? colors.surface.elevated : 'transparent',
                        border: `1px solid ${count === n ? colors.accent.default : colors.border.subtle}`,
                        color: count === n ? colors.accent.ink : colors.text.secondary,
                        fontFamily: font, fontSize: 13, fontWeight: 700,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <p id="tx-installments-each" aria-live="polite" style={{ fontSize: 14, fontWeight: 700, color: colors.text.primary, margin: '10px 0 2px' }} dir="auto">
                  {each}
                </p>
                <p style={{ fontSize: 12, color: colors.text.secondary, margin: 0, lineHeight: 1.5 }}>{t.installments.hint}</p>
              </div>
            )}
          </div>
        )
      })()}

      {offlineOptions && (
        <p role="status" style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: '0 0 16px', lineHeight: 1.5 }}>
          {t.money.offlineOptions}
        </p>
      )}

      {template && (
        <p style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: '0 0 16px', lineHeight: 1.5 }}>{t.recurring.editHint}</p>
      )}

      <GoalSelect id="tx-goal" enabled={open} value={form.goal_id} onChange={goal_id => setForm(f => ({ ...f, goal_id }))} />

      {error && (
        <p style={{ fontFamily: font, fontSize: '12px', color: colors.semantic.error, marginBottom: '12px' }}>
          {error}
        </p>
      )}

      <LifeButton onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
        {saving ? t.common.saving : initial || template ? t.tx.update : t.tx.create}
      </LifeButton>
    </LifeSheet>
  )
}
