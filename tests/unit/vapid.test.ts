import { describe, expect, it } from 'vitest'
import { fromBase64Url, generateCronSecret, generateVapidKeys, toBase64Url, vapidPublicKeyValid } from '@/modules/super-admin/lib/vapid'
import { keyBytes } from '@/lib/webPush'

// Generador de claves del panel (Estado → Avisos push): mismo formato que `npx web-push generate-vapid-keys`, el que
// valida npm:web-push en la función life-reminders (pública 65 bytes, privada 32, base64url sin relleno).

const subtle = globalThis.crypto.subtle

/** Vuelve a armar las dos claves a partir del texto, como haría la función y el navegador */
async function importBack(publicKey: string, privateKey: string) {
  const pub = fromBase64Url(publicKey)!
  const d = fromBase64Url(privateKey)!
  const jwk: JsonWebKey = {
    kty: 'EC', crv: 'P-256', d: toBase64Url(d), x: toBase64Url(pub.slice(1, 33)), y: toBase64Url(pub.slice(33, 65)), ext: true,
  }
  const priv = await subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const verifyKey = await subtle.importKey('raw', pub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return { priv, verifyKey }
}

describe('generateVapidKeys', () => {
  it('pública = punto sin comprimir de 65 bytes (87 caracteres); privada = 32 bytes (43 caracteres), base64url', async () => {
    const { publicKey, privateKey } = await generateVapidKeys()
    expect(publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/)
    expect(privateKey).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const pub = fromBase64Url(publicKey)!
    expect(pub.length).toBe(65)
    expect(pub[0]).toBe(0x04)
    expect(fromBase64Url(privateKey)!.length).toBe(32)
    expect(vapidPublicKeyValid(publicKey)).toBe(true)
  })

  it('el par se vuelve a importar y firma/verifica (la privada corresponde a la pública)', async () => {
    const { publicKey, privateKey } = await generateVapidKeys()
    const { priv, verifyKey } = await importBack(publicKey, privateKey)
    const data = new TextEncoder().encode('{"aud":"https://fcm.googleapis.com","sub":"mailto:team@mycen.id"}')
    const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, data)
    expect(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, sig, data)).toBe(true)
    // Con la pública de otro par, no verifica
    const other = await generateVapidKeys()
    const { verifyKey: otherKey } = await importBack(other.publicKey, other.privateKey)
    expect(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, otherKey, sig, data)).toBe(false)
  })

  it('cada vez da un par distinto', async () => {
    const a = await generateVapidKeys()
    const b = await generateVapidKeys()
    expect(a.publicKey).not.toBe(b.publicKey)
    expect(a.privateKey).not.toBe(b.privateKey)
  })

  it('la app lee la pública igual que pushManager.subscribe (keyBytes)', async () => {
    const { publicKey } = await generateVapidKeys()
    expect([...keyBytes(publicKey)]).toEqual([...fromBase64Url(publicKey)!])
  })
})

describe('vapidPublicKeyValid', () => {
  it('rechaza lo que no es una clave pública', async () => {
    const { publicKey, privateKey } = await generateVapidKeys()
    expect(vapidPublicKeyValid('')).toBe(false)
    expect(vapidPublicKeyValid(null)).toBe(false)
    expect(vapidPublicKeyValid(privateKey)).toBe(false)
    expect(vapidPublicKeyValid(publicKey.slice(0, 80))).toBe(false)
    expect(vapidPublicKeyValid(`"${publicKey}"`)).toBe(false)
    expect(vapidPublicKeyValid(publicKey.replace(/^./, 'A'))).toBe(false)
  })
  it('acepta la de web-push con relleno o espacios de más', async () => {
    const { publicKey } = await generateVapidKeys()
    expect(vapidPublicKeyValid(`${publicKey}=`)).toBe(true)
    expect(vapidPublicKeyValid(` ${publicKey} `)).toBe(true)
  })
})

describe('generateCronSecret', () => {
  it('40 letras y números, distinta cada vez', () => {
    const a = generateCronSecret()
    expect(a).toMatch(/^[A-Za-z0-9]{40}$/)
    expect(generateCronSecret()).not.toBe(a)
    expect(generateCronSecret(64)).toHaveLength(64)
  })
})
