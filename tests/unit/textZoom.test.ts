import { describe, expect, it } from 'vitest'
import { TEXT_ZOOM_MAX, textZoomFor } from '../../src/lib/textZoom'

// Tamaño de letra del celular en la app: el del sistema, nunca más chico que 100 % y con tope para no desarmar pantallas.
describe('textZoomFor', () => {
  it('tamaño normal o más chico: 100 %', () => {
    expect(textZoomFor(1)).toBe(1)
    expect(textZoomFor(0.85)).toBe(1)
  })
  it('más grande: el del sistema, redondeado', () => {
    expect(textZoomFor(1.176470588)).toBe(1.18)
    expect(textZoomFor(1.3)).toBe(1.3)
  })
  it('tamaños de accesibilidad: el tope', () => {
    expect(textZoomFor(2)).toBe(TEXT_ZOOM_MAX)
    expect(textZoomFor(3.1)).toBe(TEXT_ZOOM_MAX)
  })
  it('valor raro: 100 %', () => {
    expect(textZoomFor(Number.NaN)).toBe(1)
    expect(textZoomFor(Number.POSITIVE_INFINITY)).toBe(1)
  })
})
