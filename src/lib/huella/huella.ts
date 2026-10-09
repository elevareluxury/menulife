/**
 * Huella Mycen — generador determinista.
 *
 * TypeScript puro, sin DOM: funciona en el navegador y en funciones Edge (api/og).
 * Misma semilla + mismo estilo = misma huella, siempre.
 *
 * Uso:
 *   const h = generateHuella(`${profile.id}:${profile.huella_salt ?? ''}`, 'orbitas')
 *   const svg = huellaToSvg(h, { colorA: '#FF7A59', colorB: '#7DD3FC', size: 300 })
 */

export type HuellaVariant = 'orbitas' | 'hilos' | 'constelacion' | 'pulso'

export const HUELLA_VARIANTS: readonly HuellaVariant[] = ['orbitas', 'hilos', 'constelacion', 'pulso']

export interface HuellaStroke {
  /** Path SVG en un viewBox de 200 × 200 */
  d: string
  width: number
  /** Valor de stroke-dasharray ('none' = línea continua) */
  dash: string
  opacity: number
}

export interface Huella {
  seed: string
  variant: HuellaVariant
  /** Hash de la semilla, útil para ids únicos en el SVG */
  hash: number
  strokes: HuellaStroke[]
}

const TAU = Math.PI * 2
const MAX_STROKES = 16

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: generador pseudoaleatorio chico, rápido y determinista */
function makeRandom(hash: number): () => number {
  let state = hash || 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fx = (n: number): string => n.toFixed(2)
const polyline = (pts: Array<[number, number]>): string =>
  'M' + pts.map(([x, y]) => `${fx(x)} ${fx(y)}`).join('L')

function orbitas(rnd: () => number): HuellaStroke[] {
  const out: HuellaStroke[] = []
  const sy = 0.86 + rnd() * 0.12
  const rot = rnd() * Math.PI
  const a1 = 0.05 + rnd() * 0.07, f1 = 2 + Math.floor(rnd() * 3), p1 = rnd() * TAU
  const a2 = 0.02 + rnd() * 0.04, f2 = 4 + Math.floor(rnd() * 4), p2 = rnd() * TAU
  const cr = Math.cos(rot), sr = Math.sin(rot)
  for (let i = 0; i < 15; i++) {
    const r = 10 + i * 5.3
    const gap = 0.25 + rnd() * 0.6
    const g0 = rnd() * TAU
    const pts: Array<[number, number]> = []
    for (let k = 0; k <= 90; k++) {
      const t = g0 + gap / 2 + ((TAU - gap) * k) / 90
      const rr = r * (1 + a1 * Math.sin(f1 * t + p1 + i * 0.33) + a2 * Math.sin(f2 * t + p2 - i * 0.21))
      const x = rr * Math.cos(t), y = rr * Math.sin(t) * sy
      pts.push([100 + x * cr - y * sr, 100 + x * sr + y * cr])
    }
    out.push({ d: polyline(pts), width: 1.5, dash: '0.01 2.6', opacity: Math.max(0.25, 0.95 - i * 0.045) })
  }
  return out
}

function hilos(rnd: () => number): HuellaStroke[] {
  const out: HuellaStroke[] = []
  for (let i = 0; i < 16; i++) {
    const cx = 100 + (rnd() - 0.5) * 90
    const cy = 165 + rnd() * 80
    const R = 55 + i * 6 + rnd() * 12
    const a0 = Math.PI * (1.05 + rnd() * 0.25)
    const a1 = Math.PI * (1.95 - rnd() * 0.25)
    const wob = rnd() * 4
    const pts: Array<[number, number]> = []
    for (let k = 0; k <= 70; k++) {
      const t = a0 + ((a1 - a0) * k) / 70
      pts.push([cx + R * Math.cos(t) + wob * Math.sin(t * 5 + i), cy + R * Math.sin(t) * 0.78])
    }
    const main = i === 0
    out.push({
      d: polyline(pts),
      width: main ? 2.2 : 1.3,
      dash: main ? '0.01 1.7' : '0.01 2.5',
      opacity: main ? 1 : 0.3 + rnd() * 0.6,
    })
  }
  return out
}

function constelacion(rnd: () => number): HuellaStroke[] {
  const pts: Array<[number, number]> = []
  let guard = 0
  while (pts.length < 22 && guard < 600) {
    guard++
    const ang = rnd() * TAU
    const rad = 18 + Math.sqrt(rnd()) * 70
    const p: [number, number] = [100 + rad * Math.cos(ang), 100 + rad * Math.sin(ang) * 0.92]
    if (pts.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 17)) pts.push(p)
  }
  const seen = new Set<string>()
  const segments: string[] = []
  pts.forEach((p, i) => {
    pts
      .map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])] as const)
      .filter(([j]) => j !== i)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 2)
      .forEach(([j]) => {
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`
        if (seen.has(key)) return
        seen.add(key)
        const q = pts[j]
        segments.push(`M${fx(p[0])} ${fx(p[1])}L${fx(q[0])} ${fx(q[1])}`)
      })
  })
  const dot = (p: [number, number]) => `M${fx(p[0])} ${fx(p[1])}l0.01 0`
  return [
    { d: segments.join(''), width: 0.7, dash: 'none', opacity: 0.55 },
    { d: pts.slice(4).map(dot).join(''), width: 3.2, dash: 'none', opacity: 0.9 },
    { d: pts.slice(0, 4).map(dot).join(''), width: 6.5, dash: 'none', opacity: 1 },
    { d: 'M8 100A92 84 0 1 1 192 100A92 84 0 1 1 8 100', width: 0.9, dash: '0.01 4', opacity: 0.35 },
  ]
}

function pulso(rnd: () => number): HuellaStroke[] {
  const out: HuellaStroke[] = []
  const c0 = rnd() * TAU
  const kf = 16 + Math.floor(rnd() * 10)
  const amp = 3 + rnd() * 5
  const ph = rnd() * TAU
  for (let i = 0; i < 12; i++) {
    const r = 14 + i * 6.8
    const ai = amp * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.7 + ph)))
    const pts: Array<[number, number]> = []
    for (let k = 0; k <= 120; k++) {
      const t = (TAU * k) / 120
      const dd = Math.atan2(Math.sin(t - c0), Math.cos(t - c0))
      const env = Math.exp(-(dd * dd) / (2 * 0.38 * 0.38))
      const rr = r + env * ai * Math.sin(kf * t)
      pts.push([100 + rr * Math.cos(t), 100 + rr * Math.sin(t)])
    }
    out.push({ d: polyline(pts) + 'Z', width: 1.4, dash: '0.01 2.3', opacity: Math.max(0.3, 1 - i * 0.06) })
  }
  return out
}

const GENERATORS: Record<HuellaVariant, (rnd: () => number) => HuellaStroke[]> = {
  orbitas,
  hilos,
  constelacion,
  pulso,
}

export function generateHuella(seed: string, variant: HuellaVariant = 'orbitas'): Huella {
  const hash = hashSeed(seed)
  const gen = GENERATORS[variant] ?? orbitas
  const strokes = gen(makeRandom(hash)).slice(0, MAX_STROKES)
  return { seed, variant, hash, strokes }
}

export interface HuellaSvgOptions {
  colorA: string
  colorB: string
  size?: number
  /** Fondo opcional (por ejemplo para imágenes OG o el QR) */
  background?: string
}

const escapeAttr = (s: string) => s.replace(/[^#a-zA-Z0-9(),.%\s-]/g, '')

/** SVG completo como texto: para OG, QR, exportaciones y el ícono del perfil */
export function huellaToSvg(h: Huella, opts: HuellaSvgOptions): string {
  const size = opts.size ?? 300
  const id = `hg${h.hash.toString(36)}${h.variant}`
  const a = escapeAttr(opts.colorA)
  const b = escapeAttr(opts.colorB)
  const bg = opts.background ? `<rect width="200" height="200" fill="${escapeAttr(opts.background)}"/>` : ''
  const paths = h.strokes
    .map(
      s =>
        `<path d="${s.d}" fill="none" stroke="url(#${id})" stroke-width="${s.width}" ` +
        `stroke-dasharray="${s.dash}" stroke-linecap="round" stroke-opacity="${fx(s.opacity)}"/>`,
    )
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" aria-hidden="true">` +
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="20" y1="185" x2="185" y2="15">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    bg +
    paths +
    `</svg>`
  )
}
