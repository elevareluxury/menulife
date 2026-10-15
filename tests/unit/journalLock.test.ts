import { describe, expect, it } from 'vitest'
import {
  checkPin, createLock, hashPin, IDLE_MS, isIdle, isValidPin, lockKey, PBKDF2_ITERATIONS, readLock, remainingWait,
  unlocked, waitAfter, writeLock, type JournalLock,
} from '@/modules/life/lib/journalLock'

// Diario privado: bloqueo en el dispositivo (PIN con hash, espera creciente, inactividad). Reloj simulado: `now`.

const FAST = 1_000 // vueltas de PBKDF2 para que los tests no tarden; el valor real se prueba aparte

function memoryStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }
}

describe('isValidPin', () => {
  it('acepta de 4 a 8 dígitos y nada más', () => {
    for (const ok of ['1234', '00000000', '987654']) expect(isValidPin(ok)).toBe(true)
    for (const bad of ['123', '123456789', '12a4', ' 1234', '', '١٢٣٤', '12.4']) expect(isValidPin(bad)).toBe(false)
  })
})

describe('hash del PIN', () => {
  it('nunca guarda el PIN, usa sal y la cantidad de vueltas real', async () => {
    const lock = await createLock('2580')
    expect(lock.iterations).toBe(PBKDF2_ITERATIONS)
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000)
    expect(JSON.stringify(lock)).not.toContain('2580')
    expect(atob(lock.salt)).toHaveLength(16)
    expect(atob(lock.hash)).toHaveLength(32)
  })

  it('misma clave con otra sal da otro hash; el mismo PIN y sal, el mismo', async () => {
    const a = await createLock('1234', { iterations: FAST })
    const b = await createLock('1234', { iterations: FAST })
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    const salt = Uint8Array.from(atob(a.salt), c => c.charCodeAt(0))
    expect(await hashPin('1234', salt, FAST)).toBe(a.hash)
  })

  it('no crea un bloqueo con un PIN inválido', async () => {
    await expect(createLock('12', { iterations: FAST })).rejects.toThrow('invalid_pin')
  })
})

describe('checkPin y espera creciente', () => {
  it('el PIN correcto desbloquea y borra los errores', async () => {
    const lock = { ...(await createLock('4321', { iterations: FAST })), failures: 1 }
    const r = await checkPin(lock, '4321', 1_000)
    expect(r.ok).toBe(true)
    expect(r.lock.failures).toBe(0)
  })

  it('espera 0, 0, 30 s, 1 min, 2 min… hasta 15 min', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map(waitAfter)).toEqual([0, 0, 30_000, 60_000, 120_000, 240_000, 480_000, 900_000, 900_000])
  })

  it('con reloj simulado: después del 3.er error hay que esperar y durante la espera ni el PIN correcto entra', async () => {
    let lock: JournalLock = await createLock('2468', { iterations: FAST })
    let now = 1_000_000
    for (const expected of [0, 0, 30_000]) {
      const r = await checkPin(lock, '0000', now)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.waitMs).toBe(expected)
      lock = r.lock
    }
    expect(lock.failures).toBe(3)
    expect(remainingWait(lock, now)).toBe(30_000)

    now += 10_000
    const during = await checkPin(lock, '2468', now)
    expect(during.ok).toBe(false)
    if (!during.ok) expect(during.waitMs).toBe(20_000)
    expect(during.lock).toBe(lock) // no suma otro error

    now += 20_000
    const wrong = await checkPin(lock, '1111', now)
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.waitMs).toBe(60_000)
    lock = wrong.lock

    now += 60_000
    const right = await checkPin(lock, '2468', now)
    expect(right.ok).toBe(true)
    expect(right.lock).toMatchObject({ failures: 0, lockedUntil: 0 })
  })

  it('un texto que no es PIN cuenta como error', async () => {
    const lock = await createLock('1234', { iterations: FAST })
    const r = await checkPin(lock, 'abcd', 0)
    expect(r.ok).toBe(false)
    expect(r.lock.failures).toBe(1)
  })

  it('unlocked borra errores y espera (también después de la huella)', () => {
    const l = { v: 1, salt: 'a', hash: 'b', iterations: 1, credentialId: 'x', failures: 4, lockedUntil: 99 } as JournalLock
    expect(unlocked(l)).toMatchObject({ failures: 0, lockedUntil: 0, credentialId: 'x' })
  })
})

describe('inactividad', () => {
  it('se bloquea a los 5 minutos sin uso', () => {
    expect(IDLE_MS).toBe(300_000)
    expect(isIdle(0, 299_999)).toBe(false)
    expect(isIdle(0, 300_000)).toBe(true)
  })
})

describe('guardado en el dispositivo', () => {
  it('guarda, lee y borra por cuenta; ignora registros rotos', async () => {
    const s = memoryStorage()
    const lock = await createLock('1234', { iterations: FAST, credentialId: 'cred-1' })
    writeLock('u1', lock, s)
    expect(readLock('u1', s)).toEqual(lock)
    expect(readLock('u2', s)).toBeNull()
    expect(s.m.get(lockKey('u1'))).not.toContain('1234')

    s.setItem(lockKey('u3'), '{roto')
    expect(readLock('u3', s)).toBeNull()
    s.setItem(lockKey('u4'), JSON.stringify({ v: 2, salt: 'a', hash: 'b', iterations: 1 }))
    expect(readLock('u4', s)).toBeNull()

    writeLock('u1', null, s)
    expect(readLock('u1', s)).toBeNull()
  })

  it('sin almacenamiento (o si tira error) no rompe', () => {
    const throwing = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(readLock('u', throwing)).toBeNull()
    expect(() => writeLock('u', null, throwing)).not.toThrow()
    expect(readLock('u', null)).toBeNull()
  })
})
