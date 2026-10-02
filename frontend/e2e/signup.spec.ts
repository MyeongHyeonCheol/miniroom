import { expect, test, type Page } from '@playwright/test'

// Signup over the room (docs/screens.md "3. 첫 가입"). Faked backend, like auth.spec.ts.
const MY_SLUG = 'k3x9m2qa'
const NEW_ME = { nickname: null, needsSignup: true, mySlug: MY_SLUG, newGuestbookCount: 0 }
const TERMS = [
  { id: 7, kind: 'terms', version: 2, title: '이용약관', body: '제1조 (목적)\n시험 본문', effectiveAt: '2026-10-02T00:00:00+09:00' },
  { id: 8, kind: 'privacy', version: 1, title: '개인정보처리방침', body: '1. 처리하는 개인정보 항목', effectiveAt: '2026-10-02T00:00:00+09:00' },
]

type Calls = { patch?: { body: unknown; csrf?: string }; deleted?: boolean }

async function fakeApi(page: Page, patchAnswer: { status: number; json: object } | null = null) {
  const calls: Calls = {}
  let me: object | null = NEW_ME
  await page.context().addCookies([{ name: 'XSRF-TOKEN', value: 'tok-9', url: 'http://localhost:5173' }])
  await page.route('**/api/me', async (r) => {
    const method = r.request().method()
    if (method === 'PATCH') {
      calls.patch = { body: r.request().postDataJSON(), csrf: r.request().headers()['x-xsrf-token'] }
      if (patchAnswer) return r.fulfill(patchAnswer)
      me = { ...NEW_ME, nickname: '명현', needsSignup: false }
      return r.fulfill({ json: me })
    }
    if (method === 'DELETE') {
      calls.deleted = true
      me = null
      return r.fulfill({ status: 204 })
    }
    return me ? r.fulfill({ json: me }) : r.fulfill({ status: 401, json: { status: 401, code: 'UNAUTHORIZED' } })
  })
  await page.route('**/api/terms', (r) => r.fulfill({ json: TERMS }))
  await page.route(`**/api/rooms/${MY_SLUG}`, (r) =>
    r.fulfill({
      json: {
        slug: MY_SLUG,
        owner: { nickname: (me as { nickname?: string } | null)?.nickname ?? null },
        isMine: true,
        size: 12,
        limits: { pieces: 45, wallSlotsPerWall: 3 },
        layout: { v: 1, floor: 'wood', wall: 'ivory', backdrop: 'island', items: [{ id: 'bed', x: 0, y: 0, r: 0 }] },
        visits: { today: 0, total: 0 },
        updatedAt: '2026-10-02T13:33:51+09:00',
      },
    }),
  )
  return calls
}

const dialog = (page: Page) => page.getByRole('dialog', { name: '미니룸에 오신 걸 환영해요' })

test('the room is visible behind the signup form, and start stays off until everything is filled', async ({ page }) => {
  await fakeApi(page)
  await page.goto('/')
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await expect(page.getByRole('heading', { name: '내 미니룸' })).toBeVisible()
  const d = dialog(page)
  await expect(d).toBeVisible()
  const start = d.getByRole('button', { name: '시작하기' })
  await expect(start).toBeDisabled()

  await d.getByLabel('닉네임').fill('명')
  await expect(d.getByText('1/12')).toBeVisible()
  await d.getByLabel('[필수] 만 14세 이상이에요').check()
  await d.getByLabel('[필수] 이용약관에 동의해요').check()
  await d.getByLabel('[필수] 개인정보처리방침에 동의해요').check()
  await expect(start).toBeDisabled() // nickname still 1 character
  await d.getByLabel('닉네임').fill('명현')
  await expect(start).toBeEnabled()
})

test('terms are read inside the form, not on another page', async ({ page }) => {
  await fakeApi(page)
  await page.goto(`/r/${MY_SLUG}`)
  const d = dialog(page)
  await d.getByRole('button', { name: '내용 보기' }).first().click()
  await expect(d.getByLabel('이용약관 내용')).toHaveText(/제1조 \(목적\)/)
  await expect(page).toHaveURL(`/r/${MY_SLUG}`)
  await expect(d.getByRole('link')).toHaveCount(0)
})

test('signup sends the nickname, 14+ and the shown terms versions with CSRF, then closes', async ({ page }) => {
  const calls = await fakeApi(page)
  await page.goto(`/r/${MY_SLUG}`)
  const d = dialog(page)
  await d.getByLabel('닉네임').fill('  명현 ')
  await d.getByLabel('모두 동의해요').check()
  await expect(d.getByLabel('[필수] 개인정보처리방침에 동의해요')).toBeChecked()
  await d.getByRole('button', { name: '시작하기' }).click()

  await expect(d).toHaveCount(0)
  expect(calls.patch).toEqual({ body: { nickname: '  명현 ', ageConfirmed: true, agreedTermsIds: [7, 8] }, csrf: 'tok-9' })
  await expect(page.getByRole('status')).toHaveText('명현님, 반가워요!')
  await expect(page.getByRole('heading', { name: '명현님의 미니룸' })).toBeVisible()
})

test('terms changed meanwhile: says so and asks again', async ({ page }) => {
  await fakeApi(page, { status: 422, json: { status: 422, code: 'CONSENT_REQUIRED' } })
  await page.goto(`/r/${MY_SLUG}`)
  const d = dialog(page)
  await d.getByLabel('닉네임').fill('명현')
  await d.getByLabel('모두 동의해요').check()
  await d.getByRole('button', { name: '시작하기' }).click()
  await expect(d.getByRole('alert')).toHaveText(/약관이 바뀌었어요/)
  await expect(d.getByLabel('[필수] 이용약관에 동의해요')).not.toBeChecked()
})

test('later closes the form for now; it comes back on the next visit', async ({ page }) => {
  await fakeApi(page)
  await page.goto(`/r/${MY_SLUG}`)
  await dialog(page).getByRole('button', { name: '나중에' }).click()
  await expect(dialog(page)).toHaveCount(0)
  await page.reload()
  await expect(dialog(page)).toBeVisible()
})

test('under 14: the account is deleted and the user is back at the start', async ({ page }) => {
  const calls = await fakeApi(page)
  await page.goto(`/r/${MY_SLUG}`)
  await dialog(page).getByRole('button', { name: '만 14세 미만이에요' }).click()
  const confirm = page.getByRole('dialog', { name: '가입할 수 없어요' })
  await confirm.getByRole('button', { name: '지우고 나가기' }).click()
  await expect(page).toHaveURL('/')
  expect(calls.deleted).toBe(true)
  await expect(page.getByRole('status')).toHaveText(/만 14세 미만은 가입할 수 없어서 계정을 지웠어요/)
  await expect(page.getByRole('link', { name: 'Google로 로그인' })).toBeVisible()
})

test('only one terms text is open at a time', async ({ page }) => {
  await fakeApi(page)
  await page.goto(`/r/${MY_SLUG}`)
  const d = dialog(page)
  const [termsToggle, privacyToggle] = [0, 1].map((i) => d.getByRole('button', { name: /내용 보기|접기/ }).nth(i))
  await termsToggle.click()
  await expect(d.getByLabel('이용약관 내용')).toBeVisible()
  await privacyToggle.click()
  await expect(d.getByLabel('개인정보처리방침 내용')).toBeVisible()
  await expect(d.getByLabel('이용약관 내용')).toHaveCount(0)
  await expect(termsToggle).toHaveAttribute('aria-expanded', 'false')
  await privacyToggle.click()
  await expect(d.getByLabel('개인정보처리방침 내용')).toHaveCount(0)
})
