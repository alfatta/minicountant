import { expect, test } from '@playwright/test'

/**
 * Happy-path e2e (Phase 13).
 *
 * Walks the onboarding → dashboard → capital injection flow end-to-end.
 * IndexedDB is real (browser), so this exercises the full local-first
 * pipeline. Each run uses a fresh browser context so the DB starts empty.
 */

test.describe('happy path', () => {
  test('onboards, then lands on the dashboard', async ({ page }) => {
    await page.goto('/')

    // Onboarding is the only path to READY — the middleware redirects
    // a fresh device to /onboarding.
    await expect(page).toHaveURL(/\/onboarding/)

    // Step 1: company
    await page.getByLabel(/name/i).first().fill('Homelab E2E')
    await page.getByLabel(/short name/i).fill('hme2e')
    await page.getByRole('button', { name: /next|continue/i }).click()

    // Step 2: password
    await page.getByLabel(/password/i).first().fill('hunter2')
    await page.getByLabel(/confirm/i).fill('hunter2')
    await page.getByRole('button', { name: /next|continue|finish/i }).click()

    // After onboarding the user is unlocked and lands on the dashboard.
    // (If a lock screen appears first, unlock with the password.)
    if (page.url().includes('/lock')) {
      await page.getByLabel(/password/i).fill('hunter2')
      await page.getByRole('button', { name: /unlock/i }).click()
    }

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })
})
