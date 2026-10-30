import { deflateSync } from 'zlib'
import type { BrowserContext } from '@playwright/test'

// Imágenes reales para las pruebas (antes las fotos de los módulos apuntaban a direcciones que no cargaban, así que
// nunca se veía cómo queda una foto de verdad). https://img.test/<ancho>x<alto>.png devuelve un PNG de ese tamaño
// (degradé con franjas, para notar recortes y deformaciones); "-alpha" lo hace con fondo transparente (un logo) y
// https://img.test/rota.jpg responde 404 (una foto que se borró).

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

export function testPng(width: number, height: number, alpha = false): Buffer {
  const row = width * 4 + 1
  const raw = Buffer.alloc(row * height)
  for (let y = 0; y < height; y++) {
    raw[y * row] = 0
    for (let x = 0; x < width; x++) {
      const i = y * row + 1 + x * 4
      const stripe = Math.floor((x + y) / Math.max(8, Math.min(width, height) / 8)) % 2
      if (alpha) {
        // Un círculo de color en el centro; afuera, transparente
        const dx = x - width / 2, dy = y - height / 2, inside = dx * dx + dy * dy < (Math.min(width, height) * 0.4) ** 2
        raw[i] = 255; raw[i + 1] = 122; raw[i + 2] = 89; raw[i + 3] = inside ? 255 : 0
      } else {
        raw[i] = Math.round((x / width) * 200) + (stripe ? 40 : 0)
        raw[i + 1] = Math.round((y / height) * 180)
        raw[i + 2] = stripe ? 200 : 120
        raw[i + 3] = 255
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

export const img = (w: number, h: number, alpha = false) => `https://img.test/${w}x${h}${alpha ? '-alpha' : ''}.png`
export const BROKEN_IMG = 'https://img.test/rota.jpg'

export async function installTestImages(context: BrowserContext) {
  await context.route('https://img.test/**', route => {
    const m = /\/(\d+)x(\d+)(-alpha)?\.png$/.exec(new URL(route.request().url()).pathname)
    if (!m) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'cache-control': 'max-age=3600' },
      body: testPng(Math.min(+m[1], 2400), Math.min(+m[2], 2400), !!m[3]) })
  })
}
