import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, TrendingDown, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLocaleStore } from '@/store/localeStore'
import { usePrefs } from '@/lib/prefs'
import { formatMoney } from '@/lib/currencies'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { LifeSheet, LifeButton, colors, font, radius } from '../design-system'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { detectMapping, parseCsv, splitDuplicates, toTransactions, type Grid, type ImportedTx, type Mapping } from '../lib/bankImport'
import { useCategoryMemory } from '../hooks/useCategoryMemory'
import { useCategoryLabels } from '../hooks/useCategories'
import { suggestCategory } from '../lib/moneyInsights'

// Importar movimientos del banco (V1.1, detrás de FEATURES.bankImport): el archivo se lee en el dispositivo.

const db = supabase as unknown as SupabaseClient
const MAX_ROWS = 2000

/** Texto del archivo: UTF-8 o, si no lo es (muchos bancos exportan en Windows-1252), Latin-1. */
async function fileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { return new TextDecoder('windows-1252').decode(buf) }
}

async function readGrid(file: File): Promise<Grid> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  const isOldXls = head[0] === 0xd0 && head[1] === 0xcf
  if (isOldXls) throw new Error('old_xls')
  if (isZip) {
    const { readXlsx } = await import('../lib/xlsx')
    return readXlsx(await file.arrayBuffer())
  }
  return parseCsv(await fileText(file))
}

const label = { fontFamily: font, fontSize: '11px', fontWeight: 700, color: colors.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', margin: '0 0 6px' } as const
const select = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: radius.md, background: colors.surface.high,
  border: `1px solid ${colors.border.medium}`, color: colors.text.primary, fontFamily: font, fontSize: '16px', colorScheme: 'inherit',
} as const

