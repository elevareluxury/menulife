import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useLocaleStore } from '@/store/localeStore'
import { useAppLang } from '@/i18n/app/store'
import { isAppLang, type AppLang } from '@/i18n/app/languages'
import { changeLocaleTo, ACTIVE_LOCALES } from '@/i18n'
import { guessCurrency } from './currencies'

// user_settings todavía no está en database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface Prefs {
  language: AppLang
  currency: string
  extra_currencies: string[]
  timezone: string
  week_start: 0 | 1
}

interface PrefsState extends Prefs {
  loadedFor: string | null
  apply: (p: Partial<Prefs>) => void
}

function browserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}

export const usePrefs = create<PrefsState>((set) => ({
  language: useAppLang.getState().lang,
  currency: guessCurrency(),
  extra_currencies: [],
  timezone: browserTimezone(),
  week_start: 1,
  loadedFor: null,
  apply: (p) => set(p),
}))

/** Lleva las preferencias al resto de la app (idioma de la interfaz y moneda). */
function propagate(p: Partial<Prefs>) {
  if (p.language) {
    useAppLang.getState().setLang(p.language)
    // Mycen Business usa i18next con sus propios idiomas
    if ((ACTIVE_LOCALES as readonly string[]).includes(p.language)) void changeLocaleTo(p.language)
  }
  if (p.currency) useLocaleStore.getState().setCurrency(p.currency)
}

export async function loadPrefs(userId: string): Promise<void> {
  const { data, error } = await db.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) return   // sin tabla o sin red: seguimos con los valores del dispositivo
  const state = usePrefs.getState()
  const next: Prefs = data
    ? {
        language: isAppLang(data.language) ? data.language : state.language,
        currency: data.currency ?? state.currency,
        extra_currencies: data.extra_currencies ?? [],
        timezone: data.timezone ?? state.timezone,
        week_start: data.week_start === 0 ? 0 : 1,
      }
    : { language: state.language, currency: state.currency, extra_currencies: [], timezone: state.timezone, week_start: state.week_start }
  usePrefs.setState({ ...next, loadedFor: userId })
  propagate(next)
}

/** Guarda cambios de preferencias. Aplica al instante y revierte si falla. */
export async function savePrefs(userId: string, patch: Partial<Prefs>): Promise<void> {
  const prev = usePrefs.getState()
  const merged: Prefs = {
    language: patch.language ?? prev.language,
    currency: patch.currency ?? prev.currency,
    extra_currencies: (patch.extra_currencies ?? prev.extra_currencies).filter(c => c !== (patch.currency ?? prev.currency)),
    timezone: patch.timezone ?? prev.timezone,
    week_start: patch.week_start ?? prev.week_start,
  }
  usePrefs.setState(merged)
  propagate(merged)
  const { error } = await db.from('user_settings').upsert({ user_id: userId, ...merged }, { onConflict: 'user_id' })
  if (error) {
    const back: Prefs = {
      language: prev.language, currency: prev.currency, extra_currencies: prev.extra_currencies,
      timezone: prev.timezone, week_start: prev.week_start,
    }
    usePrefs.setState(back)
    propagate(back)
    throw error
  }
}

/** Para visitantes o antes de iniciar sesión: sólo cambia el idioma en este dispositivo. */
export function setLocalLanguage(lang: AppLang) {
  usePrefs.setState({ language: lang })
  propagate({ language: lang })
}
