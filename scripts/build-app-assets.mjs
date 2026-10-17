// Íconos y pantalla de carga de la app (iOS y Android) a partir del ícono maestro de la marca
// (design/app-icon/mycen-app-icon.svg, lo genera brand.spec.ts). Se dibujan con el Chromium de Playwright:
//   node scripts/build-app-assets.mjs
// Volver a correrlo si cambia el ícono maestro. No corre en CI.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from '@playwright/test'

const MASTER = readFileSync('design/app-icon/mycen-app-icon.svg', 'utf8')
const BG = MASTER.match(/<rect[^>]*fill="(#[0-9A-Fa-f]{6})"/)[1]
// La huella sola (sin el fondo), con margen alrededor: `share` = qué parte del lado ocupa la huella (en el maestro, 0,68)
const mark = share => {
  const pad = Math.round((696 / share - 1024) / 2)
  return MASTER.replace(/<rect[^>]*\/>/, '').replace('viewBox="0 0 1024 1024"', `viewBox="${-pad} ${-pad} ${1024 + 2 * pad} ${1024 + 2 * pad}"`)
}

// Mismo Chromium que los E2E (playwright.config.ts) si está; si no, el de Playwright
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch(existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {})
const page = await browser.newPage()
async function render(file, size, svg, { bg = 'transparent', round = false } = {}) {
  const [w, h] = Array.isArray(size) ? size : [size, size]
  await page.setViewportSize({ width: w, height: h })
  const box = Math.min(w, h)
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center;overflow:hidden">
    <div style="width:${box}px;height:${box}px;${round ? 'border-radius:50%;overflow:hidden;' : ''}">${svg.replace(/width="1024" height="1024"/, `width="${box}" height="${box}"`)}</div></body></html>`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, await page.screenshot({ omitBackground: bg === 'transparent' }))
}

// iOS: un solo ícono de 1024 (sin transparencia) y la pantalla de carga (la huella chica sobre el cielo de Universo)
await render('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024, MASTER, { bg: BG })
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
  await render(`ios/App/App/Assets.xcassets/Splash.imageset/${f}`, 2732, mark(0.22), { bg: BG })

// Android: íconos clásicos, redondos y adaptativos (frente sobre el fondo de color) en cada densidad
const RES = 'android/app/src/main/res'
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(DENSITIES)) {
  await render(`${RES}/mipmap-${d}/ic_launcher.png`, 48 * k, MASTER, { bg: BG })
  await render(`${RES}/mipmap-${d}/ic_launcher_round.png`, 48 * k, MASTER, { round: true })
  // Zona segura del ícono adaptativo: el sistema recorta hasta un 33 %; la huella ocupa el 55 % del lienzo de 108 dp
  await render(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, 108 * k, mark(0.55))
  await render(`${RES}/drawable-port-${d}/splash.png`, [Math.round(320 * k), Math.round(480 * k)], mark(0.22), { bg: BG })
  await render(`${RES}/drawable-land-${d}/splash.png`, [Math.round(480 * k), Math.round(320 * k)], mark(0.22), { bg: BG })
}
await render(`${RES}/drawable/splash.png`, [480, 800], mark(0.22), { bg: BG })
writeFileSync(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`)

await browser.close()
console.log('Íconos y pantallas de carga listos (fondo', BG + ')')
