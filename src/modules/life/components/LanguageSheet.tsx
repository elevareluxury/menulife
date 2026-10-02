import { Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { LifeSheet, colors, font, radius } from '../design-system'
import { useLifeT } from '@/i18n/app/life'
import { APP_LANGS, LANG_INFO, type AppLang } from '@/i18n/app/languages'
import { savePrefs, setLocalLanguage, usePrefs } from '@/lib/prefs'
import { useAuthStore } from '@/store/authStore'

/** Lista de idiomas para elegir. Se guarda en la cuenta (o en el dispositivo si no hay sesión). */
export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useLifeT()
  const userId = useAuthStore(s => s.user?.id)
  const current = usePrefs(s => s.language)

  const choose = (lang: AppLang) => {
    onClose()
    if (lang === current) return
    if (!userId) { setLocalLanguage(lang); return }
    savePrefs(userId, { language: lang }).catch(() => toast.error(t.common.saveError))
  }

  return (
    <LifeSheet open={open} onClose={onClose} title={t.settings.language}>
      <LanguageList current={current} onChoose={choose} />
    </LifeSheet>
  )
}

export function LanguageList({ current, onChoose }: { current: AppLang; onChoose: (l: AppLang) => void }) {
  return (
    <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      {APP_LANGS.map(code => {
        const active = code === current
        return (
          <button key={code} type="button" role="radio" aria-checked={active} lang={code}
            onClick={() => onChoose(code)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              minHeight: 48, padding: '10px 14px', borderRadius: radius.md, cursor: 'pointer',
              background: active ? colors.accent.soft : colors.surface.high,
              border: `1px solid ${active ? colors.accent.default : colors.border.subtle}`,
              color: active ? colors.accent.default : colors.text.primary,
              fontFamily: font, fontSize: 15, fontWeight: 600, textAlign: 'start',
            }}>
            <span>{LANG_INFO[code].native}</span>
            {active && <Check size={16} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
