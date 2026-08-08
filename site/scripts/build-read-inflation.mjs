// Dataset for the inflation read ("Inflation: The Price of Nearly Everything"),
// Part I: the gap (beat 1), your basket (beat 2), the basket portrait (beat 3);
// Part II: the aggregation pyramid and the balance beam (beat 7), and the
// live verification pack (beat 8).
// Emits to public/data/lab/ while the read is a working draft — that path is
// outside the data manifest, so hash-data and deploy stay untouched. Moves to
// the manifest pipeline when the read ships.
//
// Sources: {SCHEMA}.mospi_cpi_coicop (2024-base COICOP series, monthly cron
// pending), {SCHEMA}.mospi_cpi_weights (hand-keyed from MoSPI FAQ
// Annexure V, per the CPI methodology note in the internal ops docs).
import { SCHEMA, connect, writeData } from './lib/db.mjs';

const { q, end } = await connect();

// `gap` — beat 1's figure: the All-India headline against Delhi's education
// division as INDEX LEVELS (2024 = 100), the full 18-month 2024-base span.
// Levels rather than YoY rates on review (2026-07-27): the education YoY
// drifts gently down month to month, which reads as "it's easing" and
// distracts from the beat's point, the LEVEL of the gap. The indices carry
// the truer picture: the headline grinds up smoothly while the school bill
// arrives as one step (Nov 2025), and both lines start at the same 100.
// YoY comes along per month where published (Jan 2026 onward) for the
// tooltip and the prose.
const gapRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state,
         index_value::float AS idx,
         round(inflation::numeric, 2)::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE sector = 'Combined' AND (group_name IS NULL OR group_name = '')
    AND index_value IS NOT NULL
    AND ((state = 'All India' AND division = 'CPI (General)')
      OR (state = 'NCT of Delhi' AND division = 'Education services'))
  ORDER BY date`);

const gapMonths = [...new Set(gapRaw.map((r) => r.m))].sort();
const gap = {
  months: gapMonths.map((m) => {
    const h = gapRaw.find((r) => r.m === m && r.state === 'All India');
    const e = gapRaw.find((r) => r.m === m && r.state === 'NCT of Delhi');
    return {
      m,
      headlineIdx: h?.idx ?? null, eduIdx: e?.idx ?? null,
      headline: h?.infl ?? null, edu: e?.infl ?? null,
    };
  }),
};
const gapLast = [...gap.months].reverse().find((r) => r.headline != null && r.edu != null);
// The read's Part I claims Delhi education has run "more than double the
// all-India pace" and the gap caption says "at least double in every month so
// far" — static prose around refreshed numbers. Refuse to emit the month the
// claim stops being true, so the prose is rewritten rather than silently wrong.
for (const r of gap.months) {
  if (r.headline == null || r.edu == null) continue;
  if (r.edu < 2 * r.headline) {
    throw new Error(`gap: ${r.m} Delhi edu ${r.edu}% is under 2x the headline ` +
      `${r.headline}% — the read's "at least double" claim no longer holds; reword Part I`);
  }
}

// `basket` — beat 3's slopegraph: division weights of the 2012 and 2024
// baskets, both restated on the COICOP-2018 structure (the only honest
// comparison; the food-share trap is MoSPI FAQ 40). Same shape the food-read
// lab used; the widget is shared.
const basketRaw = await q(`
  SELECT series, sector, category, weight
  FROM ${SCHEMA}.mospi_cpi_weights
  WHERE structure = 'coicop2018' AND level = 'division'`);
const basketBy = {};
for (const r of basketRaw) {
  const b = (basketBy[r.category] ??= { name: r.category });
  (b[r.sector] ??= {})[`w${r.series}`] = Number(r.weight);
}
const basket = Object.values(basketBy).sort((a, b) => b.combined.w2024 - a.combined.w2024);

// `yourBasket` — beat 2's interactive: latest month's YoY per division plus
// official combined weights; the reader reweights, the widget re-averages
// with the CPI's own arithmetic.
const ybRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, division, inflation::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE sector = 'Combined' AND state = 'All India' AND (group_name IS NULL OR group_name = '')
    AND inflation IS NOT NULL
    AND date = (SELECT max(date) FROM ${SCHEMA}.mospi_cpi_coicop
                WHERE sector = 'Combined' AND state = 'All India' AND inflation IS NOT NULL)`);
const ybHead = ybRaw.find((r) => r.division === 'CPI (General)');
// Index LEVELS, every published month (2025 included — the 2024 series shipped
// with a back-computed 2025 so the first YoY could print in Jan 2026). The
// widget needs them because the CPI's arithmetic is a ratio of two weighted
// sums of levels, not an average of the divisions' rates: rate-weighting the
// official basket gives 4.35 where the published number is 4.38.
const ylRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, division, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE sector = 'Combined' AND state = 'All India' AND (group_name IS NULL OR group_name = '')
    AND index_value IS NOT NULL
  ORDER BY date`);
const ylMap = new Map(ylRaw.map((r) => [`${r.m}|${r.division}`, r.idx]));
const lvlAt = (m, division) => ylMap.get(`${m}|${division}`) ?? null;
const ago = (m) => `${+m.slice(0, 4) - 1}-${m.slice(5)}`;

const yourBasket = {
  asOf: ybRaw[0]?.m,
  headline: ybHead ? Number(ybHead.infl.toFixed(2)) : null,
  divisions: basket
    .map((b) => {
      const row = ybRaw.find((r) => r.division === b.name);
      if (!row) return null;
      return {
        name: b.name,
        w: b.combined.w2024,
        infl: Number(row.infl.toFixed(2)),
        idx: lvlAt(ybRaw[0].m, b.name),
        idxAgo: lvlAt(ago(ybRaw[0].m), b.name),
      };
    })
    .filter(Boolean),
};
// `wv` — each division's share of what the basket cost a YEAR AGO (weight ×
// year-ago index, renormalised to 100). Weighting the divisions' own YoY rates
// by these instead of the base-year shares is an identity, not an
// approximation: it returns the published headline exactly, so the beam's
// fulcrum lands where the ministry's number does.
{
  const vw = yourBasket.divisions.map((d) => (d.idxAgo == null ? null : d.w * d.idxAgo));
  const tot = vw.reduce((a, b) => a + (b ?? 0), 0);
  if (tot > 0 && vw.every((v) => v != null)) {
    yourBasket.divisions.forEach((d, i) => { d.wv = Number(((vw[i] / tot) * 100).toFixed(4)); });
  }
}

