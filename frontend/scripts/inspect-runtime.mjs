// Read-only browser inspection of the production build, with an isolated demo fixture.
// Start Vite preview on 4173 and the local API on 8000 before running.
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const output = fileURLToPath(new URL('../../docs/design/', import.meta.url))
await mkdir(`${output}/screenshots`, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  // The fixture uses a same-host cookie. UI mutation flows are covered separately on 5174.
  const session = await context.request.post('http://127.0.0.1:8000/api/v1/auth/demo', { headers: { 'X-Requested-With': 'ReSearch' }, data: { audience: 'researcher' } })
  if (!session.ok()) throw new Error(`Demo fixture: HTTP ${session.status()}`)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.auditMetrics = { shifts: [], longTasks: [] }
    new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.auditMetrics.shifts.push(e.value) })).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(e => window.auditMetrics.longTasks.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
  })
  await page.goto('http://127.0.0.1:4173/')
  await page.getByRole('heading', { name: 'Рабочий журнал.' }).waitFor()
  const frames = await page.evaluate(async () => {
    const frames = []; let previous = performance.now()
    for (let i = 0; i < 60; i++) await new Promise(resolve => requestAnimationFrame(now => { frames.push(now - previous); previous = now; resolve() }))
    return frames.slice(1).sort((a, b) => a - b)
  })
  const metrics = await page.evaluate(() => ({
    ...window.auditMetrics,
    paints: performance.getEntriesByType('paint').map(p => ({ name: p.name, ms: Math.round(p.startTime) })),
    idleAnimations: document.getAnimations().filter(a => a.playState === 'running').length,
    externalResources: performance.getEntriesByType('resource').filter(r => !r.name.startsWith(location.origin)).map(r => r.name),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }))
  const animation = await page.evaluate(async () => {
    document.querySelector('.matrix-cell').click()
    const samples = []
    for (let i = 0; i < 30; i++) await new Promise(resolve => requestAnimationFrame(now => {
      const element = document.querySelector('dialog')
      if (element?.open) { const style = getComputedStyle(element); samples.push({ time: now, transform: style.transform, opacity: style.opacity }) }
      resolve()
    }))
    const element = document.querySelector('dialog')
    const frameGaps = samples.slice(1).map((s, i) => s.time - samples[i].time).sort((a,b) => a-b)
    return { name: getComputedStyle(element).animationName, duration: getComputedStyle(element).animationDuration, distinctTransforms: new Set(samples.map(s => s.transform)).size, sampledFrameP95Ms: Number(frameGaps[Math.floor(frameGaps.length * .95)]?.toFixed(2)), final: samples.at(-1) }
  })
  await page.getByRole('dialog').locator('.related-item').first().click()
  await page.getByRole('heading', { name: 'Заметки и контекст' }).waitFor()
  await page.getByRole('dialog').evaluate(e => Promise.allSettled(e.getAnimations({ subtree: true }).map(a => a.finished)))
  await page.screenshot({ path: `${output}/screenshots/source-inspector-desktop.png`, fullPage: false })
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  const responsiveAudit = []
  for (const viewport of [{ width: 1440, height: 1000, name: 'desktop' }, { width: 820, height: 1180, name: 'tablet' }, { width: 390, height: 844, name: 'mobile' }, { width: 320, height: 740, name: 'narrow' }]) {
    await page.setViewportSize(viewport)
    await page.locator('main').focus()
    await page.evaluate(() => window.scrollTo(0,0))
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    responsiveAudit.push({ width: viewport.width, overflow, violations: audit.violations.map(v => v.id) })
    await page.screenshot({ path: `${output}/screenshots/journal-${viewport.name}.png`, fullPage: true })
  }
  const narrowOverflow = responsiveAudit.at(-1).overflow
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Новый проект', exact: true }).click()
  const reducedMotion = await page.getByRole('dialog').evaluate(e => ({ dialog: getComputedStyle(e).animationName, backdrop: getComputedStyle(e, '::backdrop').animationName }))
  if (reducedMotion.dialog !== 'none' || reducedMotion.backdrop !== 'none') throw new Error('Reduced motion regression')
  const report = { timestamp: new Date().toISOString(), browser: browser.version(), build: 'Vite production preview; local API; shared cloud host; no CPU/network throttling', viewport: '1440×1000', ...metrics, cls: Number(metrics.shifts.reduce((a,b) => a+b,0).toFixed(4)), frameMedianMs: Number(frames[Math.floor(frames.length / 2)].toFixed(2)), frameP95Ms: Number(frames[Math.floor(frames.length * .95)].toFixed(2)), inspectorAnimation: animation, reducedMotion, narrowOverflow, responsiveAudit, javascriptErrors: errors }
  await writeFile(`${output}/runtime-metrics.json`, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
