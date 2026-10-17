import { create } from 'zustand'
import { loadSupabase } from '@/lib/supabaseLazy'
import { useLocaleStore } from '@/store/localeStore'
import { useAppLang } from '@/i18n/app/store'
import { isAppLang, type AppLang } from '@/i18n/app/languages'
import { syncBusinessLocale } from '@/i18n/businessLocale'
import { guessCurrency } from './currencies'
import { deviceTimeZone, isValidTimeZone, setAccountTimeZone } from '@/modules/life/lib/zonedTime'

// user_settings todavía no está en database.types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getDb = async () => (await loadSupabase()) as any

export interface Prefs {
  language: AppLang
  currency: string
  extra_currencies: string[]
  timezone: string
  week_start: 0 | 1
}

interface PrefsState extends Prefs {
  loadedFor: string | null
  /** Zona guardada en la cuenta (null = nunca se eligió: Life OS sigue al dispositivo). */
  timezoneSaved: string | null
  apply: (p: Partial<Prefs>) => void
}

const browserTimezone = deviceTimeZone

export const usePrefs = create<PrefsState>((set) => ({
  language: useAppLang.getState().lang,
  currency: guessCurrency(),
  extra_currencies: [],
  timezone: browserTimezone(),
  week_start: 1,
  loadedFor: null,
  timezoneSaved: null,
  apply: (p) => set(p),
}))

// Life OS calcula "hoy", meses y horas en la zona de la cuenta (lib/zonedTime.ts)
usePrefs.subscribe(s => setAccountTimeZone(s.timezoneSaved))

/** Lleva las preferencias al resto de la app (idioma de la interfaz y moneda). */
function propagate(p: Partial<Prefs>) {
  if (p.language) {
    useAppLang.getState().setLang(p.language)
    // Mycen Business usa i18next con sus propios idiomas
    syncBusinessLocale(p.language)
  }
  if (p.currency) useLocaleStore.getState().setCurrency(p.currency)
}

export async function loadPrefs(userId: string): Promise<void> {
  const db = await getDb()
  const { data, error } = await db.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) {   // sin tabla o sin red: seguimos con los valores del dispositivo
    usePrefs.setState({ loadedFor: userId })
    return
  }
  const state = usePrefs.getState()
  const saved = isValidTimeZone(data?.timezone) ? (data.timezone as string) : null
  const next: Prefs = data
    ? {
        language: isAppLang(data.language) ? data.language : state.language,
        currency: data.currency ?? state.currency,
        extra_currencies: data.extra_currencies ?? [],
        timezone: saved ?? browserTimezone(),
        week_start: data.week_start === 0 ? 0 : 1,
      }
    : { language: state.language, currency: state.currency, extra_currencies: [], timezone: state.timezone, week_start: state.week_start }
  usePrefs.setState({ ...next, timezoneSaved: saved, loadedFor: userId })
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
  // La zona sólo se guarda si la persona la eligió: sin elegir, Life OS sigue al dispositivo (aunque viaje)
  const timezoneSaved = patch.timezone && isValidTimeZone(patch.timezone) ? patch.timezone : prev.timezoneSaved
  usePrefs.setState({ ...merged, timezoneSaved })
  propagate(merged)
  const db = await getDb()
  const { error } = await db.from('user_settings')
    .upsert({ user_id: userId, ...merged, timezone: timezoneSaved }, { onConflict: 'user_id' })
  if (error) {
    const back: Prefs = {
      language: prev.language, currency: prev.currency, extra_currencies: prev.extra_currencies,
      timezone: prev.timezone, week_start: prev.week_start,
    }
    usePrefs.setState({ ...back, timezoneSaved: prev.timezoneSaved })
    propagate(back)
    throw error
  }
  // Los mails de Supabase (confirmar cuenta, recuperar contraseña) eligen idioma con user_metadata.locale
  if (patch.language && patch.language !== prev.language) {
    void db.auth.updateUser({ data: { locale: patch.language } }).catch(() => { /* sin red: queda el anterior */ })
  }
}

/** Para visitantes o antes de iniciar sesión: sólo cambia el idioma en este dispositivo. */
export function setLocalLanguage(lang: AppLang) {
  usePrefs.setState({ language: lang })
  propagate({ language: lang })
}
