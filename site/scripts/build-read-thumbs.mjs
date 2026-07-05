// Regenerates the reads-landing thumbnails:
//   public/thumbs/reads/<slug>.png       — light theme
//   public/thumbs/reads/<slug>-dark.png  — dark theme
//
//   npm run build && node scripts/build-read-thumbs.mjs
//
// Thumbnails are chart-only element captures of each read's first live chart
// (the flagship uses its opening touchpoint strip instead). Driven off the
// READS registry, so a new read gets thumbs by rerunning this. The PNGs are
// COMMITTED (unlike the gitignored OG cards) — rerun when a chart's look or
// data changes materially, then commit the diff. Not part of rebuild.sh.
//
// Serves the built site itself: needs dist/ (run `npm run build` first) and
// `chromium` at /usr/bin/chromium (Pi/system build — playwright's downloaded
// browsers aren't assumed). Set THUMBS_BASE_URL to capture against an already
// running server instead.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { READS } from '../src/lib/reads-index.ts';

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(SITE_DIR, 'public/thumbs/reads');
const PORT = 4339;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';

// The flagship's thumb is the "part you never see" touchpoint strip, not a
// chart; everything else captures its first canvas-bearing figure.
const SELECTOR_OVERRIDES = { 'upi-architecture': '.stripfig .tstrip' };
const WIDTH_OVERRIDES = { 'upi-architecture': 1000 };

async function startPreview() {
  if (process.env.THUMBS_BASE_URL) return { base: process.env.THUMBS_BASE_URL, stop: () => {} };
  const proc = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    cwd: SITE_DIR,
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(base + '/economy');
      if (res.ok) return { base, stop: () => proc.kill() };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error('astro preview did not come up — did you run `npm run build`?');
}

async function capture(browser, base, slug, theme) {
  const context = await browser.newContext({
    viewport: { width: WIDTH_OVERRIDES[slug] ?? 900, height: 1200 },
    deviceScaleFactor: 2,
  });
  if (theme === 'dark') {
    await context.addInitScript(() => localStorage.setItem('tsoi-theme', 'dark'));
  }
  const page = await context.newPage();
  await page.goto(`${base}/economy/reads/${slug}`, { waitUntil: 'networkidle', timeout: 30_000 });

  const selector = SELECTOR_OVERRIDES[slug]
    ?? await page.evaluate(() => {
      const figs = [...document.querySelectorAll('.chartfig')];
      const i = figs.findIndex((f) => f.querySelector('canvas'));
      figs[Math.max(i, 0)]?.setAttribute('data-thumb-target', '');
      return '[data-thumb-target]';
    });

  // Scroll the figure into view to trigger the chart's grow-in, wait for the
  // canvas to actually paint, then let the animation settle.
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page
    .waitForFunction((sel) => {
      const c = document.querySelector(sel)?.querySelector('canvas');
      return !c || (c.width > 50 && c.height > 50);
    }, selector, { timeout: 15_000 })
    .catch(() => console.log(`  (canvas never sized) ${slug}`));
  await page.waitForTimeout(3000);
  await page.evaluate(() =>
    document.querySelectorAll('.chartfig figcaption, .stripfig figcaption')
      .forEach((e) => (e.style.display = 'none')));

  const file = resolve(OUT_DIR, theme === 'dark' ? `${slug}-dark.png` : `${slug}.png`);
  await page.locator(selector).first().screenshot({ path: file });
  console.log(`wrote ${file}`);
  await context.close();
}

mkdirSync(OUT_DIR, { recursive: true });
const { base, stop } = await startPreview();
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  for (const r of READS) {
    await capture(browser, base, r.slug, 'light');
    await capture(browser, base, r.slug, 'dark');
  }
} finally {
  await browser.close();
  stop();
}
console.log(`\n${READS.length * 2} thumbnails written.`);