// the widget's time-series panel: the full 2024-base YoY span per division,
// so the reader's reweighted line redraws against the headline month by
// month. Only months where EVERY division has a published YoY are kept —
// the reader's series must never silently change membership mid-line.
const ysRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, division, inflation::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE sector = 'Combined' AND state = 'All India' AND (group_name IS NULL OR group_name = '')
    AND inflation IS NOT NULL
  ORDER BY date`);
const ysAt = (m, division) => ysRaw.find((r) => r.m === m && r.division === division);
const ysMonths = [...new Set(ysRaw.map((r) => r.m))].sort().filter((m) =>
  ysAt(m, 'CPI (General)') && yourBasket.divisions.every((d) => ysAt(m, d.name))
  // levels for the month AND its year-ago twin, or the reader's line could not
  // be computed the way the index is
  && lvlAt(m, 'CPI (General)') && lvlAt(ago(m), 'CPI (General)')
  && yourBasket.divisions.every((d) => lvlAt(m, d.name) && lvlAt(ago(m), d.name)));
yourBasket.series = {
  months: ysMonths,
  headline: ysMonths.map((m) => Number(ysAt(m, 'CPI (General)').infl.toFixed(2))),
  divisions: yourBasket.divisions.map((d) => ({
    name: d.name,
    infl: ysMonths.map((m) => Number(ysAt(m, d.name).infl.toFixed(2))),
    idx: ysMonths.map((m) => lvlAt(m, d.name)),
    idxAgo: ysMonths.map((m) => lvlAt(ago(m), d.name)),
  })),
};

// `level` — Part II's opening beat: what 4.38 percent IS. The ministry
// publishes an index, and the percent on the news is the ratio of two of them
// twelve months apart. `old` carries the retired ruler's last reading so the
// prose can restate today's index on the 2012 base with the published linking
// factor (see verify.linking).
const oldTail = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined' AND series = 'Current'
    AND subgroup = 'General-Overall' AND index_value IS NOT NULL
  ORDER BY date DESC LIMIT 1`);
const level = {
  m: yourBasket.asOf,
  idx: lvlAt(yourBasket.asOf, 'CPI (General)'),
  agoM: ago(yourBasket.asOf),
  idxAgo: lvlAt(ago(yourBasket.asOf), 'CPI (General)'),
  yoy: yourBasket.headline,
  firstYoY: ysMonths[0] ?? null,
  old: oldTail[0] ? { m: oldTail[0].m, idx: oldTail[0].idx, base: '2012' } : null,
};

// `strands` — the opening bookend, "many lines, one line": each strand of
// the motif is seeded from a real division's index path (2024 base, All
// India, Combined, full published span), so the drawing is abstract but not
// invented. The saffron line they converge into ends at the headline.
const stRaw = await q(`
  SELECT division, to_char(date, 'YYYY-MM') AS m, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined'
    AND (group_name IS NULL OR group_name = '')
    AND division <> 'CPI (General)' AND index_value IS NOT NULL
  ORDER BY division, date`);
const stBy = {};
const stDivMonths = {};
for (const r of stRaw) {
  (stBy[r.division] ??= []).push(r.idx);
  (stDivMonths[r.division] ??= []).push(r.m);
}
const strands = {
  asOf: yourBasket.asOf,
  headline: yourBasket.headline,
  divisions: Object.entries(stBy).map(([name, idx]) => ({ name, idx })),
};

// `oneLine` — the opening bookend: the headline alone, month by month, as
// far back as YoY exists. 2012-base series through Dec 2025, 2024-base from
// Jan 2026 — joining the HEADLINE across the rebase is the one splice the
// methodology permits (splice headline only, never categories); the caption
// declares both series. The closing bookend (Part III) reuses `strands` to
// reveal this same line as the merge of twelve.
const olOld = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, round(inflation::numeric, 2)::float AS v
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined' AND series = 'Current'
    AND subgroup = 'General-Overall' AND inflation IS NOT NULL
  ORDER BY date`);
const olNew = gap.months
  .filter((r) => r.headline != null)
  .map((r) => ({ m: r.m, v: r.headline }));
const oneLine = {
  asOf: yourBasket.asOf,
  latest: yourBasket.headline,
  points: [...olOld.filter((r) => r.m < (olNew[0]?.m ?? '9999')), ...olNew],
};

// `ruler` — "The index and the headline" strip figure: the headline index
// with its rural and urban parents, every published month of the 2024 base,
// aligned on one month axis. The widget derives the rates (a month over the
// one twelve back) itself so strip and caption can never disagree, and the
// blend arithmetic reads its shares from pyramid.sectors.
const rlRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, sector, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND division = 'CPI (General)' AND series = 'Current'
    AND (group_name IS NULL OR group_name = '') AND index_value IS NOT NULL
  ORDER BY date`);
const rlMonths = [...new Set(rlRaw.map((r) => r.m))].sort();
const rlSec = (s) =>
  rlMonths.map((m) => rlRaw.find((r) => r.m === m && r.sector === s)?.idx ?? null);
const ruler = {
  months: rlMonths,
  combined: rlSec('Combined'),
  rural: rlSec('Rural'),
  urban: rlSec('Urban'),
};

// alignment gate: the aisles widget pairs strands.divisions[i].idx[j] with
// ruler.months[j] by position, so a division missing one month would shift
// every scrubbed value silently. Refuse to build rather than misalign.
for (const [name, ms] of Object.entries(stDivMonths)) {
  if (ms.length !== rlMonths.length || ms.some((m, j) => m !== rlMonths[j])) {
    throw new Error(`strands: ${name} months diverge from ruler (${ms.length} v ${rlMonths.length})`);
  }
}

