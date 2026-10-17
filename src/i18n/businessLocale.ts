// Idioma de Mycen Business (i18next). i18next y sus diccionarios ya no viajan con cada página: sólo los bajan las
// pantallas que los usan (plugin `businessI18n` en vite.config.ts). Las preferencias de la cuenta anotan el idioma acá:
// queda guardado para cuando Business arranque y, si ya está abierto, se cambia en vivo.

export const BUSINESS_LOCALES = ['es', 'en', 'pt', 'fr', 'it', 'de'] as const
export const BUSINESS_LANG_KEY = 'menulife_lang'

let apply: ((lang: string) => Promise<void>) | null = null

/** Lo llama `@/i18n` al iniciarse */
export function registerBusinessLocale(fn: (lang: string) => Promise<void>) {
  apply = fn
}

export function syncBusinessLocale(lang: string) {
  if (!(BUSINESS_LOCALES as readonly string[]).includes(lang)) return
  if (apply) { void apply(lang); return }
  try { localStorage.setItem(BUSINESS_LANG_KEY, lang) } catch { /* sin almacenamiento */ }
}
