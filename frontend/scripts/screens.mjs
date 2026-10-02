// Screenshots of the main screens with a faked backend, for checking the look (dev server must be running).
// Usage: node scripts/screens.mjs [baseUrl]   -> test-results/screens/*.png
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5173'
const outDir = 'test-results/screens'
mkdirSync(outDir, { recursive: true })

const SLUG = 'k3x9m2qa'
const TERMS = [
  { id: 1, kind: 'terms', version: 1, title: '이용약관', body: '제1조 (목적)\n이 약관은 3D 미니룸을 이용하는 데 필요한 권리와 의무를 정합니다.\n\n제2조 (서비스)\n1. 방을 꾸미고 방명록을 남길 수 있습니다.\n2. 시험 운영 중이며 무료입니다.\n\n제3조 (가입)\n만 14세 미만은 가입할 수 없습니다.', effectiveAt: '2026-10-02T00:00:00+09:00' },
  { id: 2, kind: 'privacy', version: 1, title: '개인정보처리방침', body: '1. 처리하는 개인정보 항목\n- Google 계정 고유 번호, 이메일', effectiveAt: '2026-10-02T00:00:00+09:00' },
]
const room = (nickname) => ({
  slug: SLUG, owner: { nickname }, isMine: true, size: 12, limits: { pieces: 45, wallSlotsPerWall: 3 },
  layout: { v: 1, floor: 'wood', wall: 'ivory', backdrop: 'island', items: [
    { id: 'bed', x: 0, y: 0, r: 0 }, { id: 'computer_desk', x: 3, y: 0, r: 0 }, { id: 'plant_pot', x: 6, y: 0, r: 0 }] },
  visits: { today: 0, total: 0 }, updatedAt: '2026-10-02T13:33:51+09:00',
})

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })

async function shot(name, me, path, after = async () => {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('**/api/me', (r) => me ? r.fulfill({ json: me }) : r.fulfill({ status: 401, json: { code: 'UNAUTHORIZED' } }))
  await page.route('**/api/terms', (r) => r.fulfill({ json: TERMS }))
  await page.route(`**/api/rooms/${SLUG}/invite`, (r) => r.fulfill({ json: { nickname: '친구' } }))
  await page.route(`**/api/rooms/${SLUG}`, (r) => r.fulfill({ json: room(me?.nickname ?? null) }))
  await page.goto(base + path)
  await page.waitForTimeout(2500)
  await after(page)
  await page.screenshot({ path: `${outDir}/${name}.png` })
  console.log(name, page.url())
  await page.close()
}

const NEW_ME = { nickname: null, needsSignup: true, mySlug: SLUG, newGuestbookCount: 0 }
await shot('home-logged-out', null, '/')
await shot('invite', null, `/r/${SLUG}`)
await shot('signup', NEW_ME, '/')
await shot('signup-terms-open', NEW_ME, '/', async (page) => {
  await page.getByLabel('닉네임').fill('명현')
  await page.getByLabel('모두 동의해요').check()
  await page.getByRole('button', { name: '내용 보기' }).first().click()
})
await shot('room-signed-up', { ...NEW_ME, nickname: '명현', needsSignup: false }, '/')
await browser.close()
