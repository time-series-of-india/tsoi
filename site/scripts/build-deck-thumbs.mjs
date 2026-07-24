// Regenerates the play-deck cover thumbnails:
//   public/thumbs/play/<slug>.png       — light theme
//   public/thumbs/play/<slug>-dark.png  — dark theme
//
//   npm run build && node scripts/build-deck-thumbs.mjs
//
// Covers are chart-only element captures of each deck's Card 1 chart — the
// same card whose headline the DeckCard teases, so the cover and the tease
// sell the same thing. Driven off BEAT_DECKS, so a new deck gets a cover by
// rerunning this. The PNGs are COMMITTED (like the read/dashboard thumbs) —
// rerun when a chart's look or data changes materially, then commit the diff.
//
// Serves the built site itself: needs dist/ (run `npm run build` first) and
// `chromium` at /usr/bin/chromium (Pi/system build — playwright's downloaded
// browsers aren't assumed). Set THUMBS_BASE_URL to capture against an already
// running server instead.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(SITE_DIR, 'public/thumbs/play');
const PORT = 4341;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';

// Deck slugs scraped from the registry source (beats.ts imports its
// neighbours without extensions, which Node's TS stripping can't follow —
// so no direct import here; the capture itself only needs the slug).
const SLUGS = [
  ...readFileSync(resolve(SITE_DIR, 'src/lib/beats.ts'), 'utf8').matchAll(/^\s*slug: '([^']+)'/gm),
].map((m) => m[1]);

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

async function capture(browser, base, slug, theme) {
  const context = await browser.newContext({
    // ≥880px so the deck renders in its desktop portrait frame — the chart
    // paints at the frame's fixed width, the same size the covers display at.
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  if (theme === 'dark') {
    await context.addInitScript(() => localStorage.setItem('tsoi-theme', 'dark'));
  }
  const page = await context.newPage();
  await page.goto(`${base}/economy/play/${slug}`, { waitUntil: 'networkidle', timeout: 30_000 });

  // Advance the deck to Card 1 (the scroll triggers the lazy chart build),
  // then wait for its canvas to actually paint and the grow-in to settle.
  const selector = '.beat[data-card="1"] .beat-chart';
  await page.evaluate(() => {
    const d = document.getElementById('deck');
    d?.scrollTo({ top: d.clientHeight, behavior: 'auto' });
  });
  await page
    .waitForFunction((sel) => {
      const c = document.querySelector(sel)?.querySelector('canvas');
      return !!c && c.width > 50 && c.height > 50;
    }, selector, { timeout: 15_000 })
    .catch(() => console.log(`  (canvas never sized) ${slug}`));
  await page.waitForTimeout(2500);

  const file = resolve(OUT_DIR, theme === 'dark' ? `${slug}-dark.png` : `${slug}.png`);
  await page.locator(selector).screenshot({ path: file });
  console.log(`wrote ${file}`);
  await context.close();
}

// Optional slug args: `node build-deck-thumbs.mjs <slug> [slug…]` regenerates
// only those decks' covers instead of all of them.
const only = process.argv.slice(2);
const TARGETS = only.length ? SLUGS.filter((s) => only.includes(s)) : SLUGS;
if (only.length && TARGETS.length !== only.length) {
  throw new Error(`unknown slug(s): ${only.filter((s) => !SLUGS.includes(s)).join(', ')}`);
}

mkdirSync(OUT_DIR, { recursive: true });
const { base, stop } = await startPreview();
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  for (const s of TARGETS) {
    await capture(browser, base, s, 'light');
    await capture(browser, base, s, 'dark');
  }
} finally {
  await browser.close();
  stop();
}
console.log(`\n${TARGETS.length * 2} cover thumbnails written.`);
