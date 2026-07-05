// Shared helpers for the OG-card generators (§C1 of pre-launch). Both the
// fallback card (build-og-default.mjs) and the per-content cards
// (build-og-cards.mjs) render an HTML card with the broadsheet palette + repo
// fonts, then screenshot the 1200×630 frame with headless chromium.
//
// Kept deliberately dependency-free (system `chromium` on PATH, not playwright)
// to match the proven recipe already used on the Pi.

import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

export const FONTS_DIR = resolve(here, '../../public/fonts');
export const PUBLIC_DIR = resolve(here, '../../public');

// Design tokens (mirrors site/src/styles/global.css :root).
export const TOKENS = {
  PAPER: '#F5F0E5',
  INK: '#1A1510',
  INK_VARIANT: '#4A3C2C',
  SAFFRON: '#CC5500',
  MUTED: '#8A7060',
  TAGLINE: "India's public data, charted and explained",
};

async function fontFace(family, weight, style, file) {
  const data = await readFile(join(FONTS_DIR, file));
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};font-display:block;src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');}`;
}

// The @font-face block shared by every card (embedded as base64 data URIs so the
// screenshot never races a network/file font load).
export async function fontCss() {
  return [
    await fontFace('Playfair Display', 900, 'normal', 'playfair-display-latin-900-normal.woff2'),
    await fontFace('Playfair Display', 700, 'normal', 'playfair-display-latin-700-normal.woff2'),
    await fontFace('DM Sans', 400, 'normal', 'dm-sans-latin-400-normal.woff2'),
    await fontFace('DM Sans', 400, 'italic', 'dm-sans-latin-400-italic.woff2'),
    await fontFace('DM Mono', 400, 'normal', 'dm-mono-latin-400-normal.woff2'),
  ].join('\n');
}

// HTML-escape text destined for card markup (titles/decks come from registries).
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Render one full HTML document to `outPath` (a 1200×630 PNG) via headless
// chromium. `mkdir`s the parent dir. Requires `chromium` on PATH.
export async function renderCard(html, outPath) {
  await mkdir(dirname(outPath), { recursive: true });
  const dir = await mkdtemp(join(tmpdir(), 'og-'));
  const htmlPath = join(dir, 'card.html');
  try {
    await writeFile(htmlPath, html);
    await execFileAsync('chromium', [
      '--headless', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--window-size=1200,630', '--default-background-color=00000000',
      `--screenshot=${outPath}`, `file://${htmlPath}`,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
