import { expect, test } from '@playwright/test'
import { lookupFurniture } from '../src/furniture/catalog'
import { parseLayoutJson, toLayoutJson, type Layout } from '../src/room/layoutJson'
import { stressLayout } from '../src/room/layouts'
import { coveredCells, pieceLimit, toWorld, type Placement } from '../src/room/placement'

const GRID = 12
const MAX_PIECES = pieceLimit(GRID)

const EMPTY: Layout = { floor: 'wood', wall: 'ivory', placements: [] }
const parse = (value: unknown) => {
  const r = parseLayoutJson(JSON.stringify(value), EMPTY, GRID)
  if ('error' in r) throw new Error(r.error)
  return r
}

// Pure-logic checks for the saved layout JSON. No browser needed.
test.describe('layout json', () => {
  test('round trip keeps every placement', () => {
    const layout: Layout = { floor: 'check', wall: 'strawberry', placements: stressLayout(30, GRID) }
    const { layout: back, dropped } = parse(toLayoutJson(layout))
    expect(dropped).toBe(0)
    expect(back).toEqual(layout)
  })

  test('30 pieces stay under 10 KB', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(toLayoutJson({ ...EMPTY, placements: stressLayout(30, GRID) }))).length
    console.log('layout json 30 pieces', bytes, 'bytes')
    expect(bytes).toBeLessThan(10 * 1024)
  })

  test('rotated 3x2 desk restores to the same cells and position', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const desk: Placement = { furnitureId: 'computer_desk', x: 2, y: 3, rotation }
      const [back] = parse(toLayoutJson({ ...EMPTY, placements: [desk] })).layout.placements
      const size = lookupFurniture('computer_desk').size
      expect(coveredCells(back, size)).toEqual(coveredCells(desk, size))
      expect(toWorld(back, size)).toEqual(toWorld(desk, size))
    }
  })

  test('bad pieces are dropped, the rest is kept', () => {
    const { layout, dropped } = parse({
      v: 1,
      floor: 'lava', // unknown floor -> fallback
      wall: 'skycheck',
      items: [
        { id: 'bed', x: 0, y: 0, r: 0 },
        { id: 'plant_pot', x: 1, y: 1, r: 0 }, // overlaps the bed
        { id: 'computer_desk', x: GRID - 2, y: 0, r: 0 }, // 3 wide, 2 cells from the right wall: outside
        { id: 'sofa', x: 4, y: 4, r: 0 }, // not in the catalog
        { id: 'plant_pot', x: 4, y: 4, r: 45 }, // bad rotation
        { id: 'plant_pot', x: 4.5, y: 4, r: 0 }, // not a cell
        null,
        { id: 'plant_pot', x: GRID - 1, y: GRID - 1, r: 270 },
      ],
    })
    expect(dropped).toBe(6)
    expect(layout.floor).toBe('wood')
    expect(layout.wall).toBe('skycheck')
    expect(layout.placements.map((p) => [p.furnitureId, p.x, p.y])).toEqual([['bed', 0, 0], ['plant_pot', GRID - 1, GRID - 1]])
  })

  test('pieces past the room limit are cut', () => {
    const items = Array.from({ length: MAX_PIECES + 10 }, (_, i) => ({ id: 'plant_pot', x: i % GRID, y: Math.floor(i / GRID), r: 0 }))
    const { layout, dropped } = parse({ v: 1, floor: 'wood', wall: 'ivory', items })
    expect(layout.placements).toHaveLength(MAX_PIECES)
    expect(dropped).toBe(10)
  })

  test('broken or unknown versions are rejected', () => {
    expect(parseLayoutJson('{oops', EMPTY, GRID)).toEqual({ error: 'invalid-json' })
    expect(parseLayoutJson(JSON.stringify({ v: 2, items: [] }), EMPTY, GRID)).toEqual({ error: 'unsupported' })
    expect(parseLayoutJson('null', EMPTY, GRID)).toEqual({ error: 'unsupported' })
  })
})

test('saved layout comes back after reload', async ({ page }) => {
  await page.goto('/dev/room')
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })

  // change floor, wall, rotate the desk, move the plant, add a plant
  await page.getByRole('radiogroup', { name: '바닥' }).getByRole('radio', { name: '카펫' }).click()
  await page.getByRole('radiogroup', { name: '벽지' }).getByRole('radio', { name: '하늘 체크' }).click()
  await page.evaluate(() => {
    const s = window.__miniroomRoom!()
    s.select(1)
    window.__miniroomRoom!().rotateSelected()
    window.__miniroomRoom!().addFurniture('plant_pot')
  })
  await expect(page.getByText('저장 안 됨')).toBeVisible()
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('저장했어요')
  await expect(page.getByText('저장 안 됨')).toHaveCount(0)
  const before = await page.evaluate(() => {
    const s = window.__miniroomRoom!()
    return { floor: s.floor, wall: s.wall, placements: s.placements }
  })
  expect(before.placements[1]).toMatchObject({ furnitureId: 'computer_desk', x: 3, y: 0, rotation: 90 })
  expect(before.placements).toHaveLength(4)

  await page.reload()
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })
  const after = await page.evaluate(() => {
    const s = window.__miniroomRoom!()
    return { floor: s.floor, wall: s.wall, placements: s.placements }
  })
  expect(after).toEqual(before)
  await expect(page.getByRole('radiogroup', { name: '바닥' }).getByRole('radio', { name: '카펫' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('저장 안 됨')).toHaveCount(0)
})

test('unsaved changes are not restored, and ?stress ignores the saved layout', async ({ page }) => {
  await page.goto('/dev/room')
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })
  await page.evaluate(() => window.__miniroomRoom!().addFurniture('plant_pot'))
  await page.reload()
  await page.waitForFunction(() => window.__miniroomRoom != null)
  expect(await page.evaluate(() => window.__miniroomRoom!().placements.length)).toBe(3)

  await page.evaluate(() => localStorage.setItem('miniroom.layout', JSON.stringify({ v: 1, floor: 'wood', wall: 'ivory', items: [] })))
  await page.goto('/dev/room?stress=30')
  await page.waitForFunction(() => window.__miniroomRoom != null)
  expect(await page.evaluate(() => window.__miniroomRoom!().placements.length)).toBe(30)
})
