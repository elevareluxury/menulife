// Campo de estrellas del sistema de diseño (docs/design/DESIGN_SYSTEM.md §6): una imagen SVG liviana y repetible,
// así las estrellas no son elementos del DOM. Determinista (misma semilla → mismo archivo).
//   node scripts/generate-starfield.mjs   → public/design/stars-universo.svg y stars-amanecer.svg
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'design')
const MAX_BYTES = 8 * 1024

function random(seed) {
  let s = seed
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = n => Number(n.toFixed(1)).toString()

/** Estrellas en un lienzo de w×h. `top` limita la altura (0–1) y `maxOpacity` el brillo. */
function starfield({ seed, w, h, count, color, top = 1, maxOpacity = 1 }) {
  const rnd = random(seed)
  const stars = []
  for (let i = 0; i < count; i++) {
    const y = Math.pow(rnd(), 1.6) * h * top // más densas arriba
    const x = rnd() * w
    const big = rnd() > 0.9
    const r = big ? 0.9 + rnd() * 0.5 : 0.35 + rnd() * 0.45
    // en amanecer se apagan a medida que bajan
    const fade = top < 1 ? 1 - y / (h * top) : 1
    const o = Math.max(0.12, (0.25 + rnd() * 0.75) * maxOpacity * fade)
    stars.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" opacity="${o.toFixed(2)}"/>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="${color}">${stars.join('')}</svg>\n`
}

const files = {
  'stars-universo.svg': starfield({ seed: 20261, w: 480, h: 480, count: 110, color: '#FFFFFF' }),
  'stars-amanecer.svg': starfield({ seed: 20262, w: 480, h: 360, count: 26, color: '#3A2E6E', top: 0.45, maxOpacity: 0.45 }),
}

mkdirSync(OUT, { recursive: true })
for (const [name, svg] of Object.entries(files)) {
  const bytes = Buffer.byteLength(svg)
  if (bytes > MAX_BYTES) throw new Error(`${name}: ${bytes} bytes (máximo ${MAX_BYTES})`)
  writeFileSync(join(OUT, name), svg)
  console.log(`${name}: ${bytes} bytes`)
}
