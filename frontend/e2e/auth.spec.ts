import { expect, test, type Page } from '@playwright/test'

// Screens and login flow (docs/screens.md). The real backend is not needed: every /api call is faked per test.
const MY_SLUG = 'k3x9m2qa'
const FRIEND_SLUG = 'f7riend0'
const ME = { nickname: '명현', needsSignup: false, mySlug: MY_SLUG, newGuestbookCount: 0 }
const LAYOUT = {
  v: 1,
  floor: 'carpet',
  wall: 'skycheck',
  backdrop: 'island',
  items: [
    { id: 'bed', x: 0, y: 0, r: 90 },
    { id: 'plant_pot', x: 5, y: 5, r: 0 },
  ],
}
const room = (slug: string, isMine: boolean, nickname: string | null) => ({
  slug,
  owner: { nickname },
  isMine,
  size: 16,
  limits: { pieces: 60, wallSlotsPerWall: 4 },
  layout: LAYOUT,
  visits: { today: 0, total: 0 },
  updatedAt: '2026-10-02T13:33:51+09:00',
})
const TERMS = [
  { id: 1, kind: 'terms', version: 1, title: '이용약관', body: '제1조 (목적)\n시험 본문', effectiveAt: '2026-10-02T00:00:00+09:00' },
  { id: 2, kind: 'privacy', version: 1, title: '개인정보처리방침', body: '1. 처리하는 개인정보 항목', effectiveAt: '2026-10-02T00:00:00+09:00' },
]

/** Fake backend: `me` is what GET /api/me answers (null = logged out). */
async function fakeApi(page: Page, me: object | null, opts: { friendNickname?: string | null } = {}) {
  await page.route('**/api/me', (r) =>
    r.request().method() === 'GET'
      ? me
        ? r.fulfill({ json: me })
        : r.fulfill({ status: 401, json: { status: 401, code: 'UNAUTHORIZED' } })
      : r.fallback(),
  )
  await page.route('**/api/terms', (r) => r.fulfill({ json: TERMS }))
  await page.route(/\/api\/rooms\/[^/]+(\/invite)?$/, (r) => {
    const [, slug, invite] = /\/api\/rooms\/([^/]+)(\/invite)?$/.exec(new URL(r.request().url()).pathname)!
    const known = slug === MY_SLUG || slug === FRIEND_SLUG
    if (!known) return r.fulfill({ status: 404, json: { status: 404, code: 'ROOM_NOT_FOUND' } })
    const nickname = slug === MY_SLUG ? (me as typeof ME | null)?.nickname ?? null : opts.friendNickname ?? '친구'
    if (invite) return r.fulfill({ json: { nickname } })
    return r.fulfill({ json: room(slug, slug === MY_SLUG, nickname) })
  })
}

const store = (page: Page) => page.evaluate(() => {
  const s = window.__miniroomRoom!()
  return { size: s.size, floor: s.floor, wall: s.wall, pieces: s.placements.length, editable: s.editable }
})

test('logged out home: intro over a sample room and a login link', async ({ page }) => {
  await fakeApi(page, null)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '미니룸' })).toBeVisible()
  const login = page.getByRole('link', { name: 'Google로 로그인' })
  await expect(login).toHaveAttribute('href', '/oauth2/authorization/google')
  await expect(page.locator('canvas')).toBeVisible()
})

test('logged in home goes straight to my room, drawn from the API and not editable', async ({ page }) => {
  await fakeApi(page, ME)
  await page.goto('/')
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await expect(page.getByRole('heading', { name: '명현님의 미니룸' })).toBeVisible()
  await expect(page.getByText('명현', { exact: true })).toBeVisible()
  await expect.poll(() => store(page)).toEqual({ size: 16, floor: 'carpet', wall: 'skycheck', pieces: 2, editable: false })
  await expect(page.getByRole('button', { name: '내 방 가보기' })).toHaveCount(0)
})

test('logged out on a friend room: invite with the owner nickname, login remembers the room', async ({ page }) => {
  await fakeApi(page, null, { friendNickname: '친구' })
  await page.route('**/oauth2/authorization/google', (r) => r.fulfill({ body: 'google' }))
  await page.goto(`/r/${FRIEND_SLUG}`)
  await expect(page.getByRole('heading', { name: '친구님의 미니룸에 초대받았어요' })).toBeVisible()
  await page.getByRole('link', { name: 'Google로 로그인' }).click()
  await expect(page).toHaveURL(/\/oauth2\/authorization\/google$/)
  expect(await page.evaluate(() => sessionStorage.getItem('miniroom.returnTo'))).toBe(`/r/${FRIEND_SLUG}`)
})

