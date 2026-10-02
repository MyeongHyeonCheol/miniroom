import { expect, test } from '@playwright/test'

// The real backend is not needed: /api/me is faked per test.
const ME = { nickname: '명현', needsSignup: false, mySlug: 'k3x9m2qa', newGuestbookCount: 0 }

test('logged out: shows the Google login button', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 401 }))
  await page.goto('/')
  const login = page.getByRole('link', { name: 'Google로 로그인' })
  await expect(login).toBeVisible()
  await expect(login).toHaveAttribute('href', '/oauth2/authorization/google')
})

test('logged in: shows the nickname and a logout button', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 200, json: ME }))
  await page.goto('/')
  await expect(page.getByText('명현')).toBeVisible()
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('logout sends the CSRF header and returns to logged out', async ({ page }) => {
  let loggedIn = true
  let csrfHeader: string | undefined
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'tok-123', url: 'http://localhost:5173' }])
  await page.route('**/api/me', (r) =>
    loggedIn ? r.fulfill({ status: 200, json: ME }) : r.fulfill({ status: 401 }),
  )
  await page.route('**/logout', (r) => {
    csrfHeader = r.request().headers()['x-xsrf-token']
    loggedIn = false
    return r.fulfill({ status: 204 })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  expect(csrfHeader).toBe('tok-123')
})

test('backend down: room still renders, no login area', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 502 }))
  await page.goto('/')
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null)
  await expect(page.getByRole('heading', { name: '미니룸' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0)
})

test('replaced by a login elsewhere: shows a notice and the login button', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }))
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
})

test('plain 401 shows no notice', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 401 }))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('logged in before signup: says so instead of a nickname', async ({ page }) => {
  await page.route('**/api/me', (r) =>
    r.fulfill({ status: 200, json: { ...ME, nickname: null, needsSignup: true } }),
  )
  await page.goto('/')
  await expect(page.getByText('가입 전')).toBeVisible()
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('replaced while the page sits open: logged out by the 30 s recheck, no click needed', async ({ page }) => {
  await page.clock.install()
  let replaced = false
  await page.route('**/api/me', (r) =>
    replaced ? r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }) : r.fulfill({ status: 200, json: ME }),
  )
  await page.goto('/')
  await expect(page.getByText('명현')).toBeVisible()

  replaced = true
  await page.clock.fastForward(29_000)
  await expect(page.getByText('명현')).toBeVisible()
  await page.clock.fastForward(2_000)
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
})

test('replaced while another window had the focus: logged out on coming back', async ({ page }) => {
  let replaced = false
  await page.route('**/api/me', (r) =>
    replaced ? r.fulfill({ status: 401, json: { status: 401, code: 'REPLACED' } }) : r.fulfill({ status: 200, json: ME }),
  )
  await page.goto('/')
  await expect(page.getByText('명현')).toBeVisible()

  replaced = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('status')).toHaveText(/다른 곳에서 로그인해서 여기서는 로그아웃됐어요/)
})

test('logged out: no polling', async ({ page }) => {
  await page.clock.install()
  let calls = 0
  await page.route('**/api/me', (r) => {
    calls++
    return r.fulfill({ status: 401 })
  })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
  const before = calls
  await page.clock.fastForward(120_000)
  expect(calls).toBe(before)
})
