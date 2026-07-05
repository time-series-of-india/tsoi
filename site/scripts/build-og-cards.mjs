// Regenerates the per-content social cards (§C1 of pre-launch):
//   public/og/reads/<slug>.png       — one per entry in src/lib/reads-index.ts
//   public/og/dashboards/<slug>.png  — one per spec in src/lib/dashboards/specs.ts
//
//   node scripts/build-og-cards.mjs
//
// Each card is the EDITORIAL left-aligned layout: wordmark, short saffron rule,
// big left-aligned title, deck, and a "A READ · SOURCE …" footer — on the same
// broadsheet palette + repo fonts as the fallback card. 1200×630, headless
// chromium. Run from site/. Requires `chromium` on PATH. Driven off the same
// registries the pages render from, so every new read/dashboard gets a card free.

import { resolve } from 'node:path';
import { TOKENS, PUBLIC_DIR, fontCss, renderCard, esc } from './lib/og-card.mjs';
import { READS } from '../src/lib/reads-index.ts';
import { DASHBOARDS } from '../src/lib/dashboards/specs.ts';

const { PAPER, INK, INK_VARIANT, SAFFRON, MUTED } = TOKENS;

// Title size shrinks as the headline lengthens so it always fits three lines.
function titleSize(title) {
  const n = title.length;
  if (n <= 30) return 76;
  if (n <= 46) return 66;
  return 56;
}

async function cardHtml({ title, deck, footer }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${await fontCss()}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:1200px;height:630px;}
.card{width:1200px;height:630px;background:${PAPER};border-left:18px solid ${SAFFRON};
  padding:74px 84px;display:flex;flex-direction:column;}
.wordmark{font-family:'DM Mono';font-weight:400;font-size:21px;letter-spacing:0.2em;
  text-transform:uppercase;color:${MUTED};}
.rule{width:64px;height:5px;background:${SAFFRON};margin:26px 0 34px;}
.title{font-family:'Playfair Display';font-weight:900;font-size:${titleSize(title)}px;
  line-height:1.04;letter-spacing:-0.02em;color:${INK};
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.deck{font-family:'DM Sans';font-weight:400;font-size:29px;line-height:1.4;
  color:${INK_VARIANT};margin-top:28px;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.footer{font-family:'DM Mono';font-weight:400;font-size:20px;letter-spacing:0.14em;
  text-transform:uppercase;color:${MUTED};margin-top:auto;}
</style></head><body><div class="card">
<div class="wordmark">Time Series of India</div>
<div class="rule"></div>
<div class="title">${esc(title)}</div>
<div class="deck">${esc(deck)}</div>
<div class="footer">${esc(footer)}</div>
</div></body></html>`;
}

let count = 0;
for (const r of READS) {
  const out = resolve(PUBLIC_DIR, 'og/reads', `${r.slug}.png`);
  await renderCard(await cardHtml({
    title: r.title,
    deck: r.deck,
    footer: `A Read · Source: ${r.source}`,
  }), out);
  console.log(`wrote ${out}`);
  count++;
}

for (const d of DASHBOARDS) {
  const out = resolve(PUBLIC_DIR, 'og/dashboards', `${d.slug}.png`);
  await renderCard(await cardHtml({
    title: d.title,
    deck: d.description,
    footer: 'Interactive Dashboard · Data: RBI · NPCI',
  }), out);
  console.log(`wrote ${out}`);
  count++;
}

console.log(`\n${count} cards written.`);
