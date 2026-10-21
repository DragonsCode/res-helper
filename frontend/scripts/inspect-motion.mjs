import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const response = await context.request.post('http://127.0.0.1:8000/api/v1/auth/demo', { headers: { 'X-Requested-With': 'ReSearch' }, data: { audience: 'researcher' } })
  if (!response.ok()) throw new Error('Demo fixture failed')
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/')
  await page.getByRole('heading', { name: 'Рабочий журнал.' }).waitFor()
  const runs = []
  for (let i = 0; i < 3; i++) {
    runs.push(await page.evaluate(async () => {
      document.querySelector('.matrix-cell').click()
      const samples = []
      for (let n = 0; n < 30; n++) await new Promise(resolve => requestAnimationFrame(time => {
        const dialog = document.querySelector('dialog')
        if (dialog?.open) samples.push({ time, transform: getComputedStyle(dialog).transform, backdropOpacity: getComputedStyle(dialog, '::backdrop').opacity })
        resolve()
      }))
      if (samples.length < 2) throw new Error('No dialog frames observed')
      const gaps = samples.slice(1).map((s, i) => s.time - samples[i].time).sort((a, b) => a - b)
      return { sampleCount: samples.length, transformStates: new Set(samples.map(s => s.transform)).size, backdropOpacityStates: new Set(samples.map(s => s.backdropOpacity)).size, medianMs: Number(gaps[Math.floor(gaps.length / 2)].toFixed(2)), p95Ms: Number(gaps[Math.floor(gaps.length * .95)].toFixed(2)), final: samples.at(-1) }
    }))
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'detached' })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('.matrix-cell').first().click()
  await page.getByRole('dialog').waitFor()
  const reducedMotion = await page.getByRole('dialog').evaluate(e => ({ dialog: getComputedStyle(e).animationName, backdrop: getComputedStyle(e, '::backdrop').animationName }))
  if (reducedMotion.dialog !== 'none' || reducedMotion.backdrop !== 'none') throw new Error('Reduced motion regression')
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  const report = { timestamp: new Date().toISOString(), browser: browser.version(), note: 'rAF computed-style samples in a shared cloud browser; not a GPU frame trace or real-device FPS guarantee.', runs, reducedMotion }
  await writeFile(new URL('../../docs/design/motion-diagnostics.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
