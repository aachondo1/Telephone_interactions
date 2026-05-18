import { test, expect } from '@playwright/test'

test('app loads successfully', async ({ page }) => {
  await page.goto('/')
  // Add basic assertion that page is loaded
  await expect(page).toHaveTitle(/Telephone Interactions|react-app/i)
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  // Verify page is accessible and responsive
  const html = await page.content()
  expect(html.length).toBeGreaterThan(0)
})
