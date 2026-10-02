import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { LifeSheet, colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'
import { allCurrencies, currencyName } from '@/lib/currencies'

/** Buscador de monedas (ISO 4217), con las más usadas primero. */
export function CurrencySheet({ open, title, selected, exclude = [], onClose, onChoose }: {
  open: boolean
  title: string
  selected?: string
  exclude?: string[]
  onClose: () => void
  onChoose: (code: string) => void
}) {
  const t = useLifeT()
  const locale = langLocale(useAppLang(s => s.lang))
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return allCurrencies()
      .filter(c => !exclude.includes(c))
      .map(c => ({ code: c, name: currencyName(c, locale) }))
      .filter(c => !query || c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query))
  }, [q, exclude, locale])

  return (
    <LifeSheet open={open} onClose={() => { setQ(''); onClose() }} title={title}>
      <label style={{ position: 'relative', display: 'block', marginBottom: 12 }}>
        <Search size={16} aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: colors.text.tertiary }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.settings.searchCurrency}
          aria-label={t.settings.searchCurrency}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '12px 14px', paddingInlineStart: 38,
            borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary, fontFamily: font, fontSize: 16, outline: 'none',
          }} />
      </label>
      <div role="listbox" aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '52vh', overflowY: 'auto' }}>
        {list.length === 0 && (
          <p style={{ fontFamily: font, color: colors.text.secondary, textAlign: 'center', padding: 16 }}>{t.settings.noResults}</p>
        )}
        {list.map(c => {
          const active = c.code === selected
          return (
            <button key={c.code} type="button" role="option" aria-selected={active}
              onClick={() => { setQ(''); onChoose(c.code) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '8px 12px',
                borderRadius: radius.sm, cursor: 'pointer', textAlign: 'start',
                background: active ? colors.accent.soft : 'transparent', border: 'none',
                color: colors.text.primary, fontFamily: font,
              }}>
              <span style={{ width: 44, fontWeight: 800, fontSize: 13, color: active ? colors.accent.default : colors.text.secondary }}>{c.code}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{c.name}</span>
              {active && <Check size={16} aria-hidden="true" style={{ color: colors.accent.default }} />}
            </button>
          )
        })}
      </div>
    </LifeSheet>
  )
}