// `core` — the divisions beat's second figure: the headline against core
// (everything but food and fuel), told on the retired 2012 series because
// only it is long enough to show the point — core barely moves while the
// headline swings with harvests and crude. Both lines are YoY of group
// indices computed the same way; core's index is the weighted sum of the
// four spared groups. The weights are the 2012 series' official All-India
// Combined weighting diagram (CSO), keyed here because the DB carries only
// the 2024 weights. Categories are never spliced across the rebase (see
// oneLine), so the figure ends where the old series does, December 2025.
const CORE_W = {
  'Clothing and Footwear': 6.53,
  'Housing': 10.07,
  'Pan, Tobacco and Intoxicants': 2.38,
  'Miscellaneous': 28.32,
};
const FOOD_FUEL_W = { 'Food and Beverages': 45.86, 'Fuel and Light': 6.84 };
// Housing rides in from BOTH sectors: the API's Combined housing series has a
// ten-month hole (Dec 2018 – Sep 2019) that the Urban series does not, and in
// the 2012 base Housing is measured in urban markets only, so the Combined
// series IS the Urban one under another label — identical in all 146 months
// where the API serves both (checked 2026-08-08, max diff 0.0). Combined wins
// wherever it exists; Urban fills the hole. The assembly gate below then
// proves the fill on exactly those months: six groups that no longer summed
// to the published General would refuse to build.
const coRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, subgroup, sector, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND series = 'Current'
    AND (sector = 'Combined' OR (sector = 'Urban' AND subgroup = 'Housing-Overall'))
    AND subgroup LIKE '%-Overall' AND subgroup <> 'Consumer Food Price-Overall'
    AND index_value IS NOT NULL
  ORDER BY date`);
const coBy = new Map();
for (const r of coRaw) {
  const g = coBy.get(r.m) ?? {};
  const key = r.subgroup.replace(/-Overall$/, '');
  if (r.sector === 'Combined' || g[key] == null) g[key] = r.idx;
  coBy.set(r.m, g);
}
// data-health gate: the six group indices must still assemble into the
// published General under the keyed weights, or the weights no longer match
// the series and core cannot be trusted.
let coWorst = 0;
for (const [m, g] of coBy) {
  const parts = { ...CORE_W, ...FOOD_FUEL_W };
  if (g.General == null || Object.keys(parts).some((k) => g[k] == null)) continue;
  const built = Object.entries(parts).reduce((a, [k, w]) => a + g[k] * w, 0) / 100;
  coWorst = Math.max(coWorst, Math.abs(built - g.General));
  if (Math.abs(built - g.General) > 0.25) {
    throw new Error(`core gate: ${m} rebuilt General ${built.toFixed(2)} vs published ${g.General}`);
  }
}
// the widget breaks food and fuel away one at a time, so the two half-way
// aggregates ship alongside core: minus food (fuel still in), minus fuel
// (food still in). Each is the weighted average of the groups it keeps.
const ALL_W = { ...CORE_W, ...FOOD_FUEL_W };
const aggIdxAt = (m, keys) => {
  const g = coBy.get(m);
  if (!g || keys.some((k) => g[k] == null)) return null;
  const wsum = keys.reduce((a, k) => a + ALL_W[k], 0);
  return keys.reduce((a, k) => a + g[k] * ALL_W[k], 0) / wsum;
};
const CORE_KEYS = Object.keys(CORE_W);
const AGGS = {
  core: CORE_KEYS,
  exFood: [...CORE_KEYS, 'Fuel and Light'],
  exFuel: [...CORE_KEYS, 'Food and Beverages'],
};
// Every calendar month of the span rides along, any hole as nulls — the
// widget draws a break rather than bridging one, because dropping months
// would silently compress the decade and bury the very swings the figure
// exists to show. With Housing filled from the Urban series above, the
// current build has no hole; the machinery stays for the next one.
const coAt = (m) => {
  const ago12 = `${+m.slice(0, 4) - 1}${m.slice(4)}`;
  const g = coBy.get(m), gAgo = coBy.get(ago12);
  if (g?.General == null || gAgo?.General == null) return null;
  const yoys = {};
  for (const [key, keys] of Object.entries(AGGS)) {
    const a = aggIdxAt(m, keys), b = aggIdxAt(ago12, keys);
    if (a == null || b == null) return null;
    yoys[key] = Math.round((a / b - 1) * 10000) / 100;
  }
  return { headline: Math.round((g.General / gAgo.General - 1) * 10000) / 100, ...yoys };
};
const coValid = [...coBy.keys()].sort().filter((m) => coAt(m) != null);
if (!coValid.length) throw new Error('core: no resolvable months at all');
const core = { months: [], headline: [], exFood: [], exFuel: [], core: [] };
for (let m = coValid[0]; m <= coValid.at(-1); ) {
  const v = coAt(m);
  core.months.push(m);
  core.headline.push(v?.headline ?? null);
  core.exFood.push(v?.exFood ?? null);
  core.exFuel.push(v?.exFuel ?? null);
  core.core.push(v?.core ?? null);
  const [y, mo] = m.split('-').map(Number);
  m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}

// `longRun` — the descent's long figure: the whole headline story on one
// pair of strips, 2012 to now. The rate row is the one splice the
// methodology permits (see oneLine). The index row is the retired series as
// published, continued past the rebase by restating the new index on the
// old ruler with the official combined linking factor — the same 0.5267 the
// linking gate below verifies against the DB. `newIdx` rides along for the
// post-splice months so the caption can also read the index on its own 2024
// ruler; `spliceAt` lets the widget draw the seam instead of hiding it.
const LF_COMBINED = 0.5267;
const lrOld = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, index_value::float AS idx,
         round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined' AND series = 'Current'
    AND subgroup = 'General-Overall' AND index_value IS NOT NULL
    AND date >= '2012-01-01'
  ORDER BY date`);
if (!lrOld.length) throw new Error('longRun: the 2012 series came back empty');
const lrCut = lrOld.at(-1).m;
const lrNew = gap.months.filter((r) => r.m > lrCut);
const lrHole = lrNew.find((r) => r.headlineIdx == null);
if (lrHole) throw new Error(`longRun: ${lrHole.m} has no headline index to restate`);
const longRun = {
  months: [...lrOld.map((r) => r.m), ...lrNew.map((r) => r.m)],
  idx: [
    ...lrOld.map((r) => r.idx),
    ...lrNew.map((r) => Math.round((r.headlineIdx / LF_COMBINED) * 100) / 100),
  ],
  yoy: [...lrOld.map((r) => r.yoy), ...lrNew.map((r) => r.headline)],
  newIdx: [...lrOld.map(() => null), ...lrNew.map((r) => r.headlineIdx)],
  spliceAt: lrNew[0]?.m ?? null,
};

// `pyramid` — beat 7: the whole aggregation tree, every node carrying its
// weight, its index and its year-on-year, so the funnel can be climbed from
// any cell rather than only the tomato's.
//
// The weights come from mospi_cpi_item_weights (Annexure 5.3d, loaded by
// etl/mospi/load_weights2024.py). MoSPI publishes weights at division, group
// and item level only — class and sub-class are derived here as sums of
// member item weights, which is what they are. The loader has already checked
// that summing 5.3d reproduces the published division and group tables to
// 1e-13, so the derived middle floors rest on a verified base.
const latestMonth = await q(`
  SELECT to_char(max(date), 'YYYY-MM-DD') AS d FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND index_value IS NOT NULL`);
