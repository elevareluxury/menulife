import { describe, expect, it } from 'vitest'
import { reminderId } from '@/modules/life/lib/nativeReminders'

describe('reminderId', () => {
  it('es estable, positivo y entra en 31 bits', () => {
    const a = reminderId('task', 'abc:123')
    expect(reminderId('task', 'abc:123')).toBe(a)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThanOrEqual(0x7fffffff)
  })
  it('cambia con la clave y con el tipo', () => {
    expect(reminderId('task', 'abc:123')).not.toBe(reminderId('task', 'abc:124'))
    expect(reminderId('task', 'abc:123')).not.toBe(reminderId('habit', 'abc:123'))
  })
})
