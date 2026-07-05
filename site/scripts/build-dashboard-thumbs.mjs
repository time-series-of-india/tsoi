// Regenerates the dashboards-landing thumbnails:
//   public/thumbs/dashboards/<slug>.png       — light theme
//   public/thumbs/dashboards/<slug>-dark.png  — dark theme
//
//   npm run build && node scripts/build-dashboard-thumbs.mjs
//
// Unlike the earlier headline-panel captures, each thumb now frames the TOP of
// the dashboard in desktop web view: the global control bar (the variable row),
// the stat strip, and the first row of chart panels — i.e. what a reader sees
// the instant a dashboard loads. Driven off the DASHBOARDS registry, so a new
// dashboard gets thumbs by rerunning this. The PNGs are COMMITTED — rerun when
// a dashboard's top-of-page look or data changes materially, then commit the
// diff. Not part of rebuild.sh.
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
import { DASHBOARDS } from '../src/lib/dashboards/specs.ts';

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(SITE_DIR, 'public/thumbs/dashboards');
const PORT = 4340;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';

// Desktop web view so the 2-column panel grid (>=880px) is active — the thumb
// should read like the real desktop dashboard, not the phone stack.
const VIEWPORT = { width: 1440, height: 1600 };

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
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  if (theme === 'dark') {
    await context.addInitScript(() => localStorage.setItem('tsoi-theme', 'dark'));
  }
  const page = await context.newPage();
  await page.goto(`${base}/economy/dashboards/${slug}`, { waitUntil: 'networkidle', timeout: 30_000 });

  // Wait for the first chart panel's canvas to actually paint, then let the
  // grow-in animation settle.
  await page
    .waitForFunction(() => {
      const c = document.querySelector('.panels .panel .chart canvas');
      return c && c.width > 50 && c.height > 50;
    }, null, { timeout: 15_000 })
    .catch(() => console.log(`  (canvas never sized) ${slug}`));
  await page.waitForTimeout(3000);

  // Clip = union of the control bar + stat strip + the FIRST panel row.
  // The first row is every panel sharing the top-most panel's y-offset (a
  // `wide` panel sits alone; otherwise it's the two side-by-side panels).
  const clip = await page.evaluate(() => {
    const dash = document.querySelector('.dash');
    const bar = document.querySelector('.global-bar');
    const strip = document.querySelector('.stat-strip');
    const panels = [...document.querySelectorAll('.panels .panel')];
    const head = bar ?? strip ?? panels[0];
    const dr = dash.getBoundingClientRect();
    const top = head.getBoundingClientRect().top;
    const first = panels[0].getBoundingClientRect();
    let bottom = first.bottom;
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (r.top < first.top + 8) bottom = Math.max(bottom, r.bottom);
    }
    return { x: dr.left, y: top, width: dr.width, height: bottom - top };
  });

  const file = resolve(OUT_DIR, theme === 'dark' ? `${slug}-dark.png` : `${slug}.png`);
  await page.screenshot({ path: file, clip });
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
  for (const d of DASHBOARDS) {
    await capture(browser, base, d.slug, 'light');
    await capture(browser, base, d.slug, 'dark');
  }
} finally {
  await browser.close();
  stop();
}
console.log(`\n${DASHBOARDS.length * 2} thumbnails written.`);