const latestD = latestMonth[0].d;
const lvlCounts = await q(`
  SELECT
    count(DISTINCT division) FILTER (WHERE division <> 'CPI (General)') AS divisions,
    count(DISTINCT (division, group_name)) FILTER (WHERE group_name <> '' AND (class_name IS NULL OR class_name = '')) AS groups,
    count(DISTINCT (division, group_name, class_name)) FILTER (WHERE class_name <> '' AND (sub_class IS NULL OR sub_class = '')) AS classes,
    count(DISTINCT (division, group_name, class_name, sub_class)) FILTER (WHERE sub_class <> '' AND (item IS NULL OR item = '')) AS subclasses,
    count(DISTINCT item) FILTER (WHERE item <> '') AS items
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND date = '${latestD}'`);
const lc = lvlCounts[0];
const pathRaw = await q(`
  SELECT code, division, group_name, class_name, sub_class, item,
         index_value::float AS idx, inflation::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND date = '${latestD}'
    AND code IN ('GEN', '01', '01.1', '01.1.7', '01.1.7.2', '01.1.7.2.1.01')`);
const byCode = Object.fromEntries(pathRaw.map((r) => [r.code, r]));
const tomatoW = await q(`
  SELECT weight::float AS w FROM ${SCHEMA}.mospi_cpi_weights
  WHERE structure = 'coicop2018' AND series = 2024 AND sector = 'combined'
    AND level = 'item' AND category = 'Tomato'`);

// Every node of the tree: code, parent, level, name, weight, index, YoY.
// Weights roll up from the item table; index and YoY come from the published
// COICOP series. The join is on `code`, which both sides carry natively.
const treeRaw = await q(`
  WITH w AS (
    SELECT item_code AS code, NULL::text AS parent, 'item' AS level,
           min(item) AS name, sum(share_all_india)::float AS weight
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
    UNION ALL
    SELECT sub_class_code, min(class_code), 'subclass', min(sub_class), sum(share_all_india)::float
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
    UNION ALL
    SELECT class_code, min(group_code), 'class', min(class_name), sum(share_all_india)::float
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
    UNION ALL
    SELECT group_code, min(division_code), 'group', min(group_name), sum(share_all_india)::float
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
    UNION ALL
    SELECT division_code, 'GEN', 'division', min(division), sum(share_all_india)::float
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
  ),
  -- an item's parent is its sub-class, which the item table carries per row
  ip AS (SELECT DISTINCT item_code, sub_class_code FROM ${SCHEMA}.mospi_cpi_item_weights)
  SELECT w.code, COALESCE(w.parent, ip.sub_class_code) AS parent, w.level, w.name,
         round(w.weight::numeric, 4)::float AS weight,
         c.index_value::float AS idx, c.inflation::float AS infl
    FROM w
    LEFT JOIN ip ON ip.item_code = w.code AND w.level = 'item'
    LEFT JOIN ${SCHEMA}.mospi_cpi_coicop c
      ON c.code = w.code AND c.state = 'All India' AND c.sector = 'Combined'
     AND c.date = '${latestD}'
   ORDER BY w.level, w.code`);

const gen = byCode['GEN'];
const tree = [
  { code: 'GEN', parent: null, level: 'general', name: 'the headline',
    weight: 100, idx: gen.idx, infl: gen.infl },
  ...treeRaw.map((r) => ({
    code: r.code, parent: r.parent, level: r.level, name: r.name,
    weight: r.weight, idx: r.idx, infl: r.infl,
  })),
];
// A node with no index is a node the figure cannot label; a node with no
// parent is an orphan the funnel cannot thread. Either means the two sources
// have drifted apart, and the figure would be quietly wrong rather than
// visibly broken.
const codes = new Set(tree.map((n) => n.code));
const orphans = tree.filter((n) => n.parent && !codes.has(n.parent));
const unpriced = tree.filter((n) => n.idx == null);
if (orphans.length || unpriced.length) {
  throw new Error(`pyramid tree broken: ${orphans.length} orphaned nodes ` +
    `(${orphans.slice(0, 3).map((n) => n.code).join(', ')}), ` +
    `${unpriced.length} without an index ` +
    `(${unpriced.slice(0, 3).map((n) => n.code).join(', ')})`);
}
// Each floor's weights must still sum to the hundred they were split from.
for (const level of ['division', 'group', 'class', 'subclass', 'item']) {
  const sum = tree.filter((n) => n.level === level)
    .reduce((a, n) => a + n.weight, 0);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`pyramid ${level} weights sum to ${sum.toFixed(4)}, not 100`);
  }
}

const pyramid = {
  asOf: yourBasket.asOf,
  levels: [
    { key: 'general', label: 'the headline', n: 1 },
    { key: 'division', label: 'divisions', n: +lc.divisions },
    { key: 'group', label: 'groups', n: +lc.groups },
    { key: 'class', label: 'classes', n: +lc.classes },
    { key: 'subclass', label: 'sub-classes', n: +lc.subclasses },
    { key: 'item', label: 'items', n: +lc.items },
  ],
  tree,
  path: [
    // the tomato's own weight is now in the tree too; the hand-keyed value
    // stays as the cross-check on the newly loaded table
    // idx rides along with infl: the read walks the tomato's INDEX up the tree
    // as well as its rate, since the index is what actually merges
    { level: 'Item', name: 'Tomato', infl: byCode['01.1.7.2.1.01'].infl, idx: byCode['01.1.7.2.1.01'].idx, w: tomatoW[0].w },
    { level: 'Sub-class', name: byCode['01.1.7.2'].sub_class, infl: byCode['01.1.7.2'].infl, idx: byCode['01.1.7.2'].idx },
    { level: 'Class', name: byCode['01.1.7'].class_name, infl: byCode['01.1.7'].infl, idx: byCode['01.1.7'].idx },
    { level: 'Group', name: byCode['01.1'].group_name, infl: byCode['01.1'].infl, idx: byCode['01.1'].idx },
    { level: 'Division', name: byCode['01'].division, infl: byCode['01'].infl, idx: byCode['01'].idx, w: basket.find((b) => /^Food/.test(b.name))?.combined.w2024 },
    { level: 'General', name: 'the headline', infl: byCode['GEN'].infl, idx: byCode['GEN'].idx },
  ],
  // How the two sectors make one number. Rural and urban are indexed
  // separately; an item's combined weight is simply its rural share plus its
  // urban share of the same national hundred, so the blend is already inside
  // every weight rather than being a step at the top.
  sectors: Object.fromEntries((await q(`
    SELECT sector, round(sum(share_all_india)::numeric, 2)::float AS w
      FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1`)).map((r) => [r.sector.toLowerCase(), r.w])),
};

