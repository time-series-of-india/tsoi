// Terrain for the Inflation Peaks game: one continuous monthly series of
// India's year-on-year inflation, August 1969 to the frozen survey end,
// plus the era table, weights and annotations the game reads.
//
// The terrain IS the data, so everything here is about not lying with it. The
// series itself, the three official segments it is spliced from, the linking
// factors, the two limited-collection months and the seam gates all live in
// `lib/inflation-spine.mjs` — the Inflation explore board draws the same line,
// and one spine through one set of gates is the only way the game and the board
// cannot disagree. Read that file for why the splice is where it is.
//
// What stays here is the game: the freeze, the annotations, the rendering
// scale, the sources line the page prints, and the worker's copy of the
// weight table.
//
// Usage: SCHEMA_NAME=economy_dev node scripts/build-inflation-peaks.mjs
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCHEMA, SITE, connect } from './lib/db.mjs';
import { buildSpine, buildEras, spineSources, longMonth, fail } from './lib/inflation-spine.mjs';

const OUT = resolve(SITE, 'public/data/economy/play');

/* Where the course ends, and it does not move. The 2020s used to run to the
   last published month, which made the terrain a month longer with every CPI
   release — and a longer era is a heavier weight, a higher target, and a
   different score for everyone who had already played. Someone who cleared
   the 2020s at 77/77 woke up the next month at 77/78, no longer a clear, with
   an index about 0.17 lower and a leaderboard that had reordered while they
   slept.
   A leaderboard only means something if everyone drove the same track, so the
   track is surveyed once. The spine is cut here too, not just the era: a
   terrain file carrying months no era covers would still move the resting
   chart's y-range with every release. The read's chart keeps growing; that is
   the read's job, and this is not the read. The board's long line keeps
   growing too, off the same spine uncut — the freeze is the game's alone.
   Moving this line rescores every filed basket. See
   the leaderboard rebuild note (internal ops docs), §2 (D1). */
const SPINE_END = '2026-06';

/* Rendering constants the engine wants alongside the data. They live here
   because the terrain's shape and its scale are one decision: change
   pxPerPct without looking at the series and you change which peaks are
   jumpable. */
const PX_PER_MONTH = 56;
const PX_PER_PCT = 9;

/* Mode credits, for the worker config emitted at the end of this file. They
   are the exaggerations in site/src/lib/play/peaks-engine.ts — a stretch
   driven on Hard climbed 1.4 times the height the true scale asks for and is
   worth 1.4 times as much of it. Restated here because this is a plain node
   script and the engine is TypeScript; retune a mode there and this line has
   to follow. */
const MODE_CREDITS = { easy: 0.6, medium: 1.0, hard: 1.4 };

/* ── Annotations ─────────────────────────────────────────────────────────
   What the crash screen says when you die somewhere that meant something.
   Hand-written on purpose: "the onion spike" is not a property the numbers
   carry, and deriving captions from the shape of the curve would be
   inventing history to fit terrain. Each key is asserted to be a real month
   in the spine at build time, so a caption can never drift onto the wrong
   peak or survive a month that disappears from the source. */
const ANNOTATIONS = [
  { ym: '1973-10', tag: 'First oil shock', text: 'The first oil shock. OPEC quadrupled the crude price over the winter.' },
  { ym: '1974-09', tag: 'Failed monsoon', text: 'The highest reading in the series. A failed monsoon on top of the oil shock.' },
  { ym: '1976-05', tag: 'Two good harvests', text: 'The deepest fall. Two good harvests put prices below where they stood a year earlier.' },
  { ym: '1980-11', tag: 'Second oil shock', text: 'The second oil shock, arriving after the revolution in Iran.' },
  { ym: '1991-08', tag: 'Balance of payments', text: 'The balance-of-payments crisis. The rupee was devalued twice that July.' },
  { ym: '1998-11', tag: 'Onion spike', text: 'The onion spike. A failed crop took vegetable prices up and a state election with them.' },
  { ym: '2010-01', tag: 'Food prices', text: 'Food prices after the 2009 drought, on top of a post-crisis stimulus.' },
  { ym: '2013-11', tag: 'Before targeting', text: 'The last stretch before inflation targeting. This is roughly where the RBI decided.' },
  { ym: '2020-04', tag: 'Lockdown, limited', text: 'Prices were collected in fewer markets under the lockdown. MOSPI published an index for April and May 2020 but no rate; these two months are computed from those indices.' },
  { ym: '2022-04', tag: 'War in Ukraine', text: 'War in Ukraine, and the end of the cheap-energy years.' },
];

/* Two or three words, because this one is drawn on the chart while the player
   is driving past it. `text` is the sentence the run-over card shows when you
   die nearby and there is time to read; `tag` is what fits under a peak at
   ten pixels and still says which month of history this hill is.

   Thrown rather than routed through fail(), which reports a data failure; a
   caption too long for the chart is an editing mistake, not a bad build. */
