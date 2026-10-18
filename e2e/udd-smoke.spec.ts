import { expect, test } from './fixtures'

test('home page loads for the signed-in test account', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Shopping cart' })).toBeVisible()
})
