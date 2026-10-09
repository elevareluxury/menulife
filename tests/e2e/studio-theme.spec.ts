import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createState, installSupabaseMock, profileRow } from './support/mockSupabase'

// Studio con el sistema de diseño (V1 · etapa 07): sigue el tema del celular y cumple WCAG AA en los dos.
for (const [scheme, theme] of [['dark', 'universo'], ['light', 'amanecer']] as const) {
  for (const path of ['/studio', '/studio/spaces', '/studio/messages', '/studio/settings']) {
    test(`Studio en ${theme} (${path}) pasa axe`, async ({ page, context }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await installSupabaseMock(context, createState({ profiles: [profileRow()] }), { signedIn: true })
      await page.goto(path)
      await expect(page.locator('.st-root')).toHaveAttribute('data-mycen-theme', theme)
      await expect(page.locator('h1.st-title')).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
    })
  }
}
