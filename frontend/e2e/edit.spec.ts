import { expect, test, type Page } from '@playwright/test'

// Edit mode on my room (docs/screens.md "4. 꾸미기 모드"), with a faked backend.
const MY_SLUG = 'k3x9m2qa'
const FRIEND_SLUG = 'f7riend0'
const ME = { nickname: '명현', needsSignup: false, mySlug: MY_SLUG, newGuestbookCount: 0 }
// bed (0,0) 2x4, desk (3,0) 3x2, plant (6,0) 1x1
const ITEMS = [
  { id: 'bed', x: 0, y: 0, r: 0 },
  { id: 'computer_desk', x: 3, y: 0, r: 0 },
  { id: 'plant_pot', x: 6, y: 0, r: 0 },
]
const PLANT = 2

type Put = { body: { items: { id: string; x: number; y: number; r: number }[]; floor: string }; csrf?: string }

async function fakeApi(page: Page, opts: { me?: object; putAnswer?: { status: number; json: object }; pieces?: number } = {}) {
  const puts: Put[] = []
  let layout: object = { v: 1, floor: 'wood', wall: 'ivory', backdrop: 'island', items: ITEMS }
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'tok-e', url: 'http://localhost:5173' }])
  await page.route('**/api/me', (r) => r.fulfill({ json: opts.me ?? ME }))
  await page.route('**/api/terms', (r) => r.fulfill({ json: [] }))
  const room = (slug: string) => ({
    slug,
    owner: { nickname: slug === MY_SLUG ? '명현' : '친구' },
    isMine: slug === MY_SLUG,
    size: 12,
    limits: { pieces: opts.pieces ?? 45, wallSlotsPerWall: 3 },
    layout,
    visits: { today: 0, total: 0 },
    updatedAt: '2026-10-02T13:33:51+09:00',
  })
  await page.route('**/api/rooms/me/layout', (r) => {
    puts.push({ body: r.request().postDataJSON(), csrf: r.request().headers()['x-xsrf-token'] })
    if (opts.putAnswer) return r.fulfill(opts.putAnswer)
    layout = { ...r.request().postDataJSON(), backdrop: 'island' }
    return r.fulfill({ json: room(MY_SLUG) })
  })
  await page.route(new RegExp(`/api/rooms/(${MY_SLUG}|${FRIEND_SLUG})$`), (r) =>
    r.fulfill({ json: room(new URL(r.request().url()).pathname.split('/').pop()!) }),
  )
  return puts
}

const state = (page: Page) =>
  page.evaluate(() => {
    const s = window.__miniroomRoom!()
    return { editable: s.editable, invalid: s.invalid, plant: s.placements[2], pieces: s.placements.length, limit: s.limit }
  })

async function waitForFurniture(page: Page) {
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 20_000 })
}

const screen = (page: Page, x: number, y: number, h = 0) =>
  page.evaluate(([x, y, h]) => window.__miniroomCellToScreen!(x, y, h), [x, y, h] as const)

async function dragPlant(page: Page, dy: number) {
  const a = await screen(page, 6.5, 0.5, 0.3)
  const b = await screen(page, 6.5, 0.5 + dy, 0.3)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  await page.mouse.up()
}

