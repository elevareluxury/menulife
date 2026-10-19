import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { test, type Browser, type Page } from '@playwright/test'
import sharp from 'sharp'
import { installSupabaseMock, OWNER_ID } from '../../tests/e2e/support/mockSupabase'
import { settle } from '../../tests/e2e/support/settle'
import { ACCENT_COLORS, SECONDARY_COLORS, THEME_BG, THEME_TEXT } from '../../src/design/themes'
import { lifeState, PERSON, profileState, type Lang, type Theme } from './data'

// Capturas de las fichas de App Store y Google Play: 5 pantallas × 2 temas × 2 idiomas × 3 tamaños.
// Cada imagen = un título corto arriba + la pantalla real de la app (Vite + Supabase simulado) abajo.
// Salida: design/store-shots/{ios-6.9,ios-6.5,android}/{es,en}/{n}-{pantalla}-{tema}.png
// Sólo una combinación: STORE_SHOTS=es-universo-ios-6.9 (cualquier parte: "es", "amanecer", "android"…).

const OUT = join(process.cwd(), 'design/store-shots')
const ONLY = (process.env.STORE_SHOTS ?? '').split(/[\s,]+/).filter(Boolean)

/** Tamaños que piden las tiendas. `shotW`: ancho de la pantalla de la app dentro de la imagen. */
const SIZES = [
  { id: 'ios-6.9', w: 1320, h: 2868, title: 116, sub: 50, top: 230, shotW: 1080, bottom: 0 },
  { id: 'ios-6.5', w: 1284, h: 2778, title: 112, sub: 48, top: 222, shotW: 1050, bottom: 0 },
  // Google Play: 9:16, entre 320 y 3840 px por lado
  { id: 'android', w: 1080, h: 1920, title: 84, sub: 36, top: 140, shotW: 760, bottom: 0 },
] as const
type Size = typeof SIZES[number]

const THEMES: Theme[] = ['universo', 'amanecer']
const LANGS: Lang[] = ['es', 'en']

const COPY: Record<Lang, Record<string, [string, string]>> = {
  es: {
    identidad: ['Tu identidad', 'Tu página, con tus links y tu estilo'],
    dia: ['Tu día', 'Tres prioridades y tus tareas, sin culpa'],
    habitos: ['Tus hábitos', 'Que perdonan un día perdido'],
    metas: ['Tus metas', 'Con pasos, tareas y hábitos que suman'],
    idiomas: ['En 12 idiomas', 'Y tus datos siempre son tuyos'],
  },
  en: {
    identidad: ['Your identity', 'Your page, with your links and your style'],
    dia: ['Your day', 'Three priorities and your tasks, guilt-free'],
    habitos: ['Your habits', 'That forgive a missed day'],
    metas: ['Your goals', 'With steps, tasks and habits that add up'],
    idiomas: ['In 12 languages', 'And your data is always yours'],
  },
}

interface Screen { n: number; id: keyof typeof COPY['es']; open: (page: Page, lang: Lang, theme: Theme) => Promise<void> }

async function openLife(page: Page, lang: Lang, path: string) {
  await installSupabaseMock(page.context(), lifeState(lang), { signedIn: true, userMetadata: { name: PERSON.name, full_name: PERSON.name } })
  await page.goto(path)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}

const SCREENS: Screen[] = [
  { n: 1, id: 'identidad', open: async (page, lang, theme) => {
    await installSupabaseMock(page.context(), profileState(lang, theme))
    await page.goto(`/${PERSON.username}`)
    await page.getByRole('heading', { level: 1, name: PERSON.name }).waitFor()
  } },
  { n: 2, id: 'dia', open: async (page, lang) => {
    await openLife(page, lang, '/life')
    await page.getByText(lang === 'es' ? 'Cerrar la presentación de Luna' : 'Finish the Luna presentation').waitFor()
    // Desde "Mi día": las prioridades y las tareas de hoy, sin la tarjeta de Studio de arriba
    await page.getByText(lang === 'es' ? 'Mi día' : 'My day', { exact: true }).first().evaluate(h => { h.style.scrollMarginTop = '28px'; h.scrollIntoView({ block: 'start' }) })
  } },
  { n: 3, id: 'habitos', open: async (page, lang) => { await openLife(page, lang, '/life/habits') } },
  { n: 4, id: 'metas', open: async (page, lang) => {
    await openLife(page, lang, '/life/goals')
    await page.getByText(lang === 'es' ? 'Correr mi primera media maratón' : 'Run my first half marathon').first().click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    await settle(page)
    // Bajar hasta que se vean los pasos, las tareas y los hábitos vinculados
    // (los botones de editar/pausar quedan justo debajo del borde)
    const edit = dialog.getByRole('button', { name: lang === 'es' ? 'Editar' : 'Edit', exact: true })
    await edit.evaluate(btn => {
      let scroller = btn.parentElement
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 20 && getComputedStyle(scroller).overflowY !== 'visible')) scroller = scroller.parentElement
      if (scroller) scroller.scrollTop += btn.getBoundingClientRect().top - scroller.getBoundingClientRect().bottom + 12
    })
  } },
  { n: 5, id: 'idiomas', open: async (page, lang) => {
    await openLife(page, lang, '/life/settings')
    await page.getByRole('radio', { name: 'Español' }).waitFor()
    await page.evaluate(() => {
      document.querySelector('[role="radiogroup"] [lang="es"]')?.closest('[role="radiogroup"]')?.scrollIntoView({ block: 'center' })
    })
  } },
]

