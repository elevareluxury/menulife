import { claimT } from '@/i18n/app/claim'
import type { AppLang } from '@/i18n/app/languages'
import { ClaimName } from './ClaimName'

/** Perfil que no existe y cuyo nombre está libre: "mycen.id/juan está libre" con el campo ya completo. Va en su propio
 *  chunk (la página pública lo baja sólo en este caso). */
export function FreeName({ slug, theme, accent, lang }: {
  slug: string
  theme: 'universo' | 'amanecer'
  accent?: string
  lang: AppLang
}) {
  const c = claimT(lang)
  return (
    <>
      <h1 dir="auto">{c.freeTitle.replace('{name}', `mycen.id/${slug}`)}</h1>
      <p>{c.freeText}</p>
      <ClaimName from="perfil" initial={slug} theme={theme} accent={accent} lang={lang} compact />
    </>
  )
}
