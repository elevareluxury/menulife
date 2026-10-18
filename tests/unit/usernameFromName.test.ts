import { describe, expect, it } from 'vitest'
import { looksLikeEmail, usernameFromName } from '@/modules/studio/lib/useUsernameCheck'

// Hubo perfiles con el mail como dirección (mycen.id/nombre-gmail-com): en el registro escribieron el mail como nombre
describe('usuario sugerido desde el nombre', () => {
  it('reconoce un mail', () => {
    expect(looksLikeEmail('valen.life@gmail.com')).toBe(true)
    expect(looksLikeEmail(' ana@mail.co ')).toBe(true)
    expect(looksLikeEmail('Ana Pérez')).toBe(false)
    expect(looksLikeEmail('@ana')).toBe(false)
  })
  it('con un mail usa sólo lo de antes de la @', () => {
    expect(usernameFromName('valen.life@gmail.com')).toBe('valen-life')
  })
  it('con un nombre sigue igual', () => {
    expect(usernameFromName('Ana Pérez')).toBe('ana-perez')
  })
})
