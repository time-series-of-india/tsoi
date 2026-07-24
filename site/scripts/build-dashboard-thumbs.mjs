// Regenerates the explore-landing thumbnails:
//   public/thumbs/explore/<slug>.png       — light theme
//   public/thumbs/explore/<slug>-dark.png  — dark theme
//
//   npm run build && node scripts/build-dashboard-thumbs.mjs
//
// Desks fold (Jul 2026): the six standalone dashboard pages retired into
// /economy/explore/payments, so there is one thumb per PRODUCT page now, not
// per spec. Each thumb frames the top of the product's FIRST DESK in desktop
// web view: its stat tiles and first row of chart panels — what a reader
// sees the instant they land, MINUS the desk-bar (title, dropdowns, the
// VOLUME/VALUE toggle, the instrument picker). That chrome reads as live
// controls at full size; at dispatch-card scale it's unreadable and looks
// clickable on what is a flat image, so the capture starts below it, at
// .desk-body. A future product (food prices, ...) gets thumbs by adding it
// to PRODUCTS and rerunning this. The PNGs are COMMITTED — rerun when a
// dashboard's top-of-page look or data changes materially, then commit the
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

// One entry per explore product page (see economy/explore/index.astro).
const PRODUCTS = [{ slug: 'payments', path: '/economy/explore/payments' }];

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(SITE_DIR, 'public/thumbs/explore');
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
      const res = await fetch(base + '/economy/read/');
      if (res.ok) return { base, stop: () => proc.kill() };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  proc.kill();
  throw new Error('astro preview did not come up — did you run `npm run build`?');
}

async function capture(browser, base, product, theme) {
  const { slug, path } = product;
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  if (theme === 'dark') {
    await context.addInitScript(() => localStorage.setItem('tsoi-theme', 'dark'));
  }
  const page = await context.newPage();
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 30_000 });

  // Wait for the first desk's first chart canvas to actually paint, then let
  // the grow-in animation settle.
  await page
    .waitForFunction(() => {
      const c = document.querySelector('.desk .panel .chart canvas');
      return c && c.width > 50 && c.height > 50;
    }, null, { timeout: 15_000 })
    .catch(() => console.log(`  (canvas never sized) ${slug}`));
  await page.waitForTimeout(3000);

  // Clip = the FIRST DESK's BODY (stat tiles through its first panel row) —
  // deliberately NOT the desk from its own top, which would pull in
  // .desk-bar (title, dropdowns, VOLUME/VALUE toggle, instrument picker).
  // .desk-body starts right where the bar ends, so anchoring y there is a DOM
  // cut, not a guessed pixel offset — it survives the bar changing height
  // (e.g. wrapping to two lines) or gaining/losing controls. The first row is
  // every panel sharing the top-most panel's y-offset (a `wide` panel sits
  // alone; otherwise the side-by-side pair).
  const clip = await page.evaluate(() => {
    const desk = document.querySelector('.desk');
    const body = desk.querySelector('.desk-body');
    const panels = [...body.querySelectorAll('.panel')];
    const dr = desk.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    const first = panels[0].getBoundingClientRect();
    let bottom = first.bottom;
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (r.top < first.top + 8) bottom = Math.max(bottom, r.bottom);
    }
    return { x: dr.left, y: br.top, width: dr.width, height: bottom - br.top };
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
  for (const p of PRODUCTS) {
    await capture(browser, base, p, 'light');
    await capture(browser, base, p, 'dark');
  }
} finally {
  await browser.close();
  stop();
}
console.log(`\n${PRODUCTS.length * 2} thumbnails written.`);
