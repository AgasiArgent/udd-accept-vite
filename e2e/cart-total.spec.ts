import { expect, test } from './fixtures'

test('total counts the full quantity of the last item @udd-1', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Quantity of Paper filters (100)').fill('3')
  // 18.50 * 1 + 7.25 * 2 + 4 * 3
  await expect(page.getByTestId('total')).toHaveText('$45.00')
})
