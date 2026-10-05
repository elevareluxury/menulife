import { useAppLang } from '@/i18n/app/store'
import { APP_LANGS, LANG_INFO, type AppLang } from '@/i18n/app/languages'
import { setLocalLanguage } from '@/lib/prefs'

/** Los 12 idiomas de Mycen: queda recordado en el dispositivo para toda la app */
export function LanguageSelect({ label }: { label: string }) {
  const lang = useAppLang(st => st.lang)
  return (
    <label style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: '6px',
      padding: '6px 12px', borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
      fontFamily: 'var(--font-jakarta)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', color: '#fff',
    }}>
      <span aria-hidden="true">{lang.toUpperCase()}</span>
      <select value={lang} aria-label={label} onChange={e => setLocalLanguage(e.target.value as AppLang)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}>
        {APP_LANGS.map(code => <option key={code} value={code} lang={code}>{LANG_INFO[code].native}</option>)}
      </select>
    </label>
  )
}