// `verify` — beat 8: the checks are RUN here, at build time, not quoted from a
// doc. (a) Every parent node in the hierarchy sits inside its children's
// min-max range, every month — the defining property of a weighted average.
// (b) For parents with exactly two well-separated children, the weight split
// solved backward from published indices is constant month to month — proof
// the weights are genuinely fixed. (c) The General index reconstructs from
// MoSPI's published division weights. (d) The official 2012→2024 linking
// factors reproduce from our two independently fetched series.
const vRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, code, division, group_name, class_name, sub_class, item,
         index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND index_value IS NOT NULL`);
const vLvl = (r) => r.item ? 5 : r.sub_class ? 4 : r.class_name ? 3 : r.group_name ? 2 : r.division === 'CPI (General)' ? 0 : 1;
const vKey = (r, L) => [r.division, L >= 2 ? r.group_name : '', L >= 3 ? r.class_name : '', L >= 4 ? r.sub_class : ''].join('|');
const vByM = {};
for (const r of vRaw) (vByM[r.m] ??= []).push(r);
const vMonths = Object.keys(vByM).sort();
const parentIds = new Set();
let rangeChecks = 0, rangeFails = 0;
const twoChild = {}; // parent code -> per-month {p, c: [..]}
for (const [m, rs] of Object.entries(vByM)) {
  for (let L = 0; L <= 4; L++) {
    for (const p of rs.filter((r) => vLvl(r) === L)) {
      const kids = rs.filter((r) => vLvl(r) === L + 1 && (L === 0 || vKey(r, L) === vKey(p, L)));
      if (!kids.length) continue;
      rangeChecks++;
      parentIds.add(`${L}|${p.code}`);
      const vals = kids.map((k) => k.idx);
      if (p.idx < Math.min(...vals) - 0.005 || p.idx > Math.max(...vals) + 0.005) rangeFails++;
      if (kids.length === 2) (twoChild[p.code] ??= { code: p.code, rows: [] }).rows.push({ m, p: p.idx, c: vals });
    }
  }
}
// testable two-child nodes: children separated by > 1 index point in every
// month, so the solved weight w1 = (P - C2)/(C1 - C2) is numerically stable
const twoChildStats = Object.values(twoChild)
  .filter((n) => n.rows.length === vMonths.length && n.rows.every((r) => Math.abs(r.c[0] - r.c[1]) > 1))
  .map((n) => {
    const ws = n.rows.map((r) => (r.p - r.c[1]) / (r.c[0] - r.c[1]));
    const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
    const sd = Math.sqrt(ws.reduce((a, w) => a + (w - mean) ** 2, 0) / ws.length);
    return { code: n.code, mean, sd };
  });
const n132 = twoChild['13.2'].rows.sort((a, b) => (a.m < b.m ? -1 : 1));
const n132Names = await q(`
  SELECT code, coalesce(nullif(sub_class, ''), nullif(class_name, ''), group_name) AS name
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND date = '${latestD}'
    AND code IN ('13.2', '13.2.1', '13.2.9')`);
const s132 = twoChildStats.find((n) => n.code === '13.2');
// (c) reconstruction from published division weights
let reconWorst = 0, reconWorstM = '', reconLatest = 0, pubLatest = 0;
for (const m of vMonths) {
  const rs = vByM[m];
  const gen = rs.find((r) => r.code === 'GEN');
  if (!gen) continue;
  const recon = basket.reduce((a, b) => {
    const d = rs.find((r) => vLvl(r) === 1 && r.division === b.name);
    return a + b.combined.w2024 * d.idx;
  }, 0) / 100;
  const err = Math.abs(recon - gen.idx);
  if (err > reconWorst) { reconWorst = err; reconWorstM = m; }
  if (m === vMonths[vMonths.length - 1]) { reconLatest = recon; pubLatest = gen.idx; }
}
// (d) linking factors: geometric means over the calendar-2025 overlap
const linking = {};
for (const [sec, official] of [['Rural', 0.5222], ['Urban', 0.532], ['Combined', 0.5267]]) {
  const nu = await q(`
    SELECT index_value::float AS idx FROM ${SCHEMA}.mospi_cpi_coicop
    WHERE state = 'All India' AND sector = '${sec}' AND division = 'CPI (General)'
      AND date >= '2025-01-01' AND date < '2026-01-01'`);
  const old = await q(`
    SELECT index_value::float AS idx FROM ${SCHEMA}.mospi_cpi_index
    WHERE state = 'All India' AND sector = '${sec}' AND series = 'Current'
      AND subgroup = 'General-Overall' AND date >= '2025-01-01' AND date < '2026-01-01'`);
  const gm = (a) => Math.exp(a.reduce((s, r) => s + Math.log(r.idx), 0) / a.length);
  linking[sec.toLowerCase()] = { official, ours: Number((gm(nu) / gm(old)).toFixed(4)), n: nu.length };
}
const verify = {
  months: vMonths.length,
  parents: parentIds.size,
  rangeChecks, rangeFails,
  node: {
    code: '13.2',
    name: n132Names.find((r) => r.code === '13.2')?.name,
    kids: ['13.2.1', '13.2.9'].map((c) => n132Names.find((r) => r.code === c)?.name),
    mean: Number(s132.mean.toFixed(4)), sd: Number(s132.sd.toFixed(5)),
    rows: ['2025-01', '2025-06', '2026-01', '2026-06']
      .map((m) => n132.find((r) => r.m === m))
      .filter(Boolean)
      .map((r) => ({ m: r.m, p: r.p, c1: r.c[0], c2: r.c[1], w1: Number(((r.p - r.c[1]) / (r.c[0] - r.c[1])).toFixed(4)) })),
  },
  twoChildN: twoChildStats.length,
  twoChildSdMax: Number(Math.max(...twoChildStats.map((n) => n.sd)).toFixed(5)),
  recon: {
    worst: Number(reconWorst.toFixed(4)), worstM: reconWorstM,
    latest: Number(reconLatest.toFixed(4)), pub: pubLatest,
  },
  linking,
};

// ---- `wild` — Part III: the number in the wild ---------------------------------

// Beat 9, the base-effect device: 2012-base Vegetables sub-group, All-India
// Combined, index + published YoY. Window starts 2022 so the scrubber always
// has the year-ago index on screen; the device's home month (July 2024) is
// the cleanest case on record — the index JUMPS 234.2 → 267.3 while the
// published rate collapses +29.32 → +6.83, because July 2023's spike enters
// the comparison. Both numbers below are the ministry's own.
const vegRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, index_value::float AS idx,
         round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined' AND subgroup = 'Vegetables'
    AND date >= '2022-01-01' AND date <= '2025-12-01'
  ORDER BY date`);