export function ImportBankSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useLifeT()
  const b = t.bankImport
  const lang = useAppLang(s => s.lang)
  const locale = langLocale(lang)
  const user = useAuthStore(s => s.user)
  const main = useLocaleStore(s => s.currency)
  const extra = usePrefs(s => s.extra_currencies)
  const fileRef = useRef<HTMLInputElement>(null)
  const [grid, setGrid] = useState<Grid | null>(null)
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [currency, setCurrency] = useState(main)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState<{ date: string; type: string; amount: number; description: string | null }[] | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reinicia al abrir */
    if (open) { setGrid(null); setMapping(null); setError(''); setExisting(null); setCurrency(main) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, main])

  const parsed = useMemo(() => (grid && mapping ? toTransactions(grid, mapping) : null), [grid, mapping])

  // Lo que ya está cargado en esas fechas (para no duplicar)
  const range = useMemo(() => {
    const dates = parsed?.items.map(i => i.date).sort() ?? []
    return dates.length ? [dates[0], dates[dates.length - 1]] as const : null
  }, [parsed])
  useEffect(() => {
    if (!range || !user) return
    let alive = true
    const from = new Date(`${range[0]}T00:00:00`); from.setDate(from.getDate() - 1)
    const to = new Date(`${range[1]}T00:00:00`); to.setDate(to.getDate() + 2)
    void db.from('life_transactions').select('type,amount,description,occurred_at,currency')
      .eq('user_id', user.id).gte('occurred_at', from.toISOString()).lt('occurred_at', to.toISOString()).limit(5000)
      .then(({ data }) => {
        if (!alive) return
        const pad = (n: number) => String(n).padStart(2, '0')
        setExisting((data ?? []).filter(r => r.currency === currency).map(r => {
          const d = new Date(r.occurred_at as string)
          return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, type: r.type as string, amount: Number(r.amount), description: r.description as string | null }
        }))
      })
    return () => { alive = false }
  }, [range, user, currency])

  const split = useMemo(() => (parsed && existing ? splitDuplicates(parsed.items, existing) : null), [parsed, existing])

  // Los que se parecen a movimientos que ya ordenaste toman esa categoría; el resto va a "Otros"
  const memory = useCategoryMemory(open)
  // Una categoría propia archivada ya no se usa para lo nuevo
  const { keysFor } = useCategoryLabels()
  const suggestedFor = (i: ImportedTx) => {
    const s = memory && suggestCategory(memory, i.type, i.description)
    return s && keysFor(i.type).includes(s) ? s : null
  }
  const categoryFor = (i: ImportedTx) => suggestedFor(i) || 'Otros'
  const autoSorted = split && memory ? split.fresh.filter(i => suggestedFor(i)).length : 0

  async function onFile(file: File | undefined) {
    if (!file) return
    setError(''); setBusy(true); setExisting(null)
    try {
      const g = await readGrid(file)
      const m = detectMapping(g, lang === 'en' ? 'mdy' : 'dmy')
      if (!m) { setError(b.noColumns); setGrid(null); setMapping(null); return }
      setGrid(g); setMapping(m)
    } catch (e) {
      setError((e as Error).message === 'old_xls' ? b.oldExcel : b.notReadable)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function doImport(items: ImportedTx[]) {
    if (!user || !items.length) return
    if (items.length > MAX_ROWS) { setError(b.tooMany); return }
    setBusy(true)
    try {
      const rows = items.map(i => ({
        user_id: user.id, type: i.type, amount: i.amount, category: categoryFor(i), description: i.description || null,
        currency, occurred_at: new Date(`${i.date}T12:00:00`).toISOString(),
      }))
      for (let k = 0; k < rows.length; k += 500) {
        const { error: err } = await db.from('life_transactions').insert(rows.slice(k, k + 500))
        if (err) throw err
      }
      window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module: 'money' } }))
      toast.success(b.done(items.length))
      onClose()
    } catch {
      setError(b.error)
    } finally {
      setBusy(false)
    }
  }

  const headers = grid && mapping ? (mapping.start > 0 ? grid[mapping.start - 1] : []) : []
  const width = grid ? Math.max(...grid.map(r => r.length)) : 0
  const colName = (j: number) => headers[j] || `${b.columns} ${String.fromCharCode(65 + j)}`
  const colSelect = (id: string, text: string, value: number | null, onChange: (j: number) => void) => (
    <div style={{ flex: '1 1 140px' }}>
      <label htmlFor={id} style={label}>{text}</label>
      <select id={id} value={value ?? ''} onChange={e => onChange(Number(e.target.value))} style={select}>
        {Array.from({ length: width }, (_, j) => <option key={j} value={j}>{colName(j)}</option>)}
      </select>
    </div>
  )
  const currencies = [...new Set([main, ...extra])]

  return (
    <LifeSheet open={open} onClose={onClose} title={b.title}>
      <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: '0 0 14px', lineHeight: 1.5 }}>{b.intro}</p>

      <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label={b.choose} style={{ display: 'none' }} onChange={e => void onFile(e.target.files?.[0])} />
      <LifeButton variant={grid ? 'secondary' : 'primary'} onClick={() => fileRef.current?.click()} disabled={busy} style={{ width: '100%', marginBottom: 14 }}>
        <FileUp size={16} aria-hidden="true" /> {busy && !grid ? b.reading : b.choose}
      </LifeButton>

      {error && <p role="alert" style={{ fontFamily: font, fontSize: 13, color: colors.semantic.error, margin: '0 0 12px' }}>{error}</p>}

      {grid && mapping && parsed && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {colSelect('imp-date', b.date, mapping.date, j => setMapping({ ...mapping, date: j }))}
            {colSelect('imp-desc', b.description, mapping.description, j => setMapping({ ...mapping, description: j }))}
            {mapping.amount != null
              ? colSelect('imp-amount', b.amount, mapping.amount, j => setMapping({ ...mapping, amount: j }))
              : <>
                  {colSelect('imp-debit', b.debit, mapping.debit, j => setMapping({ ...mapping, debit: j }))}
                  {colSelect('imp-credit', b.credit, mapping.credit, j => setMapping({ ...mapping, credit: j }))}
                </>}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: font, fontSize: 13, color: colors.text.secondary, marginBottom: 12 }}>
            <input type="checkbox" checked={mapping.amount == null} style={{ width: 18, height: 18, accentColor: colors.accent.default }}
              onChange={e => setMapping(e.target.checked
                ? { ...mapping, amount: null, debit: mapping.amount ?? 0, credit: Math.min(width - 1, (mapping.amount ?? 0) + 1) }
                : { ...mapping, amount: mapping.debit ?? 0, debit: null, credit: null })} />
            {b.twoColumns}
          </label>
          {currencies.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="imp-currency" style={label}>{b.currency}</label>
              <select id="imp-currency" value={currency} onChange={e => setCurrency(e.target.value)} style={select}>
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <section aria-label={b.preview} style={{ padding: 12, borderRadius: radius.md, background: colors.surface.high, marginBottom: 12 }}>
            <p role="status" style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: colors.text.primary, margin: '0 0 2px' }}>
              {split ? b.found(split.fresh.length) : b.reading}
            </p>
            {split && split.duplicates > 0 && <p style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: 0 }}>{b.duplicates(split.duplicates)}</p>}
            {parsed.skipped > 0 && <p style={{ fontFamily: font, fontSize: 12, color: colors.text.secondary, margin: 0 }}>{b.skipped(parsed.skipped)}</p>}
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
              {(split?.fresh ?? parsed.items).slice(0, 5).map((i, n) => (
                <li key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: `1px solid ${colors.border.subtle}`, fontFamily: font, fontSize: 12 }}>
                  {i.type === 'income'
                    ? <TrendingUp size={13} aria-hidden="true" style={{ color: colors.semantic.success, flexShrink: 0 }} />
                    : <TrendingDown size={13} aria-hidden="true" style={{ color: colors.semantic.error, flexShrink: 0 }} />}
                  <span style={{ color: colors.text.tertiary, flexShrink: 0 }}>{new Date(`${i.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</span>
                  <span style={{ flex: 1, minWidth: 0, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description || '—'}</span>
                  <strong dir="ltr" style={{ color: i.type === 'income' ? colors.semantic.success : colors.semantic.error, flexShrink: 0 }}>
                    {i.type === 'income' ? '+' : '-'}{formatMoney(i.amount, currency, locale)}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
          <p style={{ fontFamily: font, fontSize: 12, color: colors.text.tertiary, margin: '0 0 12px' }}>{autoSorted > 0 ? b.autoSorted(autoSorted) : b.categoryNote}</p>

          {split && split.fresh.length === 0
            ? <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: 0 }}>{b.nothing}</p>
            : <LifeButton onClick={() => split && void doImport(split.fresh)} disabled={busy || !split} style={{ width: '100%' }}>
                {busy ? t.common.saving : b.importN(split?.fresh.length ?? 0)}
              </LifeButton>}
        </>
      )}
    </LifeSheet>
  )
}
