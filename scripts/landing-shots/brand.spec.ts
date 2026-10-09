import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from '@playwright/test'
import sharp from 'sharp'
import { generateHuella, huellaToSvg } from '../../src/lib/huella'
import { ACCENT_COLORS, SECONDARY_COLORS, THEME_BG } from '../../src/design/themes'

// Íconos y la huella de los mails (V1 · etapa 13), desde la huella de la marca (semilla "mycen").
//   npx playwright test --config scripts/landing-shots/playwright.config.ts brand
// - design/app-icon/mycen-app-icon.svg: SVG maestro (1024, a sangre) para generar los tamaños de iOS y Android.
// - public/favicon.svg, favicon.ico, favicon-96x96.png, apple-touch-icon.png, web-app-manifest-{192,512}.png
// - public/email/huella.png: la huella en Amanecer, fondo transparente, para los mails (los clientes de correo no
//   muestran SVG).

const ROOT = process.cwd()
const huella = generateHuella('mycen', 'orbitas')
const U = { bg: THEME_BG.universo, a: ACCENT_COLORS.plasma.universo.accent, b: SECONDARY_COLORS.universo }
const A = { a: ACCENT_COLORS.plasma.amanecer.accent, b: SECONDARY_COLORS.amanecer }

/** Contenido interno del SVG de la huella (sin la etiqueta <svg>) */
function inner(colors: { a: string; b: string }, bold = false) {
  const svg = huellaToSvg(huella, { colorA: colors.a, colorB: colors.b, size: 200 })
    // Para un ícono la huella tiene que verse firme: trazos más gruesos y opacos
    .replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(Number(w) * (bold ? 2.6 : 1.8)).toFixed(2)}"`)
    .replace(/stroke-opacity="([\d.]+)"/g, (_, o) => `stroke-opacity="${Math.min(1, Number(o) * 2.2).toFixed(2)}"`)
  // En tamaños chicos el punteado se pierde: trazos llenos
  return (bold ? svg.replace(/ stroke-dasharray="[^"]*"/g, '') : svg).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

/** Ícono: fondo de Universo a sangre y la huella centrada en la zona segura (80 %) de los íconos adaptables */
function iconSvg(bold: boolean, radius = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">` +
    `<rect width="1024" height="1024" rx="${radius}" fill="${U.bg}"/>` +
    `<g transform="translate(164 164) scale(3.48)">${inner(U, bold)}</g></svg>`
}

/** ICO con PNG adentro (lo aceptan todos los navegadores actuales) */
function ico(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const dir = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0); e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...dir, ...pngs.map(p => p.data)])
}

test('íconos y huella de los mails', async () => {
  mkdirSync(join(ROOT, 'design/app-icon'), { recursive: true })
  mkdirSync(join(ROOT, 'public/email'), { recursive: true })
  const master = iconSvg(false)
  writeFileSync(join(ROOT, 'design/app-icon/mycen-app-icon.svg'), master)
  const small = iconSvg(true, 224)
  writeFileSync(join(ROOT, 'public/favicon.svg'), small)

  const png = (svg: string, size: number) => sharp(Buffer.from(svg), { density: 72 * size / 1024 * 4 }).resize(size, size).png().toBuffer()
  writeFileSync(join(ROOT, 'public/favicon-96x96.png'), await png(small, 96))
  writeFileSync(join(ROOT, 'public/favicon.ico'), ico([{ size: 32, data: await png(small, 32) }, { size: 48, data: await png(small, 48) }]))
  // iOS y Android recortan la forma: van a sangre
  writeFileSync(join(ROOT, 'public/apple-touch-icon.png'), await png(iconSvg(true), 180))
  writeFileSync(join(ROOT, 'public/web-app-manifest-192x192.png'), await png(iconSvg(true), 192))
  writeFileSync(join(ROOT, 'public/web-app-manifest-512x512.png'), await png(master, 512))

  const mail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="240" height="240">${inner(A)}</svg>`
  writeFileSync(join(ROOT, 'public/email/huella.png'), await sharp(Buffer.from(mail), { density: 288 }).resize(240, 240).png().toBuffer())
})
