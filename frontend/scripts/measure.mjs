// Measurement: open the /dev/room playground, wait, print GPU + perf stats, save screenshots.
// Usage: node scripts/measure.mjs [baseUrl] [extraQuery]   (dev server must be running)
// extraQuery is appended to every case (e.g. `skin=a`) and to the screenshot name.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:5173'
const extra = process.argv[3] ?? ''
const outDir = 'test-results/measure'
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({
  // Use the real GPU instead of the software renderer
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

for (const [name, query] of [['default', ''], ['stress30', '?stress=30'], ['stress30-shadows', '?stress=30&shadows=1']]) {
  const url = extra ? `${base}/dev/room${query ? `${query}&` : '?'}${extra}` : `${base}/dev/room${query}`
  const shot = extra ? `${name}-${extra.replace(/[^a-z0-9]+/gi, '-')}` : name
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__miniroomStats?.furnitureReadyMs != null, null, { timeout: 30_000 })
  await page.waitForTimeout(3000) // let fps settle
  const result = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
    const nav = performance.getEntriesByType('navigation')[0]
    const bytes = performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0)
    return { gpu, stats: window.__miniroomStats, domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), transferKB: Math.round(bytes / 1024) }
  })
  await page.screenshot({ path: `${outDir}/${shot}.png` })
  console.log(shot, JSON.stringify(result))
}
if (errors.length) console.log('ERRORS', errors)
await browser.close()
