import { describe, expect, it } from 'vitest'
import { authErrorMessage, authFailureForReport, authErrorRef, signupMaybeCreated } from '../../src/lib/authErrors'
import es from '../../src/i18n/app/auth/es'

// Los errores de Supabase se traducen a mensajes claros; si no se reconocen, el genérico.
describe('authErrorMessage', () => {
  const e = es.errors
  it('una contraseña que Supabase rechaza explica por qué (no el genérico)', () => {
    expect(authErrorMessage({ code: 'weak_password', message: 'Password should contain at least one character of each: abc, 123' }, e, 'x')).toBe(e.weakPassword)
    expect(authErrorMessage({ code: 'weak_password', message: 'Password is known to be weak and easy to guess, please choose a different one.' }, e, 'x')).toBe(e.weakPassword)
    expect(authErrorMessage({ message: 'Password should be at least 8 characters.' }, e, 'x')).toBe(e.weakPassword)
  })
  it('lo desconocido usa el genérico, con su código si lo hay (nunca el mensaje)', () => {
    expect(authErrorMessage({ message: 'algo raro' }, e, 'genérico')).toBe('genérico')
    expect(authErrorMessage({ status: 400, code: 'email_address_not_authorized', message: 'Email address "a@b.com" cannot be used' }, e, 'genérico'))
      .toBe('genérico (email_address_not_authorized)')
    expect(authErrorMessage({ status: 403, message: 'x' }, e, 'genérico')).toBe('genérico (HTTP 403)')
    expect(authErrorMessage({ status: 422, code: 'email_exists', message: 'x' }, e, 'genérico')).toBe(e.alreadyRegistered)
    expect(authErrorRef({ code: 'Raro con espacios' })).toBeNull()
  })
  it('un email que Supabase da por inválido lo dice', () => {
    expect(authErrorMessage({ status: 400, code: 'email_address_invalid', message: 'Email address "x@y.co" is invalid' }, e, 'g')).toBe(e.invalidEmail)
  })
  it('lo que va al registro del equipo no lleva el email', () => {
    const r = authFailureForReport({ status: 400, code: 'x_y', message: 'Email address "valentina@gmail.com" cannot be used 1234567' }, 'register')
    expect(r.message).toBe('Auth register: x_y · Email address "<email>" cannot be used <n>')
  })
})

// El servidor cortó el registro (5xx): la cuenta suele crearse y el mail sale igual
describe('signupMaybeCreated', () => {
  it('error del servidor o timeout → pedir que revise el email', () => {
    expect(signupMaybeCreated({ status: 504, message: '{}' })).toBe(true)
    expect(signupMaybeCreated({ status: 500, message: 'Error sending confirmation email' })).toBe(true)
    expect(signupMaybeCreated({ message: 'Gateway Timeout' })).toBe(true)
  })
  it('sin conexión o errores conocidos del registro → no', () => {
    expect(signupMaybeCreated({ status: 0, message: 'Failed to fetch' })).toBe(false)
    expect(signupMaybeCreated({ status: 422, message: 'User already registered' })).toBe(false)
    expect(signupMaybeCreated({ status: 429, message: 'Email rate limit exceeded' })).toBe(false)
    expect(signupMaybeCreated(null)).toBe(false)
  })
})