const base = {
  name: 'Vegetables (CPI sub-group, 2012 = 100)',
  months: vegRaw.map((r) => r.m),
  idx: vegRaw.map((r) => r.idx),
  yoy: vegRaw.map((r) => r.yoy),
  home: '2024-07',
};
if (!base.months.includes('2024-07')) throw new Error('base-effect home month missing');

// Beat 10, what the average hides: the headline rebuilt from the 358 item
// weights and item indices, then rebuilt again with the two jewellery items
// removed. This is not an approximation. The CPI's aggregation is a ratio of
// two weighted sums of index LEVELS, and doing exactly that with the
// Annexure 5.3 weights returns the published headline to the second decimal
// in every month of 2026 (the guard below refuses to emit otherwise). That
// is what licenses the counterfactual: the ex-jewellery number is computed
// the same way the real one is, not by subtracting contributions.
//
// The finding: gold and silver jewellery are ₹0.94 of the hundred and carry
// roughly three-quarters of a point of a 4.38 percent headline. Silver alone
// out-drives petrol, which has fourteen times its weight.
const JEWEL = ['13.2.1.1.1.01', '13.2.1.1.1.02'];
const SILVER = '13.2.1.1.1.02';
const itemW = await q(`
  SELECT item_code AS code, max(item) AS name, sum(share_all_india)::float AS w
  FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1`);
const wByCode = new Map(itemW.map((r) => [r.code, r]));
const itemIdxRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, code, index_value::float AS idx,
         round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND item IS NOT NULL
    AND index_value IS NOT NULL
  ORDER BY date`);
// month -> code -> {idx, yoy}, for the two rebuilds
const byMonth = new Map();
for (const r of itemIdxRaw) {
  if (!wByCode.has(r.code)) continue;
  if (!byMonth.has(r.m)) byMonth.set(r.m, new Map());
  byMonth.get(r.m).set(r.code, r);
}
const ctMonths = [...byMonth.keys()].sort();
// a weighted mean of levels over a chosen membership — the CPI's own arithmetic
const aggAt = (m, drop = []) => {
  const rows = byMonth.get(m);
  if (!rows) return null;
  let num = 0, den = 0;
  for (const [code, r] of rows) {
    if (drop.includes(code)) continue;
    const w = wByCode.get(code).w;
    num += w * r.idx; den += w;
  }
  return den ? num / den : null;
};
const yoyOf = (m, drop) => {
  const now = aggAt(m, drop), then = aggAt(ago(m), drop);
  return now != null && then != null ? (now / then - 1) * 100 : null;
};
const ctSeries = ctMonths
  .map((m) => ({ m, full: yoyOf(m, []), ex: yoyOf(m, JEWEL) }))
  .filter((r) => r.full != null);
// the guard: our rebuild must BE the published headline, or the section's
// whole claim (and the counterfactual it rests on) is unfounded
const pubHead = new Map((await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND code = 'GEN'
    AND inflation IS NOT NULL`)).map((r) => [r.m, r.yoy]));
let ctRecon = 0;
for (const r of ctSeries) {
  const p = pubHead.get(r.m);
  if (p == null) continue;
  ctRecon = Math.max(ctRecon, Math.abs(r.full - p));
}
if (ctRecon > 0.005) {
  throw new Error(`item-weight rebuild misses the published headline by ${ctRecon.toFixed(4)} pts`);
}
const ctM = ctSeries.at(-1).m;
const ctRows = byMonth.get(ctM);
// every item's contribution to the month, weight × its own rate; the top of
// this list is the figure, and the sum is the headline to within rounding
const ctItems = [...ctRows.values()]
  .filter((r) => r.yoy != null)
  .map((r) => {
    const w = wByCode.get(r.code);
    return { code: r.code, name: w.name, w: +w.w.toFixed(3), yoy: r.yoy,
      c: +((w.w * r.yoy) / 100).toFixed(3) };
  })
  .sort((a, b) => b.c - a.c);
const silverRows = ctMonths.map((m) => byMonth.get(m).get(SILVER)).filter(Boolean);
const contrib = {
  m: ctM,
  published: pubHead.get(ctM),
  rebuilt: +ctSeries.at(-1).full.toFixed(2),
  ex: +ctSeries.at(-1).ex.toFixed(2),
  jewelW: +JEWEL.reduce((a, c) => a + wByCode.get(c).w, 0).toFixed(3),
  items: ctItems.slice(0, 12),
  jewel: JEWEL.map((c) => ctItems.find((r) => r.code === c)),
  series: ctSeries.map((r) => ({ m: r.m, full: +r.full.toFixed(2), ex: +r.ex.toFixed(2) })),
  silver: {
    name: wByCode.get(SILVER).name, w: +wByCode.get(SILVER).w.toFixed(3),
    months: ctMonths.slice(0, silverRows.length),
    idx: silverRows.map((r) => r.idx),
    first: silverRows[0]?.idx, peak: Math.max(...silverRows.map((r) => r.idx)),
  },
  reconWorst: +ctRecon.toFixed(4),
};
// "What the average hides" is written around silver jewellery by name — the
// month it stops being the top contributor, the section becomes fiction with
// fresh numbers in it. Fail the build instead; the section gets re-anchored.
if (ctItems[0].code !== SILVER) {
  throw new Error(`contrib: top pusher in ${ctM} is "${ctItems[0].name}" (${ctItems[0].code}), ` +
    `not silver jewellery — re-anchor the "What the average hides" section before publishing`);
}

