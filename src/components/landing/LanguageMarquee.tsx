import { APP_LANGS, LANG_INFO } from '@/i18n/app/languages'
import { useLandingT } from '@/i18n/app/landing'

/** Cinta que pasa sola con los 12 idiomas de Mycen (un dato real, no prueba social inventada). */
export function LanguageMarquee() {
  const t = useLandingT().marquee
  const names = APP_LANGS.map(code => ({ code, name: LANG_INFO[code].native }))
  // La lista va dos veces para que la vuelta no tenga corte; la copia es sólo visual
  return (
    <section className="ml-marquee" aria-label={t.label}>
      <p className="ml-sr-only">{t.label}: {names.map(n => n.name).join(', ')}</p>
      <div className="ml-marquee-track" aria-hidden="true" dir="ltr">
        {[0, 1].map(copy => (
          <div key={copy} style={{ display: 'flex', gap: '48px' }}>
            {names.map(n => <span key={n.code} lang={n.code} className="ml-marquee-item">{n.name}</span>)}
          </div>
        ))}
      </div>
    </section>
  )
}
