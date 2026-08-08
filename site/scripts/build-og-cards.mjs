// Regenerates the per-content social cards (§C1 of pre-launch):
//   public/og/reads/<slug>.png       — one per entry in src/lib/reads-index.ts
//   public/og/explore/<surface>.png  — the four explore surfaces (share v1 §6)
//   public/og/dashboards/all.png     — superseded by og/explore/payments.png,
//                                      still rendered so old links keep an image
//   public/og/play/off-by-how-much.png — the one game
//
//   node scripts/build-og-cards.mjs
//
// Each card is the EDITORIAL left-aligned layout: wordmark, short saffron rule,
// big left-aligned title, deck, and a "A READ · SOURCE …" footer — on the same
// broadsheet palette + repo fonts as the fallback card. 1200×630, headless
// chromium. Run from site/. Requires `chromium` on PATH. Driven off the reads
// registry, so every new read gets a card free; the dashboard and game cards
// are one-offs (there's exactly one of each to link out to) and are listed
// by hand below.

import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { TOKENS, PUBLIC_DIR, fontCss, renderCard, esc } from './lib/og-card.mjs';
import { READS } from '../src/lib/reads-index.ts';
import { INFLATION_PEAKS_DECK } from '../src/lib/play/inflation-peaks.ts';

const { PAPER, INK, INK_VARIANT, SAFFRON, MUTED } = TOKENS;

/* Inflation Peaks' motif: the real series as a card-width polyline with the
   game's own auto parked on it. The line alone was a shape; the auto is what
   says the shape is a road. Both are generated, the line from the same JSON
   the game runs on and the auto from peaks-engine's drawCar path, so the card
   can never quietly disagree with the game it advertises.
   The card is one static PNG served to crawlers and never themes, so the
   colours here are the light values written out rather than tokens. */