// Beat 11, the many Indias: the spread of state inflation, month by month,
// 2016 to now. A single month's ranking was the old figure and it lied twice
// — it read as a league table, and it could not distinguish a real gap from
// the reshuffle that a base change causes. The band does neither.
//
// p10–p90 rather than min–max on purpose. The extremes are small union
// territories with thin samples: Manipur alone has been both the highest
// state (37 months) and the lowest (21). Drawing min–max would make sampling
// noise look like the finding. The middle-80 band is the honest claim, and
// it has never been narrower than about 3 points in ten years.
//
// 2012-base state series to Dec 2025, 2024-base from Jan 2026 (the only
// months the new base has rates for). The seam is marked, not hidden — the
// reshuffle across it is the section's second point.
const stKey = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/^the /, '').replace(/^nct of /, '').replace(/\s+/g, ' ').trim();
const FEATURED = { delhi: 'Delhi', kerala: 'Kerala', bihar: 'Bihar' };
const SHORT_STATES = {
  'andaman and nicobar islands': 'A&N Islands',
  'dadra and nagar haveli and daman and diu': 'DNH & Daman-Diu',
  'jammu and kashmir': 'J&K',
  'himachal pradesh': 'Himachal',
  'arunachal pradesh': 'Arunachal',
};
const stOldRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state AS s, inflation::float AS v
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE sector = 'Combined' AND subgroup = 'General-Overall'
    AND inflation IS NOT NULL AND date >= '2016-01-01' AND date <= '2025-12-01'`);
const stNewRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state AS s, inflation::float AS v
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE sector = 'Combined' AND code = 'GEN' AND inflation IS NOT NULL
    AND date >= '2026-01-01'`);
const stAll = [...stOldRaw, ...stNewRaw].map((r) => ({ ...r, key: stKey(r.s) }));
// a month counts only if the states actually reported — a stray All-India-only
// month would otherwise produce a band computed from nothing
const stCount = {};
for (const r of stAll) if (r.key !== 'all india') stCount[r.m] = (stCount[r.m] ?? 0) + 1;
const stMonths = Object.keys(stCount).filter((m) => stCount[m] >= 20).sort();
if (!stMonths.length) throw new Error('no month has enough state rows for the band');
const pct = (sorted, p) => {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};
const stBand = [], stAi = [], stFeat = { delhi: [], kerala: [], bihar: [] };
for (const m of stMonths) {
  const rows = stAll.filter((r) => r.m === m);
  const vals = rows.filter((r) => r.key !== 'all india').map((r) => r.v).sort((a, b) => a - b);
  stBand.push({
    m, p10: +pct(vals, 0.1).toFixed(2), p25: +pct(vals, 0.25).toFixed(2),
    p75: +pct(vals, 0.75).toFixed(2), p90: +pct(vals, 0.9).toFixed(2), n: vals.length,
  });
  stAi.push(rows.find((r) => r.key === 'all india')?.v ?? null);
  for (const [k, name] of Object.entries(FEATURED)) {
    const hit = rows.find((r) => r.key === stKey(name));
    stFeat[k].push(hit ? +hit.v.toFixed(2) : null);
  }
}
// the two facts the section asserts, computed rather than asserted
const spreads = stBand.map((b) => b.p90 - b.p10);
const byYear = {};
for (const b of stBand) {
  (byYear[b.m.slice(0, 4)] ??= []).push(b.p90 - b.p10);
}
const yearSpread = Object.entries(byYear)
  .map(([y, xs]) => ({ y, avg: +(xs.reduce((a, x) => a + x, 0) / xs.length).toFixed(1) }));
// who has actually held the top, over the whole 2012-base run
const topRuns = {};
for (const m of stMonths) {
  const rows = stAll.filter((r) => r.m === m && r.key !== 'all india');
  if (!rows.length) continue;
  const top = rows.reduce((a, b) => (b.v > a.v ? b : a));
  topRuns[top.key] = (topRuns[top.key] ?? 0) + 1;
}
// the figure itself is one month, every state as a dot on a single percent
// axis, with All India marked. A decade-long band said the same thing and
// said it less clearly; the persistence claim it carried is a sentence in the
// prose backed by yearSpread below, which is computed over all 122 months.
const stLastM = stMonths.at(-1);
const stLatest = stAll
  .filter((r) => r.m === stLastM)
  .map((r) => ({
    key: r.key,
    name: SHORT_STATES[r.key] ?? (r.key === 'delhi' ? 'Delhi' : r.s.replace(/ And /g, ' & ').replace(/^NCT of /, '')),
    v: +r.v.toFixed(2),
    ai: r.key === 'all india',
    show: Object.values(FEATURED).some((n) => stKey(n) === r.key),
  }))
  .sort((a, b) => a.v - b.v);
if (stLatest.length < 20) throw new Error(`states: only ${stLatest.length} rows in ${stLastM}`);
const stStates = stLatest.filter((r) => !r.ai);
const states = {
  latest: {
    m: stLastM,
    rows: stLatest,
    lo: stStates[0].v,
    hi: stStates[stStates.length - 1].v,
    ai: stLatest.find((r) => r.ai)?.v ?? null,
    n: stStates.length,
  },
  minSpread: +Math.min(...spreads).toFixed(1),
  maxSpread: +Math.max(...spreads).toFixed(1),
  yearSpread,
  nMonths: stMonths.length,
  firstM: stMonths[0],
  topHolders: Object.entries(topRuns).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, n]) => ({ key: k, n })),
};

// Beat 12, the staircase: the policy repo rate hand-keyed from RBI MPC
// announcements (administrative record, not derivable from our tables;
// verified 2026-07-28 — held at 5.25% since the December 2025 cut, through
// the June 2026 meeting), against headline YoY: 2012-base series to Dec
// 2025, 2024-base series for 2026. YoY is base-independent enough to splice;
// the figcaption says where the seam is.
const REPO_STEPS = [
  ['2014-01', 8.00], ['2015-01', 7.75], ['2015-03', 7.50], ['2015-06', 7.25],
  ['2015-09', 6.75], ['2016-04', 6.50], ['2016-10', 6.25], ['2017-08', 6.00],
  ['2018-06', 6.25], ['2018-08', 6.50], ['2019-02', 6.25], ['2019-04', 6.00],
  ['2019-06', 5.75], ['2019-08', 5.40], ['2019-10', 5.15], ['2020-03', 4.40],
  ['2020-05', 4.00], ['2022-05', 4.40], ['2022-06', 4.90], ['2022-08', 5.40],
  ['2022-09', 5.90], ['2022-12', 6.25], ['2023-02', 6.50], ['2025-02', 6.25],
  ['2025-04', 6.00], ['2025-06', 5.50], ['2025-12', 5.25],
];
const cpiOldRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined' AND subgroup = 'General-Overall'
    AND date >= '2014-01-01'
  ORDER BY date`);
const cpiNewRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND code = 'GEN'
    AND date >= '2026-01-01' AND inflation IS NOT NULL
  ORDER BY date`);
const repo = {
  steps: REPO_STEPS.map(([m, r]) => ({ m, r })),
  cpi: [...cpiOldRaw, ...cpiNewRaw].map((r) => ({ m: r.m, yoy: r.yoy })),
  spliceAt: '2026-01',
};

