import { describe, expect, it } from 'vitest'
import { authErrorMessage } from '../../src/lib/authErrors'
import es from '../../src/i18n/app/auth/es'

// Los errores de Supabase se traducen a mensajes claros; si no se reconocen, el genérico.
describe('authErrorMessage', () => {
  const e = es.errors
  it('una contraseña que Supabase rechaza explica por qué (no el genérico)', () => {
    expect(authErrorMessage({ code: 'weak_password', message: 'Password should contain at least one character of each: abc, 123' }, e, 'x')).toBe(e.weakPassword)
    expect(authErrorMessage({ code: 'weak_password', message: 'Password is known to be weak and easy to guess, please choose a different one.' }, e, 'x')).toBe(e.weakPassword)
    expect(authErrorMessage({ message: 'Password should be at least 8 characters.' }, e, 'x')).toBe(e.weakPassword)
  })
  it('lo desconocido usa el genérico', () => {
    expect(authErrorMessage({ message: 'algo raro' }, e, 'genérico')).toBe('genérico')
  })
})
