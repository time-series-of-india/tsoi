// Regenerates site/public/og-default.png — the fallback social card used by
// BaseLayout for any page without a per-content OG image (§C1 of pre-launch).
//
//   node scripts/build-og-default.mjs
//
// Renders a centred wordmark card (broadsheet palette + repo fonts) with
// headless chromium and screenshots the 1200×630 frame. Run from site/.
// Requires `chromium` on PATH. Per-read/per-dashboard cards: build-og-cards.mjs.

import { resolve } from 'node:path';
import { TOKENS, PUBLIC_DIR, fontCss, renderCard } from './lib/og-card.mjs';

const { PAPER, INK, INK_VARIANT, SAFFRON, MUTED, TAGLINE } = TOKENS;
const outPath = resolve(PUBLIC_DIR, 'og-default.png');

const html = async () => `<!doctype html><html><head><meta charset="utf-8"><style>
${await fontCss()}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1200px;height:630px;}
.card{width:1200px;height:630px;background:${PAPER};border:18px solid ${SAFFRON};
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}
.rule{width:80px;height:6px;background:${SAFFRON};margin-bottom:40px;}
.title{font-family:'Playfair Display';font-weight:900;font-size:104px;line-height:1.02;
  letter-spacing:-0.02em;color:${INK};}
.tagline{font-family:'DM Sans';font-style:italic;font-weight:400;font-size:34px;
  color:${INK_VARIANT};margin-top:38px;}
.footer{font-family:'DM Mono';font-weight:400;font-size:22px;letter-spacing:0.14em;
  color:${MUTED};margin-top:56px;}
</style></head><body><div class="card">
<div class="rule"></div>
<div class="title">Time Series<br>of India</div>
<div class="tagline">${TAGLINE}</div>
<div class="footer">DATA: RBI &middot; NPCI</div>
</div></body></html>`;

await renderCard(await html(), outPath);
console.log(`wrote ${outPath}`);
