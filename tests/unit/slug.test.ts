import { describe, expect, it } from 'vitest'
import { PROJECT_SLUG_RE, slugify, uniqueSlug } from '@/modules/studio/lib/slug'

describe('slug de proyectos', () => {
  it('arma URLs legibles', () => {
    expect(slugify('Marca Café Luna 2025')).toBe('marca-cafe-luna-2025')
    expect(slugify('  ¡Hola, Ñandú!  ')).toBe('hola-nandu')
  })

  it('siempre cumple el formato de la base y no repite', () => {
    for (const t of ['A', '', '!!!', 'x'.repeat(200), 'Café Luna']) {
      expect(uniqueSlug(t, [])).toMatch(PROJECT_SLUG_RE)
    }
    expect(uniqueSlug('Café Luna', ['cafe-luna', 'cafe-luna-2'])).toBe('cafe-luna-3')
  })
})
