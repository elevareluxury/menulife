/**
 * Generates PWA icon placeholders (icon-192.png, icon-512.png, icon-maskable.png)
 * using only Node.js built-ins — no extra deps needed.
 * Design: dark (#0F1115) background + brand-purple (#863bff) rounded rect + light lightning bolt.
 * Replace with high-quality icons at https://maskable.app
 */
import { writeFileSync } from 'node:fs'
import { deflateSync }   from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath }   from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dir, '../public')

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  CRC_TABLE[n] = c >>> 0
}
function crc32(data) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── PNG chunk builder ─────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4);  len.writeUInt32BE(data.length)
  const crc = Buffer.allocUnsafe(4);  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])))
  return Buffer.concat([len, tb, data, crc])
}

// ── Rounded rect hit-test ─────────────────────────────────────────────────────
function inRoundedRect(ix, iy, hw, hh, cr) {
  const ax = Math.abs(ix), ay = Math.abs(iy)
  if (ax > hw || ay > hh) return false
  if (ax <= hw - cr || ay <= hh - cr) return true
  return (ax - (hw - cr)) ** 2 + (ay - (hh - cr)) ** 2 <= cr * cr
}

// ── PNG writer ────────────────────────────────────────────────────────────────
function makePNG(size, getPixel) {
  const rowLen = 1 + size * 3
  const raw    = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size)
      const off = y * rowLen + 1 + x * 3
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b
    }
  }
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Icon pixel function ───────────────────────────────────────────────────────
// Colors
const BG     = [15,  17,  21]   // #0F1115
const PURPLE = [134, 59,  255]  // #863bff
const LIGHT  = [237, 230, 255]  // #EDE6FF

function iconPixel(x, y, size) {
  const cx = size / 2, cy = size / 2
  const ix = x - cx,  iy = y - cy
  const hw = size * 0.36, hh = size * 0.36, cr = size * 0.09

  if (!inRoundedRect(ix, iy, hw, hh, cr)) return BG

  // Normalized coords in the rounded rect [-1, 1]
  const nx = ix / hw
  const ny = iy / hh

  // Lightning bolt: two diagonal bands forming a "Z"
  // Top band: upper-left → center (positive slope)
  const topBand  = nx >= -0.85 && nx <= 0.15 && ny >= 0.65 * nx - 0.35 && ny <= 0.65 * nx + 0.25
  // Bottom band: center → lower-right (positive slope, offset)
  const botBand  = nx >= -0.15 && nx <= 0.85 && ny >= 0.65 * nx - 0.25 && ny <= 0.65 * nx + 0.35

  return (topBand || botBand) ? LIGHT : PURPLE
}

// Maskable variant: icon padded 10% with purple bleed-safe zone
function maskablePixel(x, y, size) {
  const pad  = Math.round(size * 0.1)
  if (x < pad || y < pad || x >= size - pad || y >= size - pad) return PURPLE
  const inner = size - 2 * pad
  return iconPixel(x - pad, y - pad, inner)
}

// ── Generate ──────────────────────────────────────────────────────────────────
console.log('Generating PWA icons...')
writeFileSync(`${PUBLIC}/icon-192.png`,    makePNG(192, iconPixel))
writeFileSync(`${PUBLIC}/icon-512.png`,    makePNG(512, iconPixel))
writeFileSync(`${PUBLIC}/icon-maskable.png`, makePNG(512, maskablePixel))
console.log('✅  icon-192.png, icon-512.png, icon-maskable.png → /public')
console.log('💡  Replace with branded icons at https://maskable.app')