/** La pantalla de la app, a la medida exacta del hueco que tiene en la imagen (sin reescalar) */
async function appShot(browser: Browser, screen: Screen, lang: Lang, theme: Theme, size: Size): Promise<Buffer> {
  const cssW = 390
  const holeH = size.h - size.top - Math.round(size.title * 1.25) - Math.round(size.sub * 1.5) - 90 - size.bottom
  const cssH = Math.round(holeH / size.shotW * cssW)
  const context = await browser.newContext({
    viewport: { width: cssW, height: cssH }, deviceScaleFactor: size.shotW / cssW, isMobile: true, hasTouch: true,
    locale: lang === 'es' ? 'es-AR' : 'en-US', colorScheme: theme === 'amanecer' ? 'light' : 'dark', reducedMotion: 'reduce',
    baseURL: 'http://mycen.id',
  })
  await context.addInitScript(([l, uid]) => {
    try {
      localStorage.setItem('mycen_lang', l)
      // Sin bienvenidas ni "nuevos comienzos": la pantalla tal como se ve un día cualquiera
      const d = new Date()
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      for (const p of ['seen', 'fresh']) localStorage.setItem(`mycen.life.${p}.${uid}`, k)
    } catch { /* sin almacenamiento */ }
  }, [lang, OWNER_ID] as const)
  const page = await context.newPage()
  try {
    await screen.open(page, lang, theme)
    await page.addStyleTag({ content: '[data-rht-toaster], .toaster, [role="status"][aria-live] { display: none !important; } *::-webkit-scrollbar { display: none }' })
    await page.evaluate(() => document.fonts.ready)
    await settle(page)
    await page.waitForTimeout(300)
    return await page.screenshot({ type: 'png' })
  } finally {
    await context.close()
  }
}

const require = createRequire(import.meta.url)
const fontDir = join(dirname(require.resolve('@fontsource/geist/package.json')), 'files')
const font = (w: number, sub: string) => readFileSync(join(fontDir, `geist-${sub}-${w}-normal.woff2`)).toString('base64')
const FONT_CSS = [600, 400].flatMap(w => ['latin', 'latin-ext'].map(sub =>
  `@font-face{font-family:Geist;font-weight:${w};src:url(data:font/woff2;base64,${font(w, sub)}) format('woff2')}`)).join('')

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

/** La imagen final: fondo del tema, título y bajada arriba, la pantalla de la app abajo con bordes redondeados */
async function compose(browser: Browser, shot: Buffer, screen: Screen, lang: Lang, theme: Theme, size: Size): Promise<Buffer> {
  const [title, sub] = COPY[lang][screen.id]
  const bg = THEME_BG[theme]
  const text = THEME_TEXT[theme]
  const accent = ACCENT_COLORS.plasma[theme].accent
  const second = SECONDARY_COLORS[theme]
  const meta = await sharp(shot).metadata()
  const shotH = Math.round(meta.height! * size.shotW / meta.width!)
  const glow = theme === 'universo' ? 0.38 : 0.22
  const r = Math.round(size.shotW * 0.075)
  const html = `<!doctype html><html><head><style>${FONT_CSS}
    *{margin:0;box-sizing:border-box}
    html,body{width:${size.w}px;height:${size.h}px;overflow:hidden}
    body{position:relative;font-family:Geist,sans-serif;text-align:center;
      background:
        radial-gradient(60% 40% at 15% 8%, ${hexA(accent, glow)}, transparent 70%),
        radial-gradient(55% 35% at 92% 30%, ${hexA(second, glow * 0.7)}, transparent 70%),
        ${bg}}
    h1{position:absolute;left:0;right:0;top:${size.top}px;font-size:${size.title}px;font-weight:600;letter-spacing:-0.035em;line-height:1.05;color:${text.text}}
    p{position:absolute;left:8%;right:8%;top:${size.top + Math.round(size.title * 1.25)}px;font-size:${size.sub}px;font-weight:400;line-height:1.3;color:${text.muted};letter-spacing:-0.01em}
    img{position:absolute;left:${(size.w - size.shotW) / 2}px;bottom:${size.bottom}px;width:${size.shotW}px;height:${shotH}px;
      border-radius:${r}px ${r}px 0 0;
      box-shadow:0 0 0 ${Math.max(2, Math.round(size.shotW * 0.006))}px ${theme === 'universo' ? 'rgba(255,255,255,.14)' : 'rgba(26,21,48,.10)'},
        0 ${Math.round(size.shotW * 0.03)}px ${Math.round(size.shotW * 0.1)}px ${theme === 'universo' ? 'rgba(0,0,0,.6)' : 'rgba(26,21,48,.18)'}}
  </style></head><body><h1>${title}</h1><p>${sub}</p><img src="data:image/png;base64,${shot.toString('base64')}"></body></html>`
  const context = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  try {
    await page.setContent(html)
    await page.evaluate(() => document.fonts.ready)
    // Las tiendas no aceptan transparencia: PNG RGB sin canal alfa
    return await sharp(await page.screenshot({ type: 'png' })).removeAlpha().png({ compressionLevel: 9 }).toBuffer()
  } finally {
    await context.close()
  }
}

for (const size of SIZES) {
  for (const lang of LANGS) {
    for (const theme of THEMES) {
      const name = `${lang}-${theme}-${size.id}`
      if (ONLY.length && !ONLY.every(o => name.includes(o))) continue
      test(name, async ({ browser }) => {
        const dir = join(OUT, size.id, lang)
        mkdirSync(dir, { recursive: true })
        for (const screen of SCREENS) {
          const shot = await appShot(browser, screen, lang, theme, size)
          const png = await compose(browser, shot, screen, lang, theme, size)
          await sharp(png).toFile(join(dir, `${screen.n}-${screen.id}-${theme}.png`))
        }
      })
    }
  }
}
