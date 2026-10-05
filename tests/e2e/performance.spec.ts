import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'
import { MODULE_FIXTURES } from './support/moduleFixtures'

// Lanzamiento L1: la página pública carga sólo lo suyo, las imágenes se optimizan y se puede hacer zoom.

test('el perfil público no descarga la landing, gráficos, animaciones ni fuentes de Google', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()], profile_modules: MODULE_FIXTURES.map(f => structuredClone(f.row)) }))
  const requested: string[] = []
  page.on('request', r => requested.push(r.url()))
  await page.goto('/ana')
  await expect(page.getByRole('heading', { level: 1, name: 'Ana Pérez' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  const forbidden = /recharts|framer-motion|\/gsap|splitting|three(\.min)?\.js|fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|modules\/landing|\/components\/landing/
  expect(requested.filter(u => forbidden.test(u))).toEqual([])
  // La tipografía sale de Mycen
  expect(requested.some(u => u.includes('@fontsource/geist'))).toBe(true)
})

test('se puede hacer zoom en toda la app', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  for (const path of ['/', '/studio', '/ana']) {
    await page.goto(path)
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport, path).not.toMatch(/user-scalable=no|maximum-scale=1/)
  }
})

test('una foto grande se achica y se sube en WebP', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
  await page.goto('/studio/identity')
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ana Pérez')

  // Una "foto" de 3000 × 2000 con ruido (no se comprime fácil), como la de un celular
  const png = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 3000; c.height = 2000
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(3000, 2000)
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 7919) % 251
    ctx.putImageData(img, 0, 0)
    return c.toDataURL('image/png').split(',')[1]
  }), 'base64')

  const upload = page.waitForRequest(r => r.method() === 'POST' && r.url().includes('/storage/v1/object/profile-media/'))
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })
  const req = await upload
  expect(req.url()).toMatch(/\.webp$/)
  const body = req.postDataBuffer()
  expect(body?.length ?? Infinity).toBeLessThan(png.length / 2)
})
