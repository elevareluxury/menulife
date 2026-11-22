// Consentimiento aparte para sacar los datos del país (Corea del Sur: PIPA art. 28-8; China continental: PIPL
// art. 39). Se pide en el registro y, a una cuenta que todavía no lo dio, antes de entrar (`/auth/terms`). Queda en
// la cuenta: `xborder_consent_at`, `xborder_region` y `xborder_version` (user_metadata). Sin dependencias.

export type CrossBorderRegion = 'kr' | 'cn'

/** Versión del texto que se acepta: si cambia lo que dice (proveedores, países), se sube y se vuelve a pedir. */
export const XBORDER_VERSION = '2026-11-22'

const KR_ZONES = new Set(['Asia/Seoul', 'ROK'])
// China continental (sin Hong Kong, Macao ni Taiwán, que tienen sus propias leyes)
const CN_ZONES = new Set(['Asia/Shanghai', 'Asia/Chongqing', 'Asia/Chungking', 'Asia/Harbin', 'Asia/Urumqi', 'Asia/Kashgar', 'PRC'])

/** Si la persona parece estar en Corea del Sur o en China: primero la zona horaria del dispositivo y, si no dice
 *  nada, el idioma (coreano → Corea; chino → China, también en Taiwán: pedir un permiso de más no hace daño). */
export function crossBorderRegion({ lang, timeZone }: { lang?: string | null; timeZone?: string | null }): CrossBorderRegion | null {
  if (timeZone && KR_ZONES.has(timeZone)) return 'kr'
  if (timeZone && CN_ZONES.has(timeZone)) return 'cn'
  if (lang === 'ko') return 'kr'
  if (lang === 'zh') return 'cn'
  return null
}

export function deviceTimeZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null }
}

/** Lo que se guarda en la cuenta al aceptar. */
export function crossBorderConsent(region: CrossBorderRegion, at = new Date().toISOString()): Record<string, string> {
  return { xborder_consent_at: at, xborder_region: region, xborder_version: XBORDER_VERSION }
}

/** Cuenta de Corea o China (por el idioma guardado o el dispositivo) que todavía no dio el permiso vigente. */
export function crossBorderMissing(
  meta: Record<string, unknown> | undefined, timeZone: string | null = deviceTimeZone(),
): CrossBorderRegion | null {
  const m = meta ?? {}
  const region = crossBorderRegion({ lang: typeof m.locale === 'string' ? m.locale : null, timeZone })
  if (!region) return null
  return m.xborder_consent_at && m.xborder_version === XBORDER_VERSION ? null : region
}

/** Pone el nombre del país en un texto con `{country}` (los nombres vienen del diccionario de acceso). */
export function withCountry(text: string, region: CrossBorderRegion, names: { kr: string; cn: string }): string {
  return text.split('{country}').join(region === 'kr' ? names.kr : names.cn)
}
