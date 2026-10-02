// Idiomas de Mycen (Life OS, Studio y Profile). Mantener sincronizado con
// el check de public.user_settings.language y public.profiles.default_locale.

export const APP_LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru'] as const
export type AppLang = typeof APP_LANGS[number]

export const LANG_INFO: Record<AppLang, { native: string; bcp47: string; dir: 'ltr' | 'rtl' }> = {
  es: { native: 'Español',   bcp47: 'es-AR', dir: 'ltr' },
  en: { native: 'English',   bcp47: 'en-US', dir: 'ltr' },
  pt: { native: 'Português', bcp47: 'pt-BR', dir: 'ltr' },
  fr: { native: 'Français',  bcp47: 'fr-FR', dir: 'ltr' },
  de: { native: 'Deutsch',   bcp47: 'de-DE', dir: 'ltr' },
  it: { native: 'Italiano',  bcp47: 'it-IT', dir: 'ltr' },
  zh: { native: '中文',       bcp47: 'zh-CN', dir: 'ltr' },
  ja: { native: '日本語',     bcp47: 'ja-JP', dir: 'ltr' },
  ko: { native: '한국어',     bcp47: 'ko-KR', dir: 'ltr' },
  hi: { native: 'हिन्दी',      bcp47: 'hi-IN', dir: 'ltr' },
  ar: { native: 'العربية',    bcp47: 'ar',    dir: 'rtl' },
  ru: { native: 'Русский',   bcp47: 'ru-RU', dir: 'ltr' },
}

export function isAppLang(v: unknown): v is AppLang {
  return typeof v === 'string' && (APP_LANGS as readonly string[]).includes(v)
}

const STORAGE_KEY = 'mycen_lang'

/** Idioma guardado en este dispositivo, o el del navegador, o español. */
export function detectLang(): AppLang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isAppLang(saved)) return saved
  } catch { /* storage bloqueado */ }
  if (typeof navigator !== 'undefined') {
    for (const l of navigator.languages ?? [navigator.language]) {
      const base = l?.toLowerCase().split('-')[0]
      if (isAppLang(base)) return base
    }
  }
  return 'es'
}

export function rememberLang(lang: AppLang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* storage bloqueado */ }
}

export const langDir = (lang: AppLang) => LANG_INFO[lang].dir
export const langLocale = (lang: AppLang) => LANG_INFO[lang].bcp47
