// /.well-known/apple-app-site-association y /.well-known/assetlinks.json (vercel.json los manda acá): los archivos que
// hacen que un link de mycen.id abra la app de iPhone (Universal Links) o de Android (App Links) en vez del navegador.
// Los datos de la cuenta de Apple y de la firma de Google Play salen de variables de entorno de Vercel, así se cargan
// en el panel sin tocar código (pasos en docs/app/README.md):
//   APPLE_TEAM_ID            el Team ID de Apple Developer (10 letras y números)
//   ANDROID_CERT_SHA256      huella SHA-256 del certificado de Google Play (AA:BB:…); varias separadas por coma
// Sin la variable (o con un valor que no tiene la forma correcta) la lista queda vacía: el link abre la web.

export const config = { runtime: 'edge' }

type Env = Record<string, string | undefined>

export const APP_ID = 'id.mycen.app'
const TEAM_RE = /^[A-Z0-9]{10}$/
const SHA_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

/** Rutas de mycen.id que abren la app (el perfil público y la landing siguen en el navegador) */
const APP_PATHS = ['/auth/*', '/reset-password', '/login', '/register', '/studio', '/studio/*', '/life', '/life/*']

export function appleTeamId(raw: string | undefined): string | null {
  const v = (raw ?? '').trim().toUpperCase()
  return TEAM_RE.test(v) ? v : null
}

export function androidFingerprints(raw: string | undefined): string[] {
  return [...new Set((raw ?? '').split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(s => SHA_RE.test(s)))]
}

export function appleAppSiteAssociation(teamId: string | null) {
  const apps = teamId ? [`${teamId}.${APP_ID}`] : []
  return {
    applinks: {
      details: [{
        appIDs: apps,
        components: APP_PATHS.map(p => (p === '/auth/*'
          ? { '/': p, comment: 'Volver de Google o Apple, confirmar email y recuperar contraseña' }
          : { '/': p })),
      }],
    },
    webcredentials: { apps },
  }
}

export function assetLinks(fingerprints: string[]) {
  if (!fingerprints.length) return []
  return [{
    relation: ['delegate_permission/common.handle_all_urls', 'delegate_permission/common.get_login_creds'],
    target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: fingerprints },
  }]
}

export default function handler(req: Request): Response {
  const env: Env = (globalThis as { process?: { env?: Env } }).process?.env ?? {}
  const file = new URL(req.url).searchParams.get('f')
  const body = file === 'aasa'
    ? appleAppSiteAssociation(appleTeamId(env.APPLE_TEAM_ID))
    : file === 'assetlinks'
      ? assetLinks(androidFingerprints(env.ANDROID_CERT_SHA256))
      : null
  if (!body) return new Response('Not found', { status: 404 })
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
  })
}
