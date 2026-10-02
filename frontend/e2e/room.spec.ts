import { expect, test, type Page } from '@playwright/test'

async function waitForRoom(page: Page) {
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })
  // at least one stats sample after loading
  await page.waitForFunction(() => (window.__miniroomStats?.drawCalls ?? 0) > 0)
  return page.evaluate(() => window.__miniroomStats!)
}

test('room renders with furniture and no errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/dev/room')
  await expect(page.locator('canvas')).toBeVisible()
  const stats = await waitForRoom(page)
  expect(stats.loadedTypes.sort()).toEqual(['bed', 'computer_desk', 'plant_pot'])
  expect(stats.furnitureReadyMs).toBeLessThan(3000)
  expect(errors).toEqual([])
})

test('30 pieces stay within the draw-call budget', async ({ page }) => {
  await page.goto('/dev/room?stress=30')
  const stats = await waitForRoom(page)
  await expect(page.locator('[data-stat="가구"]')).toHaveText('30개한도 45')
  expect(stats.drawCalls).toBeLessThanOrEqual(100)
})

test('floor and wallpaper can be switched', async ({ page }) => {
  await page.goto('/dev/room')
  await waitForRoom(page)
  const floor = page.getByRole('radiogroup', { name: '바닥' })
  await floor.getByRole('radio', { name: '체크 장판' }).click()
  await expect(floor.getByRole('radio', { name: '체크 장판' })).toHaveAttribute('aria-checked', 'true')
  await expect(floor.getByRole('radio', { name: '원목 마루' })).toHaveAttribute('aria-checked', 'false')

  const wall = page.getByRole('radiogroup', { name: '벽지' })
  await wall.getByRole('radio', { name: '딸기' }).click()
  await expect(wall.getByRole('radio', { name: '딸기' })).toHaveAttribute('aria-checked', 'true')
})

test('shadow toggle', async ({ page }) => {
  await page.goto('/dev/room')
  await waitForRoom(page)
  const button = page.getByRole('button', { name: /그림자/ })
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
})
