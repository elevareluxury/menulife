import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Download, FileSpreadsheet, LogOut, Plus, Settings2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeScreenContainer, LifeCard, LifeConfirmDialog, colors, font, radius } from '../design-system'
import { deleteLifeData, downloadBlob, exportLifeJson, exportMoneyCsv } from '../lib/lifeData'
import { LIFE_DATA_UPDATED } from '../hooks/useBrain'
import { LanguageList } from '../components/LanguageSheet'
import { CurrencySheet } from '../components/CurrencySheet'
import { useLifeT } from '@/i18n/app/life'
import { langLocale, type AppLang } from '@/i18n/app/languages'
import { savePrefs, usePrefs, type Prefs } from '@/lib/prefs'
import { currencyName } from '@/lib/currencies'
import { useAuthStore } from '@/store/authStore'

function timezones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    return intl.supportedValuesOf?.('timeZone') ?? []
  } catch { return [] }
}

const label: React.CSSProperties = {
  fontFamily: font, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: colors.text.tertiary, margin: '0 0 10px',
}
const help: React.CSSProperties = { fontFamily: font, fontSize: 12.5, color: colors.text.secondary, margin: '10px 0 0', lineHeight: 1.5 }

export function LifeSettingsPage() {
  const t = useLifeT()
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.user?.id)
  const signOut = useAuthStore(s => s.signOut)
  const prefs = usePrefs()
  const locale = langLocale(prefs.language)
  const [picker, setPicker] = useState<'main' | 'extra' | null>(null)
  const [busy, setBusy] = useState<'json' | 'csv' | 'delete' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const zones = useMemo(() => {
    const all = timezones()
    return all.includes(prefs.timezone) ? all : [prefs.timezone, ...all]
  }, [prefs.timezone])

  const save = (patch: Partial<Prefs>) => {
    if (!userId) return
    savePrefs(userId, patch).catch(() => toast.error(t.common.saveError))
  }

  const stamp = () => new Date().toISOString().slice(0, 10)
  const download = async (kind: 'json' | 'csv') => {
    if (!userId || busy) return
    setBusy(kind)
    try {
      if (kind === 'json') downloadBlob(await exportLifeJson(userId), `mycen-life-os-${stamp()}.json`)
      else downloadBlob(await exportMoneyCsv(userId), `mycen-dinero-${stamp()}.csv`)
    } catch { toast.error(t.data.exportError) }
    finally { setBusy(null) }
  }
  const removeAll = async () => {
    setConfirmDelete(false)
    if (!userId) return
    setBusy('delete')
    try {
      await deleteLifeData(userId)
      toast.success(t.data.deleted)
      for (const module of ['brain', 'goals', 'money']) window.dispatchEvent(new CustomEvent(LIFE_DATA_UPDATED, { detail: { module } }))
    } catch { toast.error(t.data.deleteError) }
    finally { setBusy(null) }
  }
  const dataBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 14px', borderRadius: radius.md,
    background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary,
    fontFamily: font, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'start',
  }

  return (
    <LifeScreenContainer>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 24, marginBottom: 20 }}>
        <button type="button" onClick={() => navigate('/life')} aria-label={t.common.close}
          style={{ width: 40, height: 40, borderRadius: radius.full, border: `1px solid ${colors.border.subtle}`, background: 'transparent', color: colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={18} aria-hidden="true" className="flip-rtl" />
        </button>
        <div>
          <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: colors.text.primary, margin: 0 }}>{t.settings.title}</h1>
          <p style={{ fontFamily: font, fontSize: 13, color: colors.text.secondary, margin: 0 }}>{t.settings.subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LifeCard>
          <h2 style={label}>{t.settings.language}</h2>
          <LanguageList current={prefs.language} onChoose={(l: AppLang) => save({ language: l })} />
          <p style={help}>{t.settings.languageHelp}</p>
        </LifeCard>

        <LifeCard>
          <h2 style={label}>{t.settings.currency}</h2>
          <button type="button" onClick={() => setPicker('main')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '10px 14px', borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, cursor: 'pointer', textAlign: 'start' }}>
            <span style={{ fontWeight: 800, color: colors.accent.default }}>{prefs.currency}</span>
            <span style={{ flex: 1, fontSize: 14 }}>{currencyName(prefs.currency, locale)}</span>
            <ChevronRight size={16} aria-hidden="true" className="flip-rtl" style={{ color: colors.text.tertiary }} />
          </button>
          <p style={help}>{t.settings.currencyHelp}</p>

          <h2 style={{ ...label, marginTop: 20 }}>{t.settings.extraCurrencies}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {prefs.extra_currencies.map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', borderRadius: radius.full, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, fontFamily: font, fontSize: 13, color: colors.text.primary }}>
                <strong>{c}</strong>
                <button type="button" aria-label={t.settings.removeCurrency(c)}
                  onClick={() => save({ extra_currencies: prefs.extra_currencies.filter(x => x !== c) })}
                  style={{ width: 28, height: 28, borderRadius: radius.full, border: 'none', background: 'transparent', color: colors.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            ))}
            {prefs.extra_currencies.length < 5 && (
              <button type="button" onClick={() => setPicker('extra')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40, padding: '6px 14px', borderRadius: radius.full, background: 'transparent', border: `1px dashed ${colors.border.medium}`, color: colors.text.secondary, fontFamily: font, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={14} aria-hidden="true" /> {t.settings.addCurrency}
              </button>
            )}
          </div>
          <p style={help}>{t.settings.extraHelp}</p>
        </LifeCard>

        <LifeCard>
          <h2 style={label}>{t.settings.timezone}</h2>
          <select value={prefs.timezone} onChange={e => save({ timezone: e.target.value })} aria-label={t.settings.timezone}
            style={{ width: '100%', minHeight: 48, padding: '10px 12px', borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: 16, colorScheme: 'dark' }}>
            {zones.map(z => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
          <p style={help}>{t.settings.timezoneHelp}</p>

          <h2 style={{ ...label, marginTop: 20 }}>{t.settings.weekStart}</h2>
          <div role="radiogroup" style={{ display: 'flex', gap: 8 }}>
            {([[1, t.settings.monday], [0, t.settings.sunday]] as const).map(([v, text]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs.week_start === v} onClick={() => save({ week_start: v })}
                style={{ flex: 1, minHeight: 44, borderRadius: radius.md, cursor: 'pointer', fontFamily: font, fontSize: 14, fontWeight: 600,
                  background: prefs.week_start === v ? colors.accent.soft : colors.surface.high,
                  border: `1px solid ${prefs.week_start === v ? colors.accent.default : colors.border.subtle}`,
                  color: prefs.week_start === v ? colors.accent.default : colors.text.primary }}>
                {text}
              </button>
            ))}
          </div>
        </LifeCard>

        <LifeCard>
          <h2 style={label}>{t.data.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" style={dataBtn} disabled={!!busy} onClick={() => void download('json')}>
              <Download size={16} aria-hidden="true" /> {busy === 'json' ? t.data.preparing : t.data.exportJson}
            </button>
            <button type="button" style={dataBtn} disabled={!!busy} onClick={() => void download('csv')}>
              <FileSpreadsheet size={16} aria-hidden="true" /> {busy === 'csv' ? t.data.preparing : t.data.exportCsv}
            </button>
            <button type="button" disabled={!!busy} onClick={() => setConfirmDelete(true)}
              style={{ ...dataBtn, background: 'transparent', color: colors.semantic.error }}>
              <Trash2 size={16} aria-hidden="true" /> {busy === 'delete' ? t.data.preparing : t.data.delete}
            </button>
          </div>
          <p style={help}>{t.data.help}</p>
        </LifeCard>

        <LifeCard>
          <h2 style={label}>{t.settings.account}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" onClick={() => navigate('/studio')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 14px', borderRadius: radius.md, background: colors.surface.high, border: `1px solid ${colors.border.subtle}`, color: colors.text.primary, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Settings2 size={16} aria-hidden="true" /> {t.settings.openStudio}
            </button>
            <button type="button" onClick={() => { void signOut() }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 14px', borderRadius: radius.md, background: 'transparent', border: `1px solid ${colors.border.subtle}`, color: colors.semantic.error, fontFamily: font, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <LogOut size={16} aria-hidden="true" className="flip-rtl" /> {t.settings.signOut}
            </button>
          </div>
        </LifeCard>
      </div>

      <LifeConfirmDialog
        open={confirmDelete}
        title={t.data.deleteTitle}
        message={t.data.deleteText}
        confirmLabel={t.data.deleteConfirm}
        onConfirm={() => void removeAll()}
        onCancel={() => setConfirmDelete(false)}
        danger
      />

      <CurrencySheet
        open={picker !== null}
        title={picker === 'extra' ? t.settings.addCurrency : t.settings.currency}
        selected={picker === 'main' ? prefs.currency : undefined}
        exclude={picker === 'extra' ? [prefs.currency, ...prefs.extra_currencies] : []}
        onClose={() => setPicker(null)}
        onChoose={code => {
          setPicker(null)
          if (picker === 'main') save({ currency: code, extra_currencies: prefs.extra_currencies.filter(c => c !== code) })
          else save({ extra_currencies: [...prefs.extra_currencies, code] })
        }}
      />
    </LifeScreenContainer>
  )
}
