import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, readDraft, writeDraft } from '../../src/lib/editDraft'

// Borradores de lo que se está editando (sobreviven a que el celular recargue la pestaña al volver).
describe('editDraft', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
    })
  })

  it('guarda, lee y borra', () => {
    writeDraft('module:p:m', { title: 'Hola' }, 1000)
    expect(readDraft('module:p:m', 2000)).toEqual({ title: 'Hola' })
    clearDraft('module:p:m')
    expect(readDraft('module:p:m', 2000)).toBeNull()
  })

  it('a las 12 horas ya no vale', () => {
    writeDraft('brain:new', { title: 'Vieja' }, 0)
    expect(readDraft('brain:new', 12 * 60 * 60 * 1000 + 1)).toBeNull()
  })

  it('sin sessionStorage (bloqueado) no rompe', () => {
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') }, removeItem: () => { throw new Error('bloqueado') } })
    expect(() => writeDraft('x', 1)).not.toThrow()
    expect(readDraft('x')).toBeNull()
    expect(() => clearDraft('x')).not.toThrow()
  })
})
