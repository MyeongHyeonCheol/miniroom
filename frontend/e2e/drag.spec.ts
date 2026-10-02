import { expect, test, type Page } from '@playwright/test'
import { SIGNUP_SIDE as GRID } from '../src/room/placement'

// Default layout: bed (0,0) 2x4, computer desk (3,0) 3x2, plant (6,0) 1x1. All rotation 0.
const BED = 0
const DESK = 1
const PLANT = 2

async function openRoom(page: Page, query = '') {
  await page.goto(`/${query}`)
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })
  await page.waitForFunction(() => (window.__miniroomStats?.drawCalls ?? 0) > 0)
}

/** Screen point of (x, y) in cells, `h` meters above the floor. */
const screen = (page: Page, x: number, y: number, h = 0) =>
  page.evaluate(([x, y, h]) => window.__miniroomCellToScreen!(x, y, h), [x, y, h] as const)

const placement = (page: Page, i: number) => page.evaluate((i) => window.__miniroomRoom!().placements[i], i)

/** Grab a point on a model and move it by (dx, dy) cells, keeping the grab height. */
async function drag(page: Page, from: [number, number, number], dx: number, dy: number, release = true) {
  const a = await screen(page, ...from)
  const b = await screen(page, from[0] + dx, from[1] + dy, from[2])
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  if (release) await page.mouse.up()
}

test('drag a piece to a free cell', async ({ page }) => {
  await openRoom(page)
  await drag(page, [6.5, 0.5, 0.3], 0, 5) // plant pot body
  expect(await placement(page, PLANT)).toMatchObject({ furnitureId: 'plant_pot', x: 6, y: 5, rotation: 0 })
})

test('dropping on another piece snaps back with a notice', async ({ page }) => {
  await openRoom(page)
  await drag(page, [6.5, 0.5, 0.3], -2, 1, false) // onto the desk's cell (4,1)
  expect(await page.evaluate(() => window.__miniroomRoom!().drag?.valid)).toBe(false)
  await page.mouse.up()
  expect(await placement(page, PLANT)).toMatchObject({ x: 6, y: 0 })
  await expect(page.getByRole('status')).toHaveText('다른 가구와 겹쳐서 놓을 수 없어요')
})

test('dragging past the wall is blocked', async ({ page }) => {
  await openRoom(page)
  // bed is 4 cells deep: moving it GRID - 3 cells forward pushes its footprint past the front edge
  await drag(page, [1, 2, 0.5], 0, GRID - 3)
  expect(await placement(page, BED)).toMatchObject({ x: 0, y: 0 })
  await expect(page.getByRole('status')).toHaveText('방 밖으로 나가서 놓을 수 없어요')
})

test('select, rotate keeps the anchor cell, then delete', async ({ page }) => {
  await openRoom(page)
  const monitor = await screen(page, 4.5, 1, 1.0) // desk center, CRT height
  await page.mouse.click(monitor.x, monitor.y)
  expect(await page.evaluate(() => window.__miniroomRoom!().selected)).toBe(DESK)
  await expect(page.getByTestId('selection-actions')).toBeVisible()

  await page.keyboard.press('r')
  expect(await placement(page, DESK)).toMatchObject({ furnitureId: 'computer_desk', x: 3, y: 0, rotation: 90 })
  await page.getByRole('button', { name: '회전 (R)' }).click()
  expect(await placement(page, DESK)).toMatchObject({ x: 3, y: 0, rotation: 180 })

  await page.keyboard.press('Delete')
  const ids = await page.evaluate(() => window.__miniroomRoom!().placements.map((p) => p.furnitureId))
  expect(ids).toEqual(['bed', 'plant_pot'])
  await expect(page.getByTestId('selection-actions')).toHaveCount(0)
})

test('clicking the floor clears the selection', async ({ page }) => {
  await openRoom(page)
  const plant = await screen(page, 6.5, 0.5, 0.3)
  await page.mouse.click(plant.x, plant.y)
  expect(await page.evaluate(() => window.__miniroomRoom!().selected)).toBe(PLANT)
  const floor = await screen(page, 5.5, 5.5)
  await page.mouse.click(floor.x, floor.y)
  expect(await page.evaluate(() => window.__miniroomRoom!().selected)).toBeNull()
})

test('furniture panel adds pieces and stops at the room limit (45 in a 12x12 room)', async ({ page }) => {
  await openRoom(page)
  await page.getByRole('button', { name: /화분/ }).click()
  await expect.poll(() => page.evaluate(() => window.__miniroomRoom!().placements.length)).toBe(4)

  await openRoom(page, '?stress=45')
  await expect(page.getByRole('button', { name: /화분/ })).toBeDisabled()
  await expect(page.getByText('가구는 45개까지 놓을 수 있어요')).toBeVisible()
})

test('30 pieces: draw calls stay within budget while dragging', async ({ page }) => {
  await openRoom(page, '?stress=30')
  const p = await placement(page, 0) // a bed; grab it at its footprint center
  const w = p.rotation % 180 === 0 ? 2 : 4
  const d = p.rotation % 180 === 0 ? 4 : 2
  await drag(page, [p.x + w / 2, p.y + d / 2, 0.5], 1, 0, false)
  expect(await page.evaluate(() => window.__miniroomRoom!().drag)).not.toBeNull()
  await page.waitForTimeout(700) // one stats sample while dragging
  const stats = await page.evaluate(() => window.__miniroomStats!)
  console.log('drag stress30', JSON.stringify({ fps: stats.fps, drawCalls: stats.drawCalls, triangles: stats.triangles }))
  expect(stats.drawCalls).toBeLessThanOrEqual(100)
  await page.mouse.up()
})