function peaksMotif() {
  const { points } = JSON.parse(
    readFileSync(resolve(PUBLIC_DIR, 'data/economy/play/inflation-peaks.json'), 'utf8'),
  );
  const W = 620, H = 84, STEP = Math.ceil(points.length / 150);
  const ys = points.filter((_, i) => i % STEP === 0).map((p) => p.yoy);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const xAt = (i) => (i / (ys.length - 1)) * (W - 8) + 4;
  const yAt = (y) => H - 6 - ((y - lo) / (hi - lo)) * (H - 12);
  const path = ys.map((y, i) => `${xAt(i).toFixed(1)},${yAt(y).toFixed(1)}`).join(' ');

  // The line at any x, walking the segment it falls in. The polyline is drawn
  // straight between samples, so this is the curve rather than a fit to it.
  const groundAt = (x) => {
    const t = Math.min(Math.max(((x - 4) / (W - 8)) * (ys.length - 1), 0), ys.length - 1);
    const i = Math.min(Math.floor(t), ys.length - 2);
    return yAt(ys[i]) + (yAt(ys[i + 1]) - yAt(ys[i])) * (t - i);
  };

  /* Where the auto stands. Not chosen by hand: the first attempt parked it on
     the 1972 approach and its footprint covered the 1974 spike, which is the
     card's namesake and the one shape on it worth seeing. So the placement
     hunts for the FLATTEST window instead, and only in the back half, which
     leaves all of the early drama uncovered by construction. Level on a flat
     stretch is also the pose the game's cover cards use. */
  const SCALE = 1.3;
  const HALF_W = 27 * SCALE; // native half-extent, wheels included
  let at = 0, flattest = Infinity;
  for (let i = Math.floor(ys.length * 0.4); i < Math.floor(ys.length * 0.92); i++) {
    let min = Infinity, max = -Infinity;
    for (let dx = -HALF_W; dx <= HALF_W; dx += 2) {
      const y = groundAt(xAt(i) + dx);
      if (y < min) min = y;
      if (y > max) max = y;
    }
    if (max - min < flattest) { flattest = max - min; at = i; }
  }

  /* Rotation and ride height off both tyres, iterated: take the angle from the
     line under each wheel, re-measure the wheels at that angle, repeat. Six
     passes is well past convergence on any stretch this flat. The vertical
     offset then averages the two contact points, so neither tyre floats. */
  const WHEELS = [[-12, 13], [16, 13]]; // native centres; outer radius 8
  const tx = xAt(at);
  let th = 0, ty = 0;
  for (let iter = 0; iter < 6; iter++) {
    const bx = WHEELS.map(([wx, wy]) => tx + SCALE * (wx * Math.cos(th) - wy * Math.sin(th)));
    th = Math.atan2(groundAt(bx[1]) - groundAt(bx[0]), bx[1] - bx[0]);
    const tys = WHEELS.map(([wx, wy], k) =>
      groundAt(bx[k]) - SCALE * (wx * Math.sin(th) + wy * Math.cos(th)) - 8 * SCALE);
    ty = (tys[0] + tys[1]) / 2;
  }

  // peaks-engine.ts drawCar, path for path. The canopy is a band across the
  // top half clipped to the silhouette, which is how the engine paints it and
  // how a real CNG auto is actually coloured: yellow down the rear, over the
  // roof and down the windscreen, meeting the green at the window line.
  const BODY = 'M -20 11 L -20 -11 Q -19.5 -19.5 -11 -20 Q -2 -21 12.5 -18.5 '
    + 'Q 15.5 -16.5 16.5 -9.5 L 17.5 -5 Q 21 -2 23.5 7 Q 24.5 11 22.5 14 Q 20 17 15 16 L 8 11 Z';
  const spoke = (cx, cy, deg) => {
    const r = (deg * Math.PI) / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + 5 * Math.cos(r)).toFixed(2)}" y2="${(cy + 5 * Math.sin(r)).toFixed(2)}" stroke="${INK}" stroke-width="1.5"/>`;
  };
  const auto = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${((th * 180) / Math.PI).toFixed(2)}) scale(${SCALE})">
      <clipPath id="peaks-shell"><path d="${BODY}"/></clipPath>
      <path d="${BODY}" fill="#2E7D3B"/>
      <rect x="-22" y="-22" width="48" height="18" fill="#ECA400" clip-path="url(#peaks-shell)"/>
      <rect x="-9" y="-16" width="9" height="19" rx="3" ry="3" fill="${PAPER}"/>
      <rect x="2.5" y="-16" width="10" height="19" rx="3" ry="3" fill="${PAPER}"/>
      <circle cx="16" cy="13" r="6.75" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>
      ${spoke(16, 13, 40)}
      <circle cx="-12" cy="13" r="6.75" fill="${PAPER}" stroke="${INK}" stroke-width="2.5"/>
      ${spoke(-12, 13, 190)}
    </g>`;

  /* The viewBox grows up and to the left instead of the polyline moving: the
     line keeps the exact coordinates it shipped with, and the extra room is
     simply revealed around it, so the terrain's proportions are untouched and
     the card's margin-top still holds the footer on the card. The top edge
     follows the solved pose rather than sitting at a fixed bound: the auto's
     height above ground is data-dependent, and a refresh whose flattest
     window lands on a high plateau would otherwise slice the roof off. The
     local silhouette tops out at y = -22; rotation can only lower that
     corner, so the bound is exact with 12px of margin on top. */
  const autoTop = ty - 22 * SCALE * Math.cos(th) - 20 * SCALE * Math.abs(Math.sin(th));
  const VB = { x: -22, y: Math.min(-16, Math.floor(autoTop - 12)) };
  return `<svg width="${W - VB.x}" height="${H - VB.y}" viewBox="${VB.x} ${VB.y} ${W - VB.x} ${H - VB.y}" style="margin-top:36px">
      <polyline points="${path}" fill="none" stroke="${SAFFRON}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      ${auto}
    </svg>`;
}

// Title size shrinks as the headline lengthens so it always fits three lines.
function titleSize(title) {
  const n = title.length;
  if (n <= 30) return 76;
  if (n <= 46) return 66;
  return 56;
}

async function cardHtml({ title, deck, footer, motif = '' }) {
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
${motif}
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

const ONE_OFFS = [
  // Share v1 §6 — the four explore surfaces. Titles and decks are the spec's
  // verbatim copy; the footer keeps the "A Read · …" shape with an Explore
  // kicker. The 56 /rupee-time-machine/<year> pages share the RTM card.
  {
    out: resolve(PUBLIC_DIR, 'og/explore', 'index.png'),
    title: 'Explore the data',
    deck: 'Instruments on the Indian economy: inflation cut six ways, the payments boards, and a rupee time machine.',
    footer: 'Explore · Data: MoSPI · RBI · NPCI',
  },
  {
    out: resolve(PUBLIC_DIR, 'og/explore', 'inflation.png'),
    title: 'India Inflation',
    deck: 'The headline number, the long run since 1969, the divisions, all 358 items, every state, and the new basket on one board.',
    footer: 'Explore · Data: MoSPI',
  },
  {
    out: resolve(PUBLIC_DIR, 'og/explore', 'payments.png'),
    title: 'India Payments',
    deck: 'UPI, cards, ATMs and the bank-by-bank view of digital money, desk by desk.',
    footer: 'Explore · Data: RBI · NPCI',
  },
  {
    out: resolve(PUBLIC_DIR, 'og/explore', 'rupee-time-machine.png'),
    title: 'The Rupee Time Machine',
    deck: 'Any amount, any two months since 1969, one continuous price line. ₹100 of 2000 amounts to about ₹456 today.',
    footer: 'Explore · Data: Labour Bureau · MoSPI',
  },
  // Superseded by og/explore/payments.png (share v1 §6). Kept rendering so
  // links shared before the repoint still resolve to an image.
  {
    out: resolve(PUBLIC_DIR, 'og/dashboards', 'all.png'),
    title: 'India Payments',
    deck: 'Every payments desk on one page: headline totals, bank performance, apps, merchant categories and states, from official RBI and NPCI data.',
    footer: 'Interactive Dashboards · Data: RBI · NPCI',
  },
  {
    out: resolve(PUBLIC_DIR, 'og/play', 'off-by-how-much.png'),
    title: 'Off by How Much?',
    deck: 'Four rounds of guessing against real Indian payments data. Slide, commit, and see how far off you are.',
    footer: 'A Game · Data: RBI · NPCI',
    // The game's own visual, frozen: the slider scale with a guess (hollow)
    // and the answer (filled), the gap between them being the game.
    motif: `<svg width="620" height="64" viewBox="0 0 620 64" style="margin-top:44px">
      ${Array.from({ length: 40 }, (_, i) => {
        const x = 10 + i * 15.4, major = i % 5 === 0;
        return `<line x1="${x}" y1="${32 - (major ? 12 : 7)}" x2="${x}" y2="${32 + (major ? 12 : 7)}" stroke="${MUTED}" stroke-width="2" opacity="${major ? 0.55 : 0.3}"/>`;
      }).join('')}
      <line x1="4" y1="32" x2="616" y2="32" stroke="${MUTED}" stroke-width="3" opacity="0.5"/>
      <circle cx="178" cy="32" r="15" fill="${PAPER}" stroke="${INK_VARIANT}" stroke-width="6"/>
      <circle cx="420" cy="32" r="16" fill="${SAFFRON}"/>
    </svg>`,
  },
  {
    out: resolve(PUBLIC_DIR, 'og/play', 'inflation-peaks.png'),
    title: 'Inflation Peaks',
    deck: INFLATION_PEAKS_DECK,
    footer: 'A Game · Data: Labour Bureau · MoSPI',
    // The game's own visual: the actual terrain, the real series downsampled
    // to a card-width polyline, with the auto parked on it. Drawn from the
    // generated JSON so the card can never disagree with the course.
    motif: peaksMotif(),
  },
];

for (const { out, title, deck, footer, motif } of ONE_OFFS) {
  await renderCard(await cardHtml({ title, deck, footer, motif }), out);
  console.log(`wrote ${out}`);
  count++;
}

console.log(`\n${count} cards written.`);