async function openEditor(page: Page) {
  await page.goto(`/r/${MY_SLUG}`)
  await page.getByRole('button', { name: '꾸미기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}?edit`)
  await expect(page.getByRole('region', { name: '방 꾸미기' })).toBeVisible()
  await waitForFurniture(page)
}

test('edit button only on my own room after signup', async ({ page }) => {
  await fakeApi(page)
  await page.goto(`/r/${FRIEND_SLUG}`)
  await expect(page.getByRole('heading', { name: '친구님의 미니룸' })).toBeVisible()
  await expect(page.getByRole('button', { name: '꾸미기' })).toHaveCount(0)
  await page.goto(`/r/${MY_SLUG}`)
  await expect(page.getByRole('button', { name: '꾸미기' })).toBeVisible()
})

test('someone else room with ?edit just shows the room', async ({ page }) => {
  await fakeApi(page)
  await page.goto(`/r/${FRIEND_SLUG}?edit`)
  await expect(page).toHaveURL(`/r/${FRIEND_SLUG}`)
  await expect(page.getByRole('region', { name: '방 꾸미기' })).toHaveCount(0)
  expect((await state(page)).editable).toBe(false)
})

test('before signup ?edit is not the editor', async ({ page }) => {
  await fakeApi(page, { me: { ...ME, nickname: null, needsSignup: true } })
  await page.goto(`/r/${MY_SLUG}?edit`)
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await expect(page.getByRole('region', { name: '방 꾸미기' })).toHaveCount(0)
})

test('looking at my room: dragging a piece does not move it', async ({ page }) => {
  await fakeApi(page)
  await openEditor(page)
  // Screen points of the plant while the editor (and its cell helper) is on, then leave and drag there
  const a = await screen(page, 6.5, 0.5, 0.3)
  const b = await screen(page, 6.5, 5.5, 0.3)
  await page.getByRole('button', { name: '나가기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 8 })
  await page.mouse.up()
  expect(await state(page)).toMatchObject({ editable: false, plant: { x: 6, y: 0 } })
})

test('move a piece and save: PUT with the layout and CSRF, then the room stays as saved', async ({ page }) => {
  const puts = await fakeApi(page)
  await openEditor(page)
  const save = page.getByRole('button', { name: '저장', exact: true })
  await expect(save).toBeDisabled() // nothing changed yet
  await dragPlant(page, 5)
  expect((await state(page)).plant).toMatchObject({ x: 6, y: 5 })
  await expect(page.getByText('저장 안 됨')).toBeVisible()
  await page.getByRole('radiogroup', { name: '바닥' }).getByRole('radio', { name: '카펫' }).click()
  await save.click()

  await expect(page.getByRole('status')).toHaveText('저장했어요')
  await expect(page.getByText('저장 안 됨')).toHaveCount(0)
  expect(puts).toHaveLength(1)
  expect(puts[0].csrf).toBe('tok-e')
  expect(puts[0].body.floor).toBe('carpet')
  expect(puts[0].body.items[PLANT]).toEqual({ id: 'plant_pot', x: 6, y: 5, r: 0 })

  await page.getByRole('button', { name: '나가기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  expect(await state(page)).toMatchObject({ editable: false, plant: { x: 6, y: 5 } })
  await page.reload()
  await waitForFurniture(page)
  expect((await state(page)).plant).toMatchObject({ x: 6, y: 5 })
})

test('a refused save marks the pieces and says why', async ({ page }) => {
  await fakeApi(page, {
    putAnswer: { status: 422, json: { status: 422, code: 'LAYOUT_OVERLAP', errors: [{ index: 2, code: 'LAYOUT_OVERLAP' }] } },
  })
  await openEditor(page)
  await dragPlant(page, 5)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(/겹친 가구가 있어요/)
  expect((await state(page)).invalid).toEqual([2])
  await expect(page.getByText('저장 안 됨')).toBeVisible()
})

test('leaving with unsaved changes asks first; staying keeps them, leaving drops them', async ({ page }) => {
  await fakeApi(page)
  await openEditor(page)
  await dragPlant(page, 5)
  await page.getByRole('button', { name: '나가기' }).click()
  const ask = page.getByRole('dialog', { name: '저장하지 않고 나갈까요?' })
  await ask.getByRole('button', { name: '계속 꾸미기' }).click()
  await expect(ask).toHaveCount(0)
  expect((await state(page)).plant).toMatchObject({ x: 6, y: 5 })

  await page.getByRole('button', { name: '나가기' }).click()
  await ask.getByRole('button', { name: '저장하지 않고 나가기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  expect(await state(page)).toMatchObject({ editable: false, plant: { x: 6, y: 0 } })
})

test('the back button with unsaved changes asks too', async ({ page }) => {
  await fakeApi(page)
  await openEditor(page)
  await dragPlant(page, 5)
  await page.goBack()
  await expect(page.getByRole('dialog', { name: '저장하지 않고 나갈까요?' })).toBeVisible()
  expect((await state(page)).plant).toMatchObject({ x: 6, y: 5 })
  await page.getByRole('button', { name: '계속 꾸미기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}?edit`)
  await expect(page.getByRole('region', { name: '방 꾸미기' })).toBeVisible()
})

test('the piece limit comes from the room (limits.pieces)', async ({ page }) => {
  await fakeApi(page, { pieces: 3 })
  await openEditor(page)
  expect((await state(page)).limit).toBe(3)
  await expect(page.getByText('3 / 3')).toBeVisible()
  await expect(page.getByText('가구는 3개까지 놓을 수 있어요')).toBeVisible()
})