const TAG_WORDS = 3;
for (const a of ANNOTATIONS) {
  if (a.tag.split(' ').length > TAG_WORDS) {
    throw new Error(`annotation tag is more than ${TAG_WORDS} words: "${a.tag}"`);
  }
}

const { q, end } = await connect();

// ── 1. The spine, through its gates, cut at the freeze ────────────────────
const built = await buildSpine({ q, schema: SCHEMA, end: SPINE_END });
const {
  spine, points, first, last, segments, linkingFactors,
  limitedCollection, limitedCollectionDetail, limitedCollectionNote,
  quantization, quantizationNote,
} = built;

// ── 2. Eras and weights ───────────────────────────────────────────────────
const eras = buildEras({ points, first, last });

// Printed lightest-first because weight is what this block is about. The rack
// on the page runs newest-first; ordering there is a presentation decision.
console.log('\n  eras (listed by ascending weight):');
for (const e of [...eras].sort((a, b) => a.weight - b.weight)) {
  console.log(`    ${e.id} ${e.label.padEnd(22)} ${e.from}..${e.to}  n=${String(e.months).padStart(3)}  travel/mo=${e.climbPerMonth.toFixed(3).padStart(5)}  mean|yoy|=${e.meanAbsYoy.toFixed(2).padStart(5)}  w=${e.weight.toFixed(4)}  peak=${e.peak}`);
}

// ── 3. Annotations ────────────────────────────────────────────────────────
const annotations = ANNOTATIONS.map((a) => {
  if (!spine.has(a.ym)) fail(`annotation for ${a.ym} has no month in the spine`);
  const era = eras.find((e) => a.ym >= e.from && a.ym <= e.to);
  if (!era) fail(`annotation for ${a.ym} falls outside every era`);
  return { ym: a.ym, label: longMonth(a.ym), tag: a.tag, yoy: +spine.get(a.ym).toFixed(2), era: era.id, text: a.text };
});
console.log(`\n  annotations: ${annotations.length}, all resolved to real months`);

// ── 4. Write ──────────────────────────────────────────────────────────────
const out = {
  note: `India's monthly year-on-year inflation, ${longMonth(first)} to ${longMonth(last)}. Real series. Built by scripts/build-inflation-peaks.mjs.`,
  generated: new Date().toISOString().slice(0, 10),
  pxPerMonth: PX_PER_MONTH,
  pxPerPct: PX_PER_PCT,
  first,
  last,
  points,
  eras,
  annotations,
  meta: {
    segments,
    linkingFactors,
    limitedCollection,
    limitedCollectionDetail,
    limitedCollectionNote,
    quantization,
    quantizationNote,
  },
  sources: spineSources(built),
};

/* Written with writeFileSync rather than lib/db.mjs's writeData: this file
   predates the manifest convention and the game fetches it by a fixed path, so
   its bytes are left exactly as they were when the spine moved out. */
mkdirSync(OUT, { recursive: true });
const dest = resolve(OUT, 'inflation-peaks.json');
writeFileSync(dest, JSON.stringify(out));
console.log(`\n  wrote ${dest}`);
console.log(`  ${points.length} months, ${eras.length} eras, ${annotations.length} annotations, ${limitedCollection.length} computed from published indices (${limitedCollection.join(', ') || 'none'})`);

// ── 5. The board's copy of the weight table ───────────────────────────────
/* The play-score worker scores filed baskets on the same weights and the same
   era lengths the page does, so they get one source and it is this script. A
   rerun that moves a weight or adds a month leaves a deployed worker scoring
   on the old table until it is redeployed — infra/workers/README.md says so
   next to the deploy steps. Target is the era's month count less one: N
   points bound N-1 months of driving, which is a run's full score. */
const WORKER_DIR = resolve(SITE, '../infra/workers/play-score');
if (!existsSync(WORKER_DIR)) fail(`no worker directory at ${WORKER_DIR}`);
const peaksConfig = {
  generated: out.generated,
  modes: MODE_CREDITS,
  eras: Object.fromEntries(eras.map((e) => {
    if (e.months < 2) fail(`era ${e.id} has ${e.months} months, too short to drive`);
    return [e.id, { target: e.months - 1, weight: e.weight }];
  })),
};
const wSum = eras.reduce((a, e) => a + e.weight, 0);
const cfgDest = resolve(WORKER_DIR, 'peaks-config.json');
writeFileSync(cfgDest, `${JSON.stringify(peaksConfig, null, 2)}\n`);
console.log(`  wrote ${cfgDest}`);
console.log(`  targets ${Object.values(peaksConfig.eras).map((e) => e.target).join('/')}, weights sum to ${wSum}\n`);

await end();
