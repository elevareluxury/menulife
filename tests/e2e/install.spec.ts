import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock } from './support/mockSupabase'

// "Agregar a inicio": en el iPhone muestra los pasos; si Mycen ya está instalado, no aparece.

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

function lifeState() {
  const state = createState()
  state.tables.life_brain_items = []
  state.tables.life_habits = []
  state.tables.life_habit_logs = []
  state.tables.life_daily_reviews = []
  return state
}

test.describe('en el iPhone', () => {
  test.use({ userAgent: IPHONE_UA, viewport: { width: 390, height: 844 } })

  test('Mi día explica cómo agregar Mycen a inicio', async ({ page, context }) => {
    await installSupabaseMock(context, lifeState(), { signedIn: true })
    await page.goto('/life')
    await page.getByRole('button', { name: 'Agregar a inicio' }).click()
    const sheet = page.getByRole('dialog', { name: 'Tené Mycen en tu inicio' })
    await expect(sheet.getByRole('listitem')).toHaveCount(3)
    await expect(sheet).toContainText('Agregar a inicio')
    const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })
})

test('si ya está instalado no se muestra', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('mycen_pwa_installed', 'true'))
  await installSupabaseMock(context, lifeState(), { signedIn: true })
  await page.goto('/life')
  await expect(page.getByRole('heading', { level: 1, name: 'Mi día' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar a inicio' })).toHaveCount(0)
})
