import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { IMAGE_QUALITY, IMAGE_WIDTHS, MEDIA_PATH, imageCdnOn, imageSrcset } from '@/modules/profile/lib/imageCdn'

// Fotos del perfil al tamaño en que se muestran (LCP en celular) con la optimización de imágenes de Vercel.
const PREFIX = 'https://abc.supabase.co' + MEDIA_PATH
const PHOTO = PREFIX + 'u1/foto.jpeg'

describe('imageSrcset', () => {
  it('arma un candidato por ancho con la URL codificada', () => {
    const set = imageSrcset(PHOTO, PREFIX, [256, 640], 75)
    expect(set).toBe(
      `/_vercel/image?url=${encodeURIComponent(PHOTO)}&w=256&q=75 256w, /_vercel/image?url=${encodeURIComponent(PHOTO)}&w=640&q=75 640w`,
    )
  })

  it('deja afuera otras carpetas, GIF animados y SVG', () => {
    expect(imageSrcset('https://abc.supabase.co/storage/v1/object/public/otra/x.jpg', PREFIX, [256], 75)).toBe('')
    expect(imageSrcset('https://i.ytimg.com/vi/x/hq.jpg', PREFIX, [256], 75)).toBe('')
    expect(imageSrcset(PREFIX + 'u1/anim.GIF', PREFIX, [256], 75)).toBe('')
    expect(imageSrcset(PREFIX + 'u1/logo.svg', PREFIX, [256], 75)).toBe('')
  })

  it('funciona igual inyectada como texto en index.html (scripts/profilePrefetch.ts)', () => {
    const injected = new Function(`return (${String(imageSrcset)})`)() as typeof imageSrcset
    const onInjected = new Function(`return (${String(imageCdnOn)})`)() as typeof imageCdnOn
    expect(injected(PHOTO, PREFIX, IMAGE_WIDTHS, IMAGE_QUALITY)).toBe(imageSrcset(PHOTO, PREFIX, IMAGE_WIDTHS, IMAGE_QUALITY))
    expect(onInjected('https:', 'mycen.id')).toBe(true)
  })
})

describe('imageCdnOn', () => {
  it('sólo en un sitio https que no sea local (no existe /_vercel/image en dev, E2E ni la app nativa)', () => {
    expect(imageCdnOn('https:', 'mycen.id')).toBe(true)
    expect(imageCdnOn('https:', 'menulife-git-rama.vercel.app')).toBe(true)
    expect(imageCdnOn('http:', 'localhost')).toBe(false)
    expect(imageCdnOn('https:', 'localhost')).toBe(false)
    expect(imageCdnOn('http:', '127.0.0.1')).toBe(false)
    expect(imageCdnOn('capacitor:', 'localhost')).toBe(false)
  })
})

describe('vercel.json: optimización de imágenes', () => {
  const { images } = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8')) as {
    images: { sizes: number[]; qualities: number[]; remotePatterns: Array<{ hostname: string; pathname: string }> }
  }

  it('permite los anchos y la calidad que pide el perfil (si no, Vercel responde 400)', () => {
    expect(images.sizes).toEqual([...IMAGE_WIDTHS])
    expect(images.qualities).toContain(IMAGE_QUALITY)
  })

  it('sólo optimiza la carpeta pública de fotos del perfil', () => {
    expect(images.remotePatterns).toHaveLength(1)
    expect(new RegExp(images.remotePatterns[0].pathname).test(MEDIA_PATH + 'u1/foto.jpeg')).toBe(true)
    expect(new RegExp(images.remotePatterns[0].pathname).test('/storage/v1/object/public/otra/x.jpg')).toBe(false)
  })
})
