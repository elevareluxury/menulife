// Segunda foto de perfil (`theme.avatar_alt`): una para la mañana o para la noche, según la hora del visitante.
// Puro: lo usan la página, la vista previa de Studio y los tests. La base valida { url https, when }.
import type { ProfileTheme } from './profileTypes'
import { safeHref } from './safeUrl'

export type AvatarMoment = 'amanecer' | 'noche'

/** ¿Es el momento de la segunda foto? Mañana = 5 a 11:59; noche = 20 a 4:59 (hora del dispositivo) */
export function isAvatarMoment(when: AvatarMoment, now: Date): boolean {
  const h = now.getHours()
  return when === 'amanecer' ? h >= 5 && h < 12 : h >= 20 || h < 5
}

/** La foto que corresponde ahora: la segunda en su momento (si es un link válido), si no la de siempre */
export function avatarFor(base: string | null | undefined, theme: ProfileTheme | null | undefined, now: Date): string | null {
  const alt = theme?.avatar_alt
  const altUrl = alt && (alt.when === 'amanecer' || alt.when === 'noche') ? safeHref(alt.url) : null
  if (altUrl && /^https:\/\//.test(altUrl) && isAvatarMoment(alt!.when, now)) return altUrl
  return safeHref(base)
}
