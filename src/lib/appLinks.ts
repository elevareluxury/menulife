// Links que abren la app de iOS/Android: de un https://mycen.id/… (o id.mycen.app://…) a la ruta interna.

const APP_HOSTS = new Set(['mycen.id', 'www.mycen.id'])

export function pathFromAppUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    // https://mycen.id/… (Universal Links / App Links) o id.mycen.app://… (esquema propio)
    if (u.protocol === 'https:' && !APP_HOSTS.has(u.hostname)) return null
    if (u.protocol !== 'https:' && u.protocol !== 'id.mycen.app:') return null
    const path = u.protocol === 'https:' ? u.pathname : `/${u.host}${u.pathname}`.replace(/\/+$/, '') || '/'
    return `${path}${u.search}${u.hash}`
  } catch {
    return null
  }
}
