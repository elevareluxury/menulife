// ─── Locale Store ─────────────────────────────────────────────────────────────
// Single source of truth for the active locale configuration.
// Initialized on app boot from restaurant / organization settings.
// Falls back to browser locale → Spanish (our default market).

import { create } from 'zustand'
import type { LocaleCode, CurrencyCode, DateFormat, TimeFormat, NumberFormat, LocaleConfig } from '@/modules/globalization/globalizationTypes'

interface LocaleState extends LocaleConfig {
  // Setters
  setLanguage:     (lang: LocaleCode)      => void
  setCurrency:     (code: CurrencyCode)    => void
  setTimezone:     (tz: string)            => void
  setDateFormat:   (fmt: DateFormat)       => void
  setTimeFormat:   (fmt: TimeFormat)       => void
  setNumberFormat: (fmt: NumberFormat)     => void
  setRtl:          (rtl: boolean)          => void
  setCountry:      (code: string)          => void
  applyConfig:     (cfg: Partial<LocaleConfig>) => void
  reset:           () => void
}

const DEFAULTS: LocaleConfig = {
  language:      'es',
  currency:      'ARS',
  timezone:      'America/Argentina/Buenos_Aires',
  date_format:   'DD/MM/YYYY',
  time_format:   '24h',
  number_format: 'es-AR',
  rtl:           false,
  country:       'AR',
}

export const useLocaleStore = create<LocaleState>((set) => ({
  ...DEFAULTS,

  setLanguage:     (language)      => set({ language }),
  setCurrency:     (currency)      => set({ currency }),
  setTimezone:     (timezone)      => set({ timezone }),
  setDateFormat:   (date_format)   => set({ date_format }),
  setTimeFormat:   (time_format)   => set({ time_format }),
  setNumberFormat: (number_format) => set({ number_format }),
  setRtl:          (rtl)           => set({ rtl }),
  setCountry:      (country)       => set({ country }),

  applyConfig: (cfg) => set(prev => ({ ...prev, ...cfg })),

  reset: () => set(DEFAULTS),
}))

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocale() {
  return useLocaleStore()
}
