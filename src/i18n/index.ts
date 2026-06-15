import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es'
import en from './en'
import type { LocaleMeta } from '@/modules/globalization/globalizationTypes'

// ─── Locale metadata ──────────────────────────────────────────────────────────

export const LOCALE_META: Record<string, LocaleMeta> = {
  es: { dir: 'ltr', label: 'Español',    flag: '🇪🇸', bcp47: 'es-AR' },
  en: { dir: 'ltr', label: 'English',    flag: '🇺🇸', bcp47: 'en-US' },
  pt: { dir: 'ltr', label: 'Português',  flag: '🇧🇷', bcp47: 'pt-BR' },
  fr: { dir: 'ltr', label: 'Français',   flag: '🇫🇷', bcp47: 'fr-FR' },
  it: { dir: 'ltr', label: 'Italiano',   flag: '🇮🇹', bcp47: 'it-IT' },
  de: { dir: 'ltr', label: 'Deutsch',    flag: '🇩🇪', bcp47: 'de-DE' },
  // RTL stubs — layout not implemented, architecture prepared
  ar: { dir: 'rtl', label: 'العربية',   flag: '🇸🇦', bcp47: 'ar-SA' },
  zh: { dir: 'ltr', label: '中文',       flag: '🇨🇳', bcp47: 'zh-CN' },
  ja: { dir: 'ltr', label: '日本語',     flag: '🇯🇵', bcp47: 'ja-JP' },
  ko: { dir: 'ltr', label: '한국어',     flag: '🇰🇷', bcp47: 'ko-KR' },
  hi: { dir: 'ltr', label: 'हिन्दी',   flag: '🇮🇳', bcp47: 'hi-IN' },
}

// Active locales with full translation bundles
export const ACTIVE_LOCALES = ['es', 'en', 'pt', 'fr', 'it', 'de'] as const
export type ActiveLocale = typeof ACTIVE_LOCALES[number]

// Coming-soon locales (stubs only)
export const STUB_LOCALES = ['ar', 'zh', 'ja', 'ko', 'hi'] as const

// ─── i18n initialization ──────────────────────────────────────────────────────

// ES and EN are always bundled (default markets)
i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng:             localStorage.getItem('menulife_lang') ?? 'es',
  // Fallback chain: business language → Spanish → English (never breaks UI)
  fallbackLng:     ['es', 'en'],
  interpolation:   { escapeValue: false },
  // Allow adding bundles dynamically (lazy-loaded locales)
  partialBundledLanguages: true,
})

// ─── Lazy locale loading ──────────────────────────────────────────────────────

const _loaded = new Set<string>(['es', 'en'])

/**
 * Load a locale bundle on demand (code-split per locale).
 * Safe to call multiple times — loads only once.
 */
export async function loadLocale(lang: string): Promise<void> {
  if (_loaded.has(lang)) return

  try {
    let bundle: Record<string, unknown>
    switch (lang as ActiveLocale) {
      case 'pt': bundle = (await import('./pt')).default; break
      case 'fr': bundle = (await import('./fr')).default; break
      case 'it': bundle = (await import('./it')).default; break
      case 'de': bundle = (await import('./de')).default; break
      default:   return   // Unknown locale — skip
    }
    i18n.addResourceBundle(lang, 'translation', bundle, true, false)
    _loaded.add(lang)
  } catch {
    // Locale file not available — fall back silently via fallbackLng
  }
}

/**
 * Switch the active locale.
 * - Lazy-loads the bundle if not yet cached
 * - Updates localStorage for persistence
 * - Sets html[lang] and html[dir] for accessibility + SEO
 */
export async function changeLocaleTo(lang: string): Promise<void> {
  await loadLocale(lang)
  await i18n.changeLanguage(lang)
  localStorage.setItem('menulife_lang', lang)

  const meta = LOCALE_META[lang]
  document.documentElement.lang = lang
  document.documentElement.dir  = meta?.dir ?? 'ltr'
}

export default i18n
