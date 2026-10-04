import { describe, expect, it } from 'vitest'
import { fitWithin } from '@/lib/imageOptimize'

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