test('back from login: home sends me to the remembered room, once', async ({ page }) => {
  await fakeApi(page, ME)
  await page.addInitScript((slug) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1')
      sessionStorage.setItem('miniroom.returnTo', `/r/${slug}`)
    }
  }, FRIEND_SLUG)
  await page.goto('/')
  await expect(page).toHaveURL(`/r/${FRIEND_SLUG}`)
  await expect(page.getByRole('heading', { name: '친구님의 미니룸' })).toBeVisible()
  await page.getByRole('button', { name: '내 방 가보기' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await expect(page.getByRole('heading', { name: '명현님의 미니룸' })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(`/r/${FRIEND_SLUG}`)
})

test('an outside returnTo is ignored', async ({ page }) => {
  await fakeApi(page, ME)
  await page.addInitScript(() => sessionStorage.setItem('miniroom.returnTo', '//evil.example/r/x'))
  await page.goto('/')
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
})

test('cancelled login: a notice and back to the page it started from', async ({ page }) => {
  await fakeApi(page, null)
  await page.addInitScript((slug) => sessionStorage.setItem('miniroom.returnTo', `/r/${slug}`), FRIEND_SLUG)
  await page.goto('/?login=failed')
  await expect(page.getByRole('status')).toHaveText(/로그인하지 못했어요/)
  await expect(page).toHaveURL(`/r/${FRIEND_SLUG}`)
})

test('unknown room: not found, with a way to my room', async ({ page }) => {
  await fakeApi(page, ME)
  await page.goto('/r/nothere0')
  await expect(page.getByRole('heading', { name: '방을 찾을 수 없어요' })).toBeVisible()
  await page.getByRole('button', { name: '내 방으로' }).click()
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
})

test('unknown address: not found page', async ({ page }) => {
  await fakeApi(page, ME)
  await page.goto('/nope')
  await expect(page.getByRole('heading', { name: '없는 주소예요' })).toBeVisible()
})

test('logout sends the CSRF header and returns to logged out', async ({ page }) => {
  let loggedIn = true
  let csrfHeader: string | undefined
  await fakeApi(page, ME)
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'tok-123', url: 'http://localhost:5173' }])
  await page.route('**/api/me', (r) =>
    loggedIn ? r.fulfill({ json: ME }) : r.fulfill({ status: 401, json: { status: 401, code: 'UNAUTHORIZED' } }),
  )
  await page.route('**/logout', (r) => {
    csrfHeader = r.request().headers()['x-xsrf-token']
    loggedIn = false
    return r.fulfill({ status: 204 })
  })
  await page.goto(`/r/${MY_SLUG}`)
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  expect(csrfHeader).toBe('tok-123')
})

test('backend down: home says so instead of offering login', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 502 }))
  await page.goto('/')
  await expect(page.getByRole('alert')).toHaveText(/서버에 연결할 수 없어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toHaveCount(0)
})

test('replaced by a login elsewhere: shows a notice and the login button', async ({ page }) => {
  await fakeApi(page, null)
  await page.route('**/api/me', (r) => r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }))
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
})

test('plain 401 shows no notice', async ({ page }) => {
  await fakeApi(page, null)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('replaced while the page sits open: logged out by the 30 s recheck, no click needed', async ({ page }) => {
  await page.clock.install()
  let replaced = false
  await fakeApi(page, ME)
  await page.route('**/api/me', (r) =>
    replaced ? r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }) : r.fulfill({ json: ME }),
  )
  await page.goto(`/r/${MY_SLUG}`)
  await expect(page.getByText('명현', { exact: true })).toBeVisible()

  replaced = true
  await page.clock.fastForward(29_000)
  await expect(page.getByText('명현', { exact: true })).toBeVisible()
  await page.clock.fastForward(2_000)
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
})

test('replaced while another window had the focus: logged out on coming back', async ({ page }) => {
  let replaced = false
  await fakeApi(page, ME)
  await page.route('**/api/me', (r) =>
    replaced ? r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }) : r.fulfill({ json: ME }),
  )
  await page.goto(`/r/${MY_SLUG}`)
  await expect(page.getByText('명현', { exact: true })).toBeVisible()

  replaced = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
})

test('logged out: no polling', async ({ page }) => {
  await page.clock.install()
  let calls = 0
  await fakeApi(page, null)
  await page.route('**/api/me', (r) => {
    calls++
    return r.fulfill({ status: 401, json: { status: 401, code: 'UNAUTHORIZED' } })
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  const before = calls
  await page.clock.fastForward(120_000)
  expect(calls).toBe(before)
})

test('terms pages show the text in force', async ({ page }) => {
  await fakeApi(page, null)
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: '개인정보처리방침' })).toBeVisible()
  await expect(page.getByText('1. 처리하는 개인정보 항목')).toBeVisible()
})
