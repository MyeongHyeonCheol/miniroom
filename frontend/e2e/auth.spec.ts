import { expect, test } from '@playwright/test'

// The real backend is not needed: /api/me is faked per test.
test('logged out: shows the Google login button', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 401 }))
  await page.goto('/')
  const login = page.getByRole('link', { name: 'Google로 로그인' })
  await expect(login).toBeVisible()
  await expect(login).toHaveAttribute('href', '/oauth2/authorization/google')
})

test('logged in: shows the email and a logout button', async ({ page }) => {
  await page.route('**/api/me', (r) => r.fulfill({ status: 200, json: { email: 'me@example.com' } }))
  await page.goto('/')
  await expect(page.getByText('me@example.com')).toBeVisible()
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
})

test('logout sends the CSRF header and returns to logged out', async ({ page }) => {
  let loggedIn = true
  let csrfHeader: string | undefined
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'tok-123', url: 'http://localhost:5173' }])
  await page.route('**/api/me', (r) =>
    loggedIn ? r.fulfill({ status: 200, json: { email: 'me@example.com' } }) : r.fulfill({ status: 401 }),
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
  await page.route('**/api/me', (r) => r.fulfill({ status: 401, json: { reason: 'replaced' } }))
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
