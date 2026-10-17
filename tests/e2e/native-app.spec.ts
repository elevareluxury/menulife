import { expect, test, type BrowserContext } from '@playwright/test'
import { createState, installSupabaseMock } from './support/mockSupabase'
import { rich } from './support/richState'

// Adentro de la app de iOS/Android (Capacitor) la web es la misma, pero su dirección no es mycen.id: los links que se
// comparten salen con mycen.id, la app abre en el acceso (sin landing ni precios) y no ofrece "Agregar a inicio".
// Se simula la app con el `window.Capacitor` que deja el runtime nativo.

async function asNativeApp(context: BrowserContext) {
  await context.addInitScript(() => {
    // El puente que expone iOS (WKWebView): @capacitor/core lo usa para saber que está en el teléfono
    const w = window as unknown as Record<string, unknown>
    w.webkit = { messageHandlers: { bridge: { postMessage: () => undefined } } }
    w.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios' }
  })
}

test('la app abre en el acceso: sin landing', async ({ page, context }) => {
  await asNativeApp(context)
  await installSupabaseMock(context, createState({}))
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})

test('en la app los links que se comparten son de mycen.id y no aparece "Agregar a inicio"', async ({ page, context }) => {
  await asNativeApp(context)
  await installSupabaseMock(context, rich(), { signedIn: true })
  await page.goto('/life')
  await expect(page.getByRole('heading', { name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar a inicio' })).toHaveCount(0)

  await page.goto('/life/settings')
  await page.getByRole('button', { name: 'Mostrar mi link' }).click()
  await expect(page.getByRole('textbox', { name: 'Tus tareas en tu calendario' })).toHaveValue(/^https:\/\/mycen\.id\/cal\/[a-f0-9]{64}\.ics$/)
})

test('en la web sigue todo igual: landing y "Agregar a inicio"', async ({ page, context }) => {
  await installSupabaseMock(context, createState({}))
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
})
