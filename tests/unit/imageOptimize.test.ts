import { describe, expect, it } from 'vitest'
import { fitWithin, isOpaque } from '@/lib/imageOptimize'

// Imágenes al subir (Lanzamiento L1): se achican al lado máximo, sin deformar ni agrandar.
describe('fitWithin', () => {
  it('achica manteniendo la proporción', () => {
    expect(fitWithin(4032, 3024, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWithin(3024, 4032, 640)).toEqual({ width: 480, height: 640 })
  })
  it('no agranda las chicas', () => {
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })
  it('nunca da 0 px en imágenes muy angostas', () => {
    expect(fitWithin(10000, 2, 1000)).toEqual({ width: 1000, height: 1 })
  })
})

// Sin WebP (Safari en iPhone) un PNG opaco (capturas) pasa a JPEG; con transparencia (logos) queda PNG achicado
describe('isOpaque', () => {
  it('es opaco si todos los píxeles tienen alfa 255', () => {
    expect(isOpaque([10, 20, 30, 255, 0, 0, 0, 255])).toBe(true)
  })
  it('no es opaco si algún píxel es transparente o semitransparente', () => {
    expect(isOpaque([10, 20, 30, 255, 0, 0, 0, 0])).toBe(false)
    expect(isOpaque([10, 20, 30, 128])).toBe(false)
  })
})
