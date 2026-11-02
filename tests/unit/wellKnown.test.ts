import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { androidFingerprints, appleTeamId, appleAppSiteAssociation, assetLinks } from '../../api/well-known'

// Links de mycen.id que abren la app: el Team ID de Apple y la huella de Google Play salen de variables de Vercel.

const SHA = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':')

describe('well-known (Universal Links / App Links)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('acepta sólo un Team ID de 10 caracteres', () => {
    expect(appleTeamId(' ab12cd34ef ')).toBe('AB12CD34EF')
    expect(appleTeamId('APPLE_TEAM_ID')).toBeNull()
    expect(appleTeamId(undefined)).toBeNull()
  })

  it('acepta huellas SHA-256 con dos puntos, varias y sin repetir', () => {
    expect(androidFingerprints(`${SHA.toLowerCase()}, ${SHA}`)).toEqual([SHA])
    expect(androidFingerprints('ANDROID_SHA256_FINGERPRINT')).toEqual([])
  })

  it('arma los dos archivos; sin datos, listas vacías (el link abre la web)', () => {
    const aasa = appleAppSiteAssociation('AB12CD34EF')
    expect(aasa.applinks.details[0].appIDs).toEqual(['AB12CD34EF.id.mycen.app'])
    expect(aasa.webcredentials.apps).toEqual(['AB12CD34EF.id.mycen.app'])
    expect(aasa.applinks.details[0].components.map(c => c['/'])).toContain('/auth/*')
    expect(appleAppSiteAssociation(null).applinks.details[0].appIDs).toEqual([])
    expect(assetLinks([SHA])[0].target).toEqual({ namespace: 'android_app', package_name: 'id.mycen.app', sha256_cert_fingerprints: [SHA] })
    expect(assetLinks([])).toEqual([])
  })

  it('responde JSON con las variables de Vercel', async () => {
    vi.stubEnv('APPLE_TEAM_ID', 'AB12CD34EF')
    vi.stubEnv('ANDROID_CERT_SHA256', SHA)
    const a = handler(new Request('https://mycen.id/api/well-known?f=aasa'))
    expect(a.headers.get('content-type')).toBe('application/json')
    expect((await a.json()).applinks.details[0].appIDs).toEqual(['AB12CD34EF.id.mycen.app'])
    const b = await handler(new Request('https://mycen.id/api/well-known?f=assetlinks')).json()
    expect(b[0].target.sha256_cert_fingerprints).toEqual([SHA])
    expect(handler(new Request('https://mycen.id/api/well-known?f=otro')).status).toBe(404)
  })
})
