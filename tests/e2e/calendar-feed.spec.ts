import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// V1.1 · Tareas en el calendario por link privado (beta: ?beta=1).

test.use({ viewport: { width: 390, height: 844 } })

test('crear, copiar, cambiar y apagar el link del calendario', async ({ page, context }) => {
  const state = createState({ profiles: [profileRow()] })
  await installSupabaseMock(context, state, { signedIn: true })

  await page.goto('/life/settings')
  await expect(page.getByRole('heading', { name: 'Tus tareas en tu calendario' })).toHaveCount(0)

  await page.goto('/life/settings?beta=1')
  await page.getByRole('button', { name: 'Mostrar mi link' }).click()
  const link = page.getByRole('textbox', { name: 'Tus tareas en tu calendario' })
  await expect(link).toHaveValue(/^http:\/\/localhost:\d+\/cal\/[a-f0-9]{64}\.ics$/)
  const first = await link.inputValue()
  const token = first.match(/[a-f0-9]{64}/)![0]
  await expect(page.getByRole('link', { name: 'Agregar a Google Calendar' }))
    .toHaveAttribute('href', `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`webcal://${new URL(first).host}/cal/${token}.ics`)}`)
  await expect(page.getByRole('link', { name: 'Agregar al iPhone o la Mac' })).toHaveAttribute('href', /^webcal:\/\/.+\/cal\/[a-f0-9]{64}\.ics$/)

  await page.getByRole('button', { name: 'Cambiar link' }).click()
  await page.getByRole('alertdialog', { name: '¿Cambiar el link?' }).getByRole('button', { name: 'Cambiar link' }).click()
  await expect(page.getByText('Listo: link nuevo.', { exact: false })).toBeVisible()
  await expect(link).not.toHaveValue(first)

  await page.getByRole('button', { name: 'Apagar' }).click()
  await expect(page.getByRole('button', { name: 'Mostrar mi link' })).toBeVisible()
  expect(state.tables.life_calendar_feeds).toEqual([])
})
