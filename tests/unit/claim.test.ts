import { describe, expect, it } from 'vitest'
import { claimFromMetadata, claimLink, claimMetadata, claimSuggestions, parseClaim } from '../../src/lib/claim'
import { normalizeUsername, validUsername } from '../../src/lib/username'
import { CLAIM } from '../../src/i18n/app/claim'
import { APP_LANGS } from '../../src/i18n/app/languages'

describe('"Elegí tu nombre": link al registro', () => {
  it('lleva el nombre y desde dónde; desde un perfil conserva el referido', () => {
    expect(claimLink('ana', 'hero')).toBe('/register?u=ana&desde=hero')
    expect(claimLink('ana', 'pie', { ref: 'lucia', purpose: 'creator' })).toBe('/register?u=ana&desde=pie&ref=lucia&tipo=creator')
    expect(claimLink('ana', 'pie', { ref: 'lucia', purpose: null })).toBe('/register?u=ana&desde=pie&ref=lucia')
  })

  it('el registro sólo acepta nombres con el formato válido y lugares conocidos', () => {
    expect(parseClaim('?u=Ana&desde=cierre')).toEqual({ username: 'ana', from: 'cierre' })
    expect(parseClaim('?u=ana&desde=otro')).toEqual({ username: 'ana', from: null })
    expect(parseClaim('?u=a')).toBeNull()
    expect(parseClaim('?u=ana--luz')).toBeNull()
    expect(parseClaim('?u=<script>')).toBeNull()
    expect(parseClaim('')).toBeNull()
  })

  it('ida y vuelta por los datos de la cuenta', () => {
    const c = { username: 'ana-luz', from: 'perfil' as const }
    expect(claimFromMetadata(claimMetadata(c))).toEqual(c)
    expect(claimMetadata(null)).toEqual({})
    expect(claimFromMetadata({ claimed_username: 'ana', claim_from: 'x' })).toEqual({ username: 'ana', from: null })
    expect(claimFromMetadata({ claimed_username: 'no válido' })).toBeNull()
    expect(claimFromMetadata(undefined)).toBeNull()
  })
})

describe('alternativas cuando el nombre está tomado', () => {
  it('son distintas al original y todas tienen formato válido', () => {
    const s = claimSuggestions('ana', 2026)
    expect(s).toEqual(['ana-id', 'ana-me', 'ana26', 'hey-ana'])
    expect(s.every(validUsername)).toBe(true)
  })

  it('con el largo máximo siguen entrando en 30 caracteres', () => {
    const long = 'a'.repeat(30)
    expect(claimSuggestions(long).every(x => x.length <= 30 && validUsername(x))).toBe(true)
  })
})

describe('normalizeUsername', () => {
  it('pasa a minúsculas, saca tildes y cambia espacios por guiones', () => {
    expect(normalizeUsername('Ana Lucía  Pérez')).toBe('ana-lucia-perez')
    expect(normalizeUsername('--hola')).toBe('hola')
  })
})

describe('textos en los 12 idiomas', () => {
  it('cada idioma tiene todas las claves, sin vacíos, y {name} donde va', () => {
    const keys = Object.keys(CLAIM.es).sort()
    for (const lang of APP_LANGS) {
      const d = CLAIM[lang]
      expect(Object.keys(d).sort(), lang).toEqual(keys)
      for (const v of Object.values(d)) expect(v.trim(), lang).not.toBe('')
      expect(d.freeTitle, lang).toContain('{name}')
    }
  })
})
