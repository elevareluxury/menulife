import { expect, test } from '@playwright/test'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// El aviso general de "sin conexión" sale en el idioma de quien mira (también en la página pública) y una sola vez.

test.use({ locale: 'en-US' })

test('sin conexión: aviso en el idioma del visitante, y aviso breve al volver', async ({ page, context }) => {
  await installSupabaseMock(context, createState({ profiles: [profileRow({ status: 'published' })] }))
  await page.goto('/ana')
  await expect(page.getByRole('heading', { name: 'Ana Pérez' })).toBeVisible()

  await context.setOffline(true)
  const banner = page.getByRole('status').filter({ hasText: 'You’re offline' })
  await expect(banner).toHaveCount(1)
  await expect(page.getByText('Sin conexión')).toHaveCount(0)

  await context.setOffline(false)
  await expect(banner).toHaveCount(0)
  await expect(page.getByText('You’re back online')).toBeVisible()
})
