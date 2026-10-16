import { useMemo } from 'react'
import { useAppLang } from '@/i18n/app/store'
import { langLocale } from '@/i18n/app/languages'

/** Fechas y números del panel interno en el idioma de la app (antes, siempre es-AR). */
export function useAdminFormat() {
  const locale = langLocale(useAppLang(s => s.lang))
  return useMemo(() => ({
    locale,
    dateTime: (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' }),
    date: (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    number: (n: number, digits = 0) => n.toLocaleString(locale, { maximumFractionDigits: digits }),
    /** "hace 5 min" / "5 min ago" con Intl (sin textos propios) */
    since: (iso: string) => {
      const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
      if (mins < 60) return rtf.format(-mins, 'minute')
      const h = Math.floor(mins / 60)
      if (h < 24) return rtf.format(-h, 'hour')
      const d = Math.floor(h / 24)
      if (d < 7) return rtf.format(-d, 'day')
      return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
    },
  }), [locale])
}
