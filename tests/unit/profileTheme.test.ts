import { describe, expect, it } from 'vitest'
import { QUIET, themeVars } from '@/modules/profile/lib/profileTheme'

const vars = (theme: Parameters<typeof themeVars>[0]) => themeVars(theme) as Record<string, string>

describe('themeVars', () => {
  it('usa el acento cuando tiene contraste suficiente', () => {
    expect(vars({ mode: 'dark', accent: '#F4705A' })['--p-accent']).toBe('#F4705A')
  })

  it('cae al color de texto si el acento no se lee sobre el fondo', () => {
    expect(vars({ mode: 'dark', accent: '#151715' })['--p-accent']).toBe(QUIET.ivory)
    expect(vars({ mode: 'light', accent: '#F5F5F0' })['--p-accent']).toBe(QUIET.obsidian)
  })

  it('oscuro por defecto con los tokens de Mycen', () => {
    const v = vars(undefined)
    expect(v['--p-bg']).toBe(QUIET.obsidian)
    expect(v['--p-text']).toBe(QUIET.ivory)
  })
})