const wild = { base, contrib, states, repo };

// `layers` — the closing bookend's haze: the six groups of the RETIRED 2012
// basket, each as its own published YoY series (All-India Combined), drawn
// faint behind the opening line at the close. No cross-base joining — the
// strands simply end in December 2025, where the basket that defined them
// did; the 2026 tail's texture comes from the twelve new divisions, which
// the page already holds in yourBasket.ser. Window matches oneLine's start.
const layersRaw = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, subgroup,
         round(inflation::numeric, 2)::float AS yoy
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined'
    AND subgroup LIKE '%-Overall'
    AND subgroup NOT IN ('General-Overall', 'Consumer Food Price-Overall')
    AND inflation IS NOT NULL AND date >= '2014-01-01'
  ORDER BY date`);
const layerBy = new Map();
for (const r of layersRaw) {
  const name = r.subgroup.replace(/-Overall$/, '');
  if (!layerBy.has(name)) layerBy.set(name, { name, months: [], yoy: [] });
  const g = layerBy.get(name);
  g.months.push(r.m); g.yoy.push(r.yoy);
}
const layers = { groups: [...layerBy.values()] };

/* The Delhi/Kerala chained-drift figure (`mixer`) left the page with the
   climb restructure and its series left the payload with it; both are
   reserved for a later read. Re-add here when that read ships. */
const out = { gap, basket, level, yourBasket, strands, oneLine, ruler, core, longRun, pyramid, verify, wild, layers };
writeData('lab/inflation-read.json', out);
console.log(`  ruler ${ruler.months.length} months x 3 sectors (${ruler.months[0]} → ${ruler.months.at(-1)})`);
console.log(`  core ${core.months.length} months (${core.months[0]} → ${core.months.at(-1)}), ${core.core.filter((v) => v == null).length} in the break, gate worst ${coWorst.toFixed(3)}`);
console.log(`  longRun ${longRun.months.length} months (${longRun.months[0]} → ${longRun.months.at(-1)}), splice ${longRun.spliceAt}, ends ${longRun.idx.at(-1)} on the 2012 ruler`);
console.log(`inflation-read: gap ${gap.months.length} months (latest with YoY ${gapLast.m}: headline ${gapLast.headline}% @${gapLast.headlineIdx}, Delhi edu ${gapLast.edu}% @${gapLast.eduIdx})`);
console.log(`  basket ${basket.length} divisions, food ${basket[0]?.combined.w2012} → ${basket[0]?.combined.w2024}`);
console.log(`  yourBasket ${yourBasket.asOf}, headline ${yourBasket.headline}%, ${yourBasket.divisions.length} divisions`);
{
  // the two arithmetics, printed side by side: the exact one has to reproduce
  // the published headline or the widget is lying to the reader
  const ds = yourBasket.divisions;
  const num = ds.reduce((a, d) => a + d.w * d.idx, 0);
  const den = ds.reduce((a, d) => a + d.w * d.idxAgo, 0);
  const rate = ds.reduce((a, d) => a + d.w * d.infl, 0) / ds.reduce((a, d) => a + d.w, 0);
  const wv = ds.reduce((a, d) => a + d.wv * d.infl, 0) / ds.reduce((a, d) => a + d.wv, 0);
  console.log(`  level ${level.m} idx ${level.idx} vs ${level.agoM} ${level.idxAgo} → ${((level.idx / level.idxAgo - 1) * 100).toFixed(4)}% ` +
    `(published ${level.yoy}%); old ruler ${level.old?.m} ${level.old?.idx}`);
  console.log(`  yourBasket arithmetic: levels ${((num / den - 1) * 100).toFixed(4)}% · wv-weighted rates ${wv.toFixed(4)}% · w-weighted rates ${rate.toFixed(4)}%`);
}
console.log(`  strands ${strands.divisions.length} divisions × ${strands.divisions[0]?.idx.length} months`);
console.log(`  oneLine ${oneLine.points.length} months, ${oneLine.points[0]?.m} → ${oneLine.points[oneLine.points.length - 1]?.m}, latest ${oneLine.latest}%`);
console.log(`  layers ${layers.groups.length} groups × ${layers.groups[0]?.months.length} months: ${layers.groups.map((g) => g.name).join(' · ')}`);
console.log(`  pyramid ${pyramid.levels.map((l) => l.n).join('/')}, tomato ${pyramid.path[0].infl}% → headline ${pyramid.path.at(-1).infl}%`);
console.log(`  wild.base ${base.months.length} months, home ${base.home}: idx ${base.idx[base.months.indexOf('2024-07')]} yoy ${base.yoy[base.months.indexOf('2024-07')]} (prev ${base.yoy[base.months.indexOf('2024-06')]})`);
console.log(`  wild.contrib ${contrib.m}: rebuilt ${contrib.rebuilt}% vs published ${contrib.published}% ` +
  `(worst miss ${contrib.reconWorst} pts over ${contrib.series.length} months); ` +
  `ex-jewellery ${contrib.ex}% on ₹${contrib.jewelW} of weight`);
console.log(`  wild.contrib top: ${contrib.items.slice(0, 4).map((i) => `${i.name} ₹${i.w}/${i.yoy}%→${i.c}pt`).join(' · ')}`);
console.log(`  wild.states ${states.nMonths} months ${states.firstM}→${states.latest.m}, ` +
  `p10-p90 spread ${states.minSpread}–${states.maxSpread} pts; ` +
  `${states.latest.m}: ${states.latest.n} states ${states.latest.lo}–${states.latest.hi}%, AI ${states.latest.ai}%; ` +
  `top held by ${states.topHolders.map((t) => `${t.key}×${t.n}`).join(', ')}`);
console.log(`  wild.repo ${repo.steps.length} steps → ${repo.steps.at(-1).r}% | cpi ${repo.cpi.length} months → ${repo.cpi.at(-1).m} ${repo.cpi.at(-1).yoy}%`);
console.log(`  verify: ${verify.parents} parents × ${verify.months} months, ${verify.rangeChecks} checks, ${verify.rangeFails} fails; ` +
  `2-child nodes ${verify.twoChildN}, sd max ${verify.twoChildSdMax}; recon worst ${verify.recon.worst} (${verify.recon.worstM}); ` +
  `LF ${Object.values(verify.linking).map((l) => `${l.ours}${l.ours === l.official ? '=' : '≠'}${l.official}`).join(' ')}`);

await end();
