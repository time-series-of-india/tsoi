// Spec-driven dashboard runtime — the CODE half (registry + resolver).
// Specs are pure data (see specs.ts / later user submissions); this turns a
// tidy dataset + current control state into an ECharts `option` (or, for
// stat tiles, an HTML string), in TSOI design tokens. No per-dashboard logic.
import { dragZoomOption } from '../panel-chrome';

export type Row = Record<string, string | number>;
// Control state: most controls hold a single string; multiselect holds an array.
export type CtrlState = Record<string, string | string[]>;
// Read a single value from possibly-array control state.
export const one = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? '') : (v ?? '');

export interface Encoding {
  x?: string; // category dimension (time series / bar) — a date field when `period` is set
  region?: string; // map region dimension (choropleth)
  series?: string; // dimension to split into series (stacked area/bar, or multi-line)
  y: string; // measure field, or "@controlId" to read the field from a control
  y2?: string; // second measure on a right-hand axis (chart:'dual' — two contrasting curves)
  yLabel?: string; // legend name for the y series (defaults to its unit name)
  y2Label?: string; // legend name for the y2 series
  where?: Record<string, string>; // constant field=value filters (not control-driven) — lets one dataset hold multiple entity kinds
  filters?: string[]; // control ids whose values filter rows on the same-named field
  timeRange?: string; // control id giving a range TOKEN (see resolveRange): a month count,
                      // 'ytd'/'fy', or an absolute 'YYYY-MM~YYYY-MM' window (0/'' = all)
  period?: string; // control id giving the aggregation bucket (D/M/Q/Y) for the x date field
  aggregate?: 'sum' | 'avg'; // how to combine rows in a bucket — sum (default) or mean (rates: %)
  latest?: boolean; // restrict to the single latest month after filtering
  sort?: 'asc' | 'desc';
  limit?: number | string; // number, or "@controlId" for a top-N control
  rankBy?: string; // pick the top-N by THIS field, but plot `y` (e.g. biggest
                   // banks by volume, shown by their decline rate)
  highlight?: string[] | string; // keys to colour as primary (the rest recede);
                   // "@controlId" reads the single highlighted key from a live control
  highlightMember?: string; // strips only: accent one MEMBER (e.g. a state) across
                   // every row instead of a whole row; "@controlId" reads it live
  seriesInclude?: string[]; // multi-line: keep only these series; entries may be
                   // "@controlId" tokens (resolved live) or literal series names
  colorBy?: 'food'; // multi-line: stable per-entity colours (see foodColor) instead
                   // of slot-in-selection palette order
  horizontal?: boolean;
  legend?: 'left'; // multi-line: put the (scrollable, vertical) legend on the left
                   // on desktop — for many series; folds back to the top on mobile
}

export interface Control {
  id: string;
  type: 'select' | 'toggle' | 'multiselect' | 'daterange';
  label: string;
  field?: string; // selects/multiselects whose options come from a dataset column
  labels?: Record<string, string>; // display labels for raw option values (value stays the key)
  dependsOn?: string[]; // cascading: option list filtered by these controls' values
  where?: Record<string, string>; // constant field=value row scope applied when deriving this
                   // control's options from the dataset (same shape/semantics as Encoding.where) —
                   // lets a select/multiselect on a multi-entity-kind dataset see only its own kind
  options?: { value: string; label: string }[];
  quick?: { value: string; label: string }[]; // daterange: quick-range presets (see resolveRange tokens)
  default: string | string[]; // array for multiselect
  defaultTop?: number; // multiselect: when entering a new scope, preselect the top-N by `rankBy`
  rankBy?: string; // measure field to rank options for `defaultTop` (default volume_cr)
  affects?: 'chart'; // a toggle whose value overrides the panel's chart type
  info?: string; // hover description shown via the dotted-underline info tooltip
}

export interface PanelSpec {
  id: string;
  title: string;
  chart: 'line' | 'bar' | 'area' | 'donut' | 'choropleth' | 'stat' | 'dual' | 'slope' | 'bump' | 'stair' | 'strips' | 'boxplot' | 'dotplot' | 'comptable';
  encoding: Encoding;
  controls?: Control[];
  map?: string; // registered map name for choropleth
  wide?: boolean; // span the full panel grid (full-width row)
  staticAxis?: boolean; // time chart: show the full range, no zoom slider (editorial)
  stat?: 'avgDailyVolume' | 'avgDailyValue' | 'ticket' | 'totalVolume' | 'totalValue' | 'leadShare'
    | 'priceDelta' | 'statePrice' | 'cheapestDearest' | 'yoyStat';
  info?: string; // hover description shown via the dotted-underline info tooltip
}

export interface DashboardSpec {
  slug: string;
  section: string; // top-level nav section (economy, environment, …)
  theme: string; // subject cluster within the section (payments, food, …)
  title: string;
  description: string;
  dataset: string;
  source?: string; // attribution caption rendered under the panels (legal load-bearing)
  note?: string; // user-visible data caveat (e.g. provisional weekend figures)
  globals?: Control[];
  panels: PanelSpec[];
}

export interface Tokens {
  text: string; subtle: string; line: string; surfaceDim: string;
  mono: string; c1: string; c6: string;
  palette: string[]; // chart-1..6, for multi-series (stacked) and donut slices
}

// Read the live TSOI design tokens off :root (so charts track light/dark). Client-only.
export function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    text: v('--tsoi-color-on-surface'), subtle: v('--tsoi-color-on-surface-variant'),
    line: v('--tsoi-color-outline'), surfaceDim: v('--tsoi-color-surface-dim'),
    mono: v('--tsoi-font-mono'), c1: v('--tsoi-color-chart-1'), c6: v('--tsoi-color-chart-6'),
    palette: [1, 2, 3, 4, 5, 6].map((n) => v(`--tsoi-color-chart-${n}`)),
  };
}

// --- value formatting ---
// PROTOTYPE: a global unit system. Indian (Cr / Lakh Crore) is the default;
// "intl" renders the same magnitudes as billion / trillion. Read from a
// <html data-units="intl"> flag so every chart re-formats on toggle, mirroring
// the data-theme pattern. Prose in beats/stories is NOT converted (yet).
const intl = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-units') === 'intl';

const grp = (n: number, d = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: d });
const fmtVolCr = (n: number) => {
  if (intl()) {
    const bn = n / 100; // 1 crore = 0.01 billion
    if (bn >= 1) return grp(bn, bn >= 100 ? 0 : 1) + ' bn';
    const mn = n / 0.1; // 1 crore = 10 million
    if (mn >= 1) return grp(mn, mn >= 100 ? 0 : 1) + ' mn';
    return grp(Math.round(n * 1e7));
  }
  if (n >= 1) return grp(n, n >= 100 ? 0 : 1) + ' Cr';
  const lakh = n * 100; // 1 crore = 100 lakh
  if (lakh >= 1) return grp(lakh, lakh >= 100 ? 0 : 1) + ' L';
  return grp(Math.round(n * 1e7)); // absolute count for very low volumes
};
const fmtINR = (r: number) =>
  r >= 1e7 ? '₹' + grp(r / 1e7, 2) + ' Cr' : r >= 1e5 ? '₹' + grp(r / 1e5, 2) + ' L' : '₹' + grp(r);
const fmtValLcr = (n: number) => {
  if (intl()) {
    // 1 lakh crore = ₹1 trillion = ₹1,000 billion
    if (n >= 1) return '₹' + grp(n, 1) + ' tn';
    const bn = n * 1000;
    return '₹' + grp(bn, bn >= 100 ? 0 : 1) + ' bn';
  }
  return n >= 1 ? '₹' + grp(n, 1) + ' LCr' : '₹' + grp(n * 1e5, 0) + ' Cr';
};
const fmtValCr = (n: number) => {
  if (intl()) {
    const bn = n / 100;
    return bn >= 1 ? '₹' + grp(bn, 2) + ' bn' : '₹' + grp(n / 0.1, 0) + ' mn';
  }
  return n >= 1e5 ? '₹' + grp(n / 1e5, 2) + ' LCr' : '₹' + grp(n) + ' Cr';
};
export function fmt(field: string, v: number): string {
  if (field.endsWith('_pct')) { const a = Math.abs(v); return grp(v, a >= 10 ? 0 : a >= 1 ? 1 : 2) + '%'; }
  if (field.endsWith('_rs')) return fmtINR(v); // ₹ per transaction (ticket size)
  if (field === 'value_lcr') return fmtValLcr(v);
  if (field === 'value_cr') return fmtValCr(v);
  return fmtVolCr(v); // volume_cr / counts
}
const unitName = (field: string) => {
  if (field.endsWith('_pct')) return '%';
  if (field.endsWith('_rs')) return '₹ per txn';
  const i = intl();
  if (field === 'value_lcr') return i ? '₹ Trillion' : '₹ Lakh Crore';
  if (field === 'value_cr') return i ? '₹ Billion' : '₹ Crore';
  return i ? 'Billion txns' : 'Crore txns';
};
// Tick values arrive in the base unit (crore / lakh crore); scale them to the
// displayed unit so axis labels match the axis name.
const axisScale = (field: string) => {
  if (!intl() || field.endsWith('_pct') || field.endsWith('_rs')) return 1;
  return field === 'value_lcr' ? 1 : 0.01; // LCr→tn is 1:1; crore→bn is ÷100
};
const axisFmt = (field: string) => (v: number) => {
  // Percent axis: add a decimal for small-magnitude scales (e.g. a 0–2% axis)
  // so ticks don't round to duplicate whole numbers.
  if (field.endsWith('_pct')) return grp(v, v === 0 || Math.abs(v) >= 10 ? 0 : 1) + '%';
  const money = field.endsWith('_rs') || field.startsWith('value');
  const sv = v * axisScale(field);
  // Adaptive precision so a small axis (e.g. value in Lakh Crore < 1) doesn't
  // collapse every tick to "0": add decimals as the magnitude shrinks.
  const a = Math.abs(sv);
  const d = sv === 0 || a >= 100 ? 0 : a >= 1 ? 1 : a >= 0.1 ? 2 : 3;
  return (money ? '₹' : '') + grp(sv, d);
};

export const monthLabel = (m: string) => {
  const [y, mm] = String(m).split('-');
  return new Date(+y, +mm - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }).replace(' ', '-');
};

// --- aggregation buckets: derive a period key/label from a daily YYYY-MM-DD date ---
const periodKey = (date: string, agg?: string): string => {
  const s = String(date);
  if (agg === 'Y') return s.slice(0, 4);
  if (agg === 'Q') return `${s.slice(0, 4)}-Q${Math.floor((+s.slice(5, 7) - 1) / 3) + 1}`;
  if (agg === 'D') return s.slice(0, 10);
  return s.slice(0, 7); // M (default)
};
const periodLabel = (key: string, agg?: string): string => {
  if (agg === 'Y') return key;
  if (agg === 'Q') { const [y, q] = key.split('-Q'); return `Q${q}-${y.slice(2)}`; }
  if (agg === 'D') { const [y, m, d] = key.split('-'); return new Date(+y, +m - 1, +d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
  return monthLabel(key); // M
};
// trailing-window key (YYYY-MM) from whichever temporal field a dataset carries
const monthOf = (row: Row) => String(row.date ?? row.month).slice(0, 7);

// --- filtering: field membership + optional trailing-N-month window ---
// Resolve a range TOKEN against the set of months present in the data into an
// inclusive [from, to] month window (YYYY-MM), or null for "all". Tokens:
//   "N"      last N months        "0"/"" all        "ytd" Jan-of-latest-year → latest
//   "fy"     Apr-of-current-FY → latest (India fiscal year, Apr–Mar)
//   "F~T"    absolute window; either side may be blank to open-end it
// Shared by the filter below and the daterange control widget (button label + bounds).
export function resolveRange(token: string, months: string[]): { from: string; to: string } | null {
  if (months.length === 0) return null;
  const sorted = [...new Set(months)].sort();
  const min = sorted[0], to = sorted[sorted.length - 1];
  if (token.includes('~')) {
    const [f, t] = token.split('~');
    return { from: f || min, to: t || to };
  }
  if (token === 'ytd') return { from: `${to.slice(0, 4)}-01`, to };
  if (token === 'fy') {
    const y = +to.slice(0, 4), m = +to.slice(5, 7);
    return { from: `${m >= 4 ? y : y - 1}-04`, to };
  }
  const n = +token || 0;
  if (n > 0) return { from: sorted[Math.max(0, sorted.length - n)], to };
  return null; // all
}

function applyFilters(rows: Row[], enc: Encoding, ctrl: CtrlState): Row[] {
  let r = rows;
  for (const [f, v] of Object.entries(enc.where ?? {})) r = r.filter((row) => String(row[f]) === v);
  for (const f of enc.filters ?? []) {
    const v = ctrl[f];
    if (Array.isArray(v)) r = r.filter((row) => v.includes(String(row[f]))); // multiselect (empty ⇒ none)
    else if (v != null && v !== '') r = r.filter((row) => String(row[f]) === String(v));
  }
  if (enc.timeRange) {
    const win = resolveRange(String(one(ctrl[enc.timeRange]) || '0'), r.map(monthOf));
    if (win) r = r.filter((row) => { const mo = monthOf(row); return mo >= win.from && mo <= win.to; });
  }
  if (enc.latest) {
    const mx = [...new Set(r.map(monthOf))].sort().at(-1);
    if (mx) r = r.filter((row) => monthOf(row) === mx);
  }
  return r;
}

const ctrlField = (token: string, ctrl: CtrlState) =>
  token.startsWith('@') ? one(ctrl[token.slice(1)]) : token;

// Resolve the `highlight` encoding into a concrete key list. A static array is
// used verbatim; an "@controlId" string reads the single accented key from a
// live control (e.g. the selected state on the peer swarm).
const resolveHighlight = (enc: Encoding, ctrl: CtrlState): string[] | undefined => {
  const h = enc.highlight;
  if (!h) return undefined;
  if (typeof h === 'string') return h.startsWith('@') ? [one(ctrl[h.slice(1)])].filter(Boolean) : [h];
  return h;
};

// --- resolver: filtered rows → sorted [{key,value}] ---
export function resolve(rows: Row[], enc: Encoding, ctrl: CtrlState) {
  const yField = ctrlField(enc.y, ctrl);
  const r = applyFilters(rows, enc, ctrl);
  const keyField = (enc.x ?? enc.region) as string;
  const agg = enc.period ? one(ctrl[enc.period]) : undefined;
  const keyOf = enc.period ? (row: Row) => periodKey(String(row[keyField]), agg) : (row: Row) => String(row[keyField]);
  const acc = new Map<string, number>();
  const cnt = new Map<string, number>();
  const rankAcc = enc.rankBy ? new Map<string, number>() : null;
  for (const row of r) {
    const k = keyOf(row);
    acc.set(k, (acc.get(k) ?? 0) + (Number(row[yField]) || 0));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
    if (rankAcc) rankAcc.set(k, (rankAcc.get(k) ?? 0) + (Number(row[enc.rankBy!]) || 0));
  }
  const mean = enc.aggregate === 'avg';
  let pairs = [...acc.entries()].map(([key, sum]) => ({ key, value: mean ? sum / (cnt.get(key) || 1) : sum }));
  const limit = typeof enc.limit === 'string' ? +(ctrl[enc.limit.slice(1)] ?? 0) : enc.limit;
  if (rankAcc) {
    // Select the top-N by a *different* field (rankBy), then order those by value.
    pairs.sort((a, b) => (rankAcc.get(b.key) ?? 0) - (rankAcc.get(a.key) ?? 0));
    if (limit) pairs = pairs.slice(0, limit);
    pairs.sort((a, b) => (enc.sort === 'asc' ? a.value - b.value : b.value - a.value));
  } else {
    if (enc.sort === 'desc') pairs.sort((a, b) => b.value - a.value);
    else if (enc.sort === 'asc') pairs.sort((a, b) => a.value - b.value);
    else pairs.sort((a, b) => a.key.localeCompare(b.key));
    if (limit) pairs = pairs.slice(0, limit);
  }
  return { pairs, yField };
}

type Pairs = { key: string; value: number }[];

// Collapse everything past the top-N into a single "Other" slice (donut/legend
// stay honest about the whole). Assumes `pairs` already sorted desc by value.
function groupOther(pairs: Pairs, limit?: number): Pairs {
  if (!limit || pairs.length <= limit) return pairs;
  const rest = pairs.slice(limit).reduce((a, p) => a + p.value, 0);
  return [...pairs.slice(0, limit), { key: 'Other', value: rest }];
}

// resolver for stacked series — pivots filtered rows into x × series. Series are
// ordered by total desc; past `limit` they fold into one "Other" stack.
export function resolveSeries(rows: Row[], enc: Encoding, ctrl: CtrlState) {
  const yField = ctrlField(enc.y, ctrl);
  const xField = enc.x as string;
  const sField = enc.series as string;
  let r = applyFilters(rows, enc, ctrl);
  // seriesInclude: restrict to a named/control-driven set of series (e.g. the
  // selected state + 'All India' on the you-vs-median trend). Deduped so a
  // control that resolves to a listed literal doesn't drop it.
  if (enc.seriesInclude) {
    const keep = new Set(enc.seriesInclude.map((s) => (s.startsWith('@') ? one(ctrl[s.slice(1)]) : s)).filter(Boolean));
    r = r.filter((row) => keep.has(String(row[sField])));
  }
  const agg = enc.period ? one(ctrl[enc.period]) : undefined;
  const keyOf = enc.period ? (row: Row) => periodKey(String(row[xField]), agg) : (row: Row) => String(row[xField]);
  const xs = [...new Set(r.map(keyOf))].sort();
  const xIndex = new Map(xs.map((x, i) => [x, i]));
  const cells = new Map<string, number[]>(); // series name -> values aligned to xs
  const counts = new Map<string, number[]>(); // parallel row-counts per cell (for avg)
  const totals = new Map<string, number>();
  for (const row of r) {
    const s = String(row[sField]);
    const v = Number(row[yField]) || 0;
    if (!cells.has(s)) { cells.set(s, new Array(xs.length).fill(0)); counts.set(s, new Array(xs.length).fill(0)); }
    const i = xIndex.get(keyOf(row))!;
    cells.get(s)![i] += v;
    counts.get(s)![i] += 1;
    totals.set(s, (totals.get(s) ?? 0) + v);
  }
  if (enc.aggregate === 'avg') {
    for (const [s, arr] of cells) { const c = counts.get(s)!; for (let i = 0; i < arr.length; i++) if (c[i]) arr[i] /= c[i]; }
  }
  const ordered = [...cells.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  const limit = typeof enc.limit === 'string' ? +(ctrl[enc.limit.slice(1)] ?? 0) : enc.limit;
  let series = ordered.map((name) => ({ name, data: cells.get(name)! }));
  if (limit && series.length > limit) {
    const other = new Array(xs.length).fill(0);
    for (const s of series.slice(limit)) s.data.forEach((v, i) => (other[i] += v));
    series = [...series.slice(0, limit), { name: 'Other', data: other }];
  }
  return { xs, series, yField };
}
interface BuildCtx { panel: PanelSpec; yField: string; t: Tokens; highlight?: string[]; caption?: boolean }

// shared time-series chart pieces (line / stacked / multi-line all reuse these)
// Touch devices get no in-chart zoom at all: a slider gets tapped by accident
// mid-scroll, collapsing the window with no easy way back. On mobile, range is
// controlled by the dashboard's RANGE dropdown instead. On mouse, the slider
// pairs with Grafana-style drag-to-select (see dragZoomOption / the caller's
// activateDragZoom after setOption) instead of an `inside` pan, which used to
// capture the wheel and hijack page scroll.
const isCoarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const zoomBars = (t: Tokens, _n: number) => [
  { type: 'slider', height: 16, bottom: 22, start: 0, end: 100,
    borderColor: t.line, fillerColor: t.c1 + '33', handleStyle: { color: t.c1 }, textStyle: { color: t.subtle } },
];
const yValueAxis = (yField: string, t: Tokens, name?: string) => ({
  type: 'value' as const, name: name ?? unitName(yField), nameLocation: 'end' as const, nameGap: 10,
  nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9, align: 'left' as const },
  splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
  axisLabel: { color: t.subtle, formatter: axisFmt(yField) },
});
// x category axis. With an `agg` the labels format as a time period (Mon-YY etc);
// without one the keys are plain categories (e.g. years), shown verbatim.
const xCatAxis = (cats: string[], t: Tokens, agg?: string) => ({
  type: 'category' as const, data: cats,
  axisLabel: { color: t.subtle, hideOverlap: true, ...(agg != null ? { formatter: (k: string) => periodLabel(k, agg) } : {}) },
  axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
});
const xTimeAxis = xCatAxis;
const seriesColor = (pal: string[], i: number, name: string, t: Tokens) =>
  name === 'Other' ? t.subtle : pal[i % pal.length];

function lineOrBar(type: 'line' | 'bar', pairs: Pairs, { panel, yField, t }: BuildCtx, agg?: string) {
  const isTime = agg != null;
  const zoom = isTime && pairs.length > 18 && !panel.staticAxis && !isCoarse();
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 8, right: 16, top: 36, bottom: zoom ? 60 : 28, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => fmt(yField, v) },
    xAxis: isTime
      ? xTimeAxis(pairs.map((p) => p.key), t, agg)
      : { type: 'category', data: pairs.map((p) => p.key),
          axisLabel: { color: t.subtle, hideOverlap: true }, axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false } },
    yAxis: yValueAxis(yField, t, panel.encoding.yLabel),
    dataZoom: zoom ? zoomBars(t, pairs.length) : undefined,
    ...(zoom ? dragZoomOption() : {}),
    series: [
      type === 'line'
        ? { type: 'line', smooth: true, showSymbol: false, data: pairs.map((p) => p.value),
            lineStyle: { color: t.c1, width: 2 }, areaStyle: { color: t.c1, opacity: 0.12 }, itemStyle: { color: t.c1 } }
        : { type: 'bar', data: pairs.map((p) => p.value), itemStyle: { color: t.c1 } },
    ],
  };
}

function horizontalBar(pairs: Pairs, { yField, t }: BuildCtx) {
  const n = pairs.length;
  const p = pairs.slice().reverse(); // largest at top
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    // Fixed left gutter + no containLabel: containLabel's auto-measure is unreliable
    // with the mono webfont (clips the widest category name). Reserve a deterministic
    // label column and truncate names to fit it instead. Right gutter holds the value labels.
    grid: { left: 150, right: 68, top: 8, bottom: 8 },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) => `<strong>#${n - o.dataIndex} ${o.name}</strong><br/>${fmt(yField, o.value)}`,
    },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', data: p.map((d) => d.key),
      axisLabel: { color: t.subtle, fontSize: 11, formatter: (v: string) => (v.length > 22 ? v.slice(0, 21) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false } },
    series: [{ type: 'bar', data: p.map((d) => d.value), itemStyle: { color: t.c1 },
      label: { show: true, position: 'right', color: t.subtle, fontFamily: t.mono, fontSize: 9,
        formatter: (o: any) => fmt(yField, o.value) } }],
  };
}

// Chart-internal caption (beats have no panel chrome, so a non-empty panel
// title renders as a small mono note inside the chart — used by the strip
// family to say what a dot is).
// `show` is false when the chart sits inside dashboard chrome (a panel bar
// already carries the title) — only chrome-less beats/reads draw the caption.
const chartCaption = (panel: PanelSpec, t: Tokens, show = true) => show && panel.title
  ? { text: panel.title, left: 0, top: 2,
      textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9, fontWeight: 400 as const } }
  : undefined;

// Multi-row strip: the dot strip generalised to one swarm row per series (e.g.
// a commodity), sharing one indexed x axis — each row's median state = 1×, so
// rows of very different ₹/kg stay comparable. A tight row means the good
// costs the same everywhere; a sprayed row means geography taxes it. `highlight`
// accents whole rows and recedes the rest to grey (identity stays on the row
// label, never colour alone). Expects tidy rows with the real price in
// `price_rs` for tooltips.
function strips(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens, caption = true) {
  const enc = panel.encoding;
  const yf = ctrlField(enc.y, ctrl);
  const kf = enc.x!, sf = enc.series!;
  // member mode: accent one member (a state) across every row. 'All India' (the
  // dist companion) is dropped from the swarm and reads as "no state selected".
  const hiMember = enc.highlightMember
    ? (enc.highlightMember.startsWith('@') ? one(ctrl[enc.highlightMember.slice(1)]) : enc.highlightMember) : '';
  const memberMode = !!enc.highlightMember;
  const selMember = hiMember && hiMember !== 'All India' ? hiMember : '';
  let r = applyFilters(rows, enc, ctrl);
  if (memberMode) r = r.filter((d) => String(d[kf]) !== 'All India');
  if (!r.length) return emptyChart(t);
  // Member mode (food scatter): faceted small multiples, one grid per food family.
  if (memberMode) return stripFacets(r, panel, ctrl, t, caption, selMember, yf, kf, sf);
  const names = [...new Set(r.map((d) => String(d[sf])))]; // dataset order = row order
  const vals = r.map((d) => Number(d[yf]) || 0);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const range = hi - lo || 1;
  const minGap = range / 32;
  const pitch = 7;
  const rowsOrder = [0, 1, -1, 2, -2, 3, -3];
  const hiRows = resolveHighlight(enc, ctrl);
  const data: object[] = [];
  for (const name of names) {
    const rowOn = !hiRows || hiRows.includes(name);
    const members = r
      .filter((d) => String(d[sf]) === name)
      .map((d) => ({ key: String(d[kf]), v: Number(d[yf]) || 0, price: Number(d.price_rs) }))
      .sort((a, b) => a.v - b.v);
    const n = members.length;
    const lastX = new Map<number, number>();
    members.forEach((m, idx) => {
      const row = rowsOrder.find((rw) => (lastX.get(rw) ?? -Infinity) <= m.v - minGap) ?? 0;
      lastX.set(row, m.v);
      const color = rowOn ? t.c1 : t.subtle, opacity = rowOn ? 1 : 0.55;
      data.push({
        name: m.key, value: [m.v, name], price: m.price, series: name,
        rank: n - idx, n, // 1 = dearest
        symbolOffset: [0, row * pitch],
        itemStyle: { color, opacity, borderColor: t.surfaceDim, borderWidth: 1.5 },
        z: 2,
      });
    });
  }
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    // Fixed left gutter (like horizontalBar): containLabel's auto-measure is
    // unreliable with the mono webfont and clips the widest row name.
    grid: { left: 96, right: 20, top: panel.title ? 34 : 18, bottom: 26 },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) =>
        `<strong>${o.name}</strong><br/>${o.data.series} · ${fmt('price_rs', o.data.price)}<br/>`
        + `${o.value[0]}× the median state`
        + (o.data.rank ? `<br/>#${o.data.rank} dearest of ${o.data.n}` : ''),
    },
    xAxis: {
      type: 'value' as const,
      min: Math.max(0, Math.floor((lo - range * 0.06) * 10) / 10),
      max: Math.ceil((hi + range * 0.06) * 10) / 10,
      axisLabel: { color: t.subtle, formatter: (v: number) => v + '×' },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    yAxis: {
      type: 'category' as const, data: names, inverse: true,
      axisLabel: { color: t.subtle, fontSize: 11, formatter: (v: string) => (v.length > 13 ? v.slice(0, 12) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [{
      type: 'scatter' as const, data, symbolSize: 10,
      emphasis: { itemStyle: { borderColor: t.text } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1 },
        // inverse category axis flips the line direction: 'start' = plot top
        label: { formatter: 'median', position: 'start' as const,
          color: t.subtle, fontFamily: t.mono, fontSize: 10 },
        data: [{ xAxis: 1 }],
      },
    }],
    media: [{ query: { maxWidth: 480 }, option: { series: [{ symbolSize: 8 }] } }],
  };
}

// Faceted state-spread — one small-multiple grid per FOOD FAMILY, stacked
// vertically, each with its own x scale. On a single shared axis the vegetable
// outliers (a state at 2.7× the median) stretch the scale until pulses/oils
// crush into a blob at 1×; per-family axes give every family readable
// resolution, and the family header makes the grouping explicit (it matched the
// comparison board's order but was invisible as one flat list). The unit is
// still ×-the-median-state everywhere, so rows stay comparable by reading the
// axes. Facet heights are proportional to row count.
function stripFacets(r: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens, caption: boolean, selMember: string,
  yf: string, kf: string, sf: string) {
  // transient row accent set by the board→scatter click linkage (see the
  // DashboardView wiring); not a spec control, so it never serializes to the URL
  const flash = one(ctrl.__flash);
  const pal = t.palette;
  const famColor: Record<string, string> = {
    Vegetables: pal[0], Cereals: pal[2], Pulses: pal[3], 'Edible oils': pal[4], 'Other staples': t.subtle };
  const byFam = new Map<string, string[]>(FAM_ORDER.map((f) => [f, []]));
  for (const c of [...new Set(r.map((d) => String(d[sf])))].sort((a, b) => a.localeCompare(b)))
    byFam.get(FOOD_FAMILY[c] ?? 'Other staples')!.push(c);
  const fams = FAM_ORDER.filter((f) => byFam.get(f)!.length > 0);

  // Vertical budget in row units (percent-based so it survives maximize):
  // header strip + one unit per food row + an axis strip per facet.
  const HDR = 1.15, AXIS = 0.9;
  const units = fams.reduce((a, f) => a + HDR + byFam.get(f)!.length + AXIS, 0);
  const topPad = caption && panel.title ? 6 : 1.5;
  const unit = (100 - topPad - 1.5) / units;

  const rowsOrder = [0, 1, -1, 2, -2, 3, -3];
  const grids: object[] = [], xAxes: object[] = [], yAxes: object[] = [];
  const series: object[] = [], headers: object[] = [];
  let cursor = topPad;
  fams.forEach((fam, gi) => {
    const foods = byFam.get(fam)!;
    const famRows = r.filter((d) => foods.includes(String(d[sf])));
    const vals = famRows.map((d) => Number(d[yf]) || 0);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    // Cap the axis at 2×: a lone outlier state (tomato at 2.7×) otherwise
    // stretches its facet until the bulk crushes at 1×. Beyond-cap states clamp
    // to the edge and render as right-pointing arrows (true ratio in the tooltip).
    const CAP = 2;
    const capped = hi > CAP * 1.02;
    const axHi = capped ? CAP : hi;
    const range = axHi - lo || 1;
    const minGap = range / 32; // beeswarm pitch per-facet, so jitter tracks the facet's scale
    headers.push({ type: 'text', left: 8, top: `${cursor.toFixed(2)}%`, silent: true,
      style: { text: fam.toUpperCase(), fill: famColor[fam], font: `600 10px ${t.mono}` } });
    if (capped) headers.push({ type: 'text', right: 20, top: `${cursor.toFixed(2)}%`, silent: true,
      style: { text: '▸ = beyond 2×', fill: t.subtle, font: `9px ${t.mono}` } });
    cursor += HDR * unit;
    grids.push({ left: 96, right: 20, top: `${cursor.toFixed(2)}%`, height: `${(foods.length * unit).toFixed(2)}%` });
    cursor += (foods.length + AXIS) * unit;
    xAxes.push({
      type: 'value' as const, gridIndex: gi,
      min: Math.max(0, Math.floor((lo - range * 0.06) * 10) / 10),
      max: capped ? CAP : Math.ceil((hi + range * 0.06) * 10) / 10,
      axisLabel: { color: t.subtle, fontSize: 9, formatter: (v: number) => v + '×' },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.4 } },
    });
    yAxes.push({
      type: 'category' as const, gridIndex: gi, data: foods, inverse: true,
      axisLabel: { color: t.text, fontSize: 11,
        formatter: (v: string) => (v.length > 13 ? v.slice(0, 12) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    });
    const data: object[] = [];
    for (const name of foods) {
      const members = famRows
        .filter((d) => String(d[sf]) === name)
        .map((d) => ({ key: String(d[kf]), v: Number(d[yf]) || 0, price: Number(d.price_rs) }))
        .sort((a, b) => a.v - b.v);
      const n = members.length;
      const lastX = new Map<number, number>();
      members.forEach((m, idx) => {
        const beyond = capped && m.v > CAP;
        const x = beyond ? CAP : m.v; // clamped plot position; the true ratio stays in the tooltip
        const row = rowsOrder.find((rw) => (lastX.get(rw) ?? -Infinity) <= x - minGap) ?? 0;
        lastX.set(row, x);
        // With a state picked its dot pops (primary, enlarged) and peers recede
        // to grey; with none picked the whole cloud is a calm brand tint.
        const matched = selMember && m.key === selMember;
        let color = t.c1, opacity = 1;
        if (!selMember) opacity = 0.4;
        else if (!matched) { color = t.subtle; opacity = 0.5; }
        // Board-click flash: the clicked food's row pops, every other row recedes.
        const flashOn = flash && name === flash;
        if (flash) {
          if (flashOn) { color = t.c1; opacity = 1; }
          else { color = t.subtle; opacity = 0.2; }
        }
        data.push({
          name: m.key, value: [x, name], ratio: m.v, price: m.price, series: name,
          rank: n - idx, n, // 1 = dearest
          symbol: beyond ? 'arrow' : 'circle',
          symbolRotate: beyond ? -90 : 0,
          symbolOffset: [0, row * 5],
          symbolSize: matched ? 15 : flashOn ? 12 : undefined,
          itemStyle: { color, opacity, borderColor: t.surfaceDim, borderWidth: 1.5 },
          z: matched ? 5 : flashOn ? 4 : 2,
        });
      });
    }
    series.push({
      type: 'scatter' as const, xAxisIndex: gi, yAxisIndex: gi, data, symbolSize: 10,
      emphasis: { itemStyle: { borderColor: t.text } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1 },
        // label the 1× line once, on the top facet; the rest just draw the line
        label: gi === 0
          ? { formatter: 'median', position: 'start' as const, color: t.subtle, fontFamily: t.mono, fontSize: 10 }
          : { show: false },
        data: [{ xAxis: 1 }],
      },
    });
  });
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    grid: grids, xAxis: xAxes, yAxis: yAxes, series, graphic: headers,
    tooltip: {
      trigger: 'item', confine: true,
      formatter: (o: any) =>
        `<strong>${o.name}</strong><br/>${o.data.series} · ${fmt('price_rs', o.data.price)}<br/>`
        + `${o.data.ratio}× the median state`
        + (o.data.rank ? `<br/>#${o.data.rank} dearest of ${o.data.n}` : ''),
    },
    media: [{ query: { maxWidth: 480 }, option: {
      series: fams.map(() => ({ symbolSize: 8 })),
      grid: grids.map((g) => ({ ...g, left: 88 })) } }],
  };
}

// Rank staircase: every category as one dot, sorted cheapest → dearest along
// x, with the real value on y — "one question, N answers" as a rising
// staircase. Both axes are honest (no swarm stacking), the shape is the
// message: a flat middle means most answers agree; a steep tail means a few
// pay far more. Extremes carry emphasised labels; `highlight` keys get grey
// ones. Labels sit below-right of their dot (above-left for the maximum) —
// in a sorted staircase those quadrants are always dot-free.
function stair(pairs: Pairs, { panel, yField, t, highlight, caption }: BuildCtx) {
  if (!pairs.length) return emptyChart(t);
  const sorted = pairs.slice().sort((a, b) => a.value - b.value);
  const n = sorted.length;
  const lo = sorted[0].value, hi = sorted[n - 1].value;
  const range = hi - lo || 1;
  const med = (sorted[(n - 1) >> 1].value + sorted[n >> 1].value) / 2;
  const mag = Math.pow(10, Math.floor(Math.log10(range / 10))); // axis rounding step
  const nice = (v: number, dir: 'floor' | 'ceil') => (dir === 'floor' ? Math.floor : Math.ceil)(v / mag) * mag;
  const hiKeys = highlight ?? [];
  // With a highlight set, accented dots take the primary colour and the rest
  // recede to grey — the selected mark pops from its peers (identity stays on
  // colour + label, never colour alone).
  const accent = hiKeys.length > 0;
  const rich = {
    n: { color: t.text, fontFamily: t.mono, fontSize: 11, lineHeight: 14, fontWeight: 600 as const },
    v: { color: t.subtle, fontFamily: t.mono, fontSize: 10, lineHeight: 13 },
    a: { color: t.subtle, fontFamily: t.mono, fontSize: 10, lineHeight: 13 },
  };
  const data = sorted.map((p, i) => {
    const isMax = i === n - 1;
    const hot = hiKeys.includes(p.key);
    const label = isMax || i === 0
      ? { show: true, position: (isMax ? 'top' : 'bottom') as 'top' | 'bottom',
          align: (isMax ? 'right' : 'left') as 'left' | 'right', offset: (isMax ? [4, -2] : [-4, 2]) as [number, number],
          formatter: `{n|${p.key}}\n{v|${fmt(yField, p.value)}}`, rich }
      : hot
        ? { show: true, position: 'top' as const, align: 'center' as const, offset: [0, -6] as [number, number],
            formatter: `{n|${p.key}}\n{v|${fmt(yField, p.value)}}`, rich }
        : { show: false };
    // recede unselected dots to grey once a highlight is active; keep the
    // accented dot (and the sorted-range end labels) on the primary colour.
    const color = !accent || hot ? t.c1 : t.subtle;
    return { name: p.key, value: p.value, label,
      symbolSize: hot ? 15 : undefined,
      itemStyle: { color, borderColor: t.surfaceDim, borderWidth: 1.5,
        opacity: accent && !hot ? 0.6 : 1 } };
  });
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption ?? true),
    grid: { left: 8, right: 16, top: panel.title ? 32 : 16, bottom: 30, containLabel: true },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) =>
        `<strong>${o.name}</strong><br/>#${o.dataIndex + 1} cheapest of ${n}<br/>${fmt(yField, o.value)}`,
    },
    xAxis: {
      type: 'category' as const, data: sorted.map((p) => p.key),
      name: 'STATES · CHEAPEST → DEAREST', nameLocation: 'middle' as const, nameGap: 14,
      nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
      axisLabel: { show: false }, axisTick: { show: false },
      axisLine: { lineStyle: { color: t.line } },
    },
    yAxis: {
      // window hugs the data, padded then rounded to a "nice" step for the range
      type: 'value' as const, min: nice(lo - range * 0.1, 'floor'), max: nice(hi + range * 0.08, 'ceil'),
      axisLabel: { color: t.subtle, formatter: axisFmt(yField) },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    series: [{
      type: 'scatter' as const, data, symbolSize: 10,
      itemStyle: { color: t.c1, borderColor: t.surfaceDim, borderWidth: 1.5 },
      emphasis: { itemStyle: { borderColor: t.text } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1 },
        label: { formatter: `median ${fmt(yField, med)}`, position: 'insideStartTop' as const,
          color: t.subtle, fontFamily: t.mono, fontSize: 10 },
        data: [{ yAxis: med }],
      },
    }],
    // Phones: smaller dots so 30+ steps keep daylight between them.
    media: [{ query: { maxWidth: 480 }, option: { series: [{ symbolSize: 7 }] } }],
  };
}

// Box plot — compare a distribution across many categories at once. Each row of
// the dataset is one member (e.g. a state); rows group by `x` (e.g. commodity)
// and the box summarises the spread of `y` within each group. Built for the
// "which foods scatter across the country" question in ratio-to-median units,
// so foods of very different ₹/kg share one axis: a wide box = geography taxes
// it, a tight box = it costs the same everywhere. Horizontal, widest on top.
// Whiskers are Tukey fences (1.5×IQR); points beyond plot as outlier dots.
const quantile = (sortedAsc: number[], p: number): number => {
  if (sortedAsc.length === 1) return sortedAsc[0];
  const h = (sortedAsc.length - 1) * p;
  const lo = Math.floor(h);
  return sortedAsc[lo] + (h - lo) * (sortedAsc[Math.min(lo + 1, sortedAsc.length - 1)] - sortedAsc[lo]);
};
function boxplot(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens, caption = true) {
  const enc = panel.encoding;
  const yf = ctrlField(enc.y, ctrl);
  const catField = enc.x!;
  // exclude the 'All India' companion rows the dist kind carries (they're a
  // national aggregate, not a member of the per-state distribution).
  const r = applyFilters(rows, enc, ctrl).filter((row) => String(row.st) !== 'All India');
  if (!r.length) return emptyChart(t);
  const groups = new Map<string, number[]>();
  for (const row of r) {
    const k = String(row[catField]);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(Number(row[yf]) || 0);
  }
  const boxes = [...groups.entries()].map(([key, raw]) => {
    const v = raw.slice().sort((a, b) => a - b);
    const q1 = quantile(v, 0.25), med = quantile(v, 0.5), q3 = quantile(v, 0.75);
    const iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inFence = v.filter((x) => x >= loF && x <= hiF);
    const wLo = inFence.length ? inFence[0] : v[0];
    const wHi = inFence.length ? inFence[inFence.length - 1] : v[v.length - 1];
    const outliers = v.filter((x) => x < loF || x > hiF);
    return { key, n: v.length, iqr, five: [wLo, q1, med, q3, wHi], outliers };
  });
  boxes.sort((a, b) => b.iqr - a.iqr); // widest spread on top
  const cats = boxes.map((b) => b.key);
  const isPct = yf.endsWith('_pct');
  const axLabel = (v: number) => (isPct ? fmt(yf, v) : v.toFixed(v >= 10 ? 0 : 1) + '×');
  const outPoints = boxes.flatMap((b, i) => b.outliers.map((x) => [x, i]));
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 96, right: 24, top: panel.title ? 34 : 16, bottom: 26 },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) => {
        if (o.seriesType === 'scatter') return `${cats[o.value[1]]} · outlier ${axLabel(o.value[0])}`;
        const b = boxes[o.dataIndex];
        return `<strong>${b.key}</strong> · ${b.n} states<br/>`
          + `median ${axLabel(b.five[2])}<br/>middle half ${axLabel(b.five[1])} – ${axLabel(b.five[3])}<br/>`
          + `range ${axLabel(b.five[0])} – ${axLabel(b.five[4])}`;
      },
    },
    xAxis: {
      type: 'value' as const, name: enc.yLabel, nameLocation: 'middle' as const, nameGap: 22,
      nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
      axisLabel: { color: t.subtle, formatter: axLabel },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    yAxis: {
      type: 'category' as const, data: cats, inverse: true,
      axisLabel: { color: t.subtle, fontSize: 11,
        formatter: (v: string) => (v.length > 13 ? v.slice(0, 12) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [
      {
        type: 'boxplot' as const, data: boxes.map((b) => b.five),
        itemStyle: { color: t.c1 + '22', borderColor: t.c1, borderWidth: 1.5 },
        emphasis: { itemStyle: { borderColor: t.text, color: t.c1 + '33' } },
        boxWidth: [7, 26] as [number, number],
      },
      {
        type: 'scatter' as const, data: outPoints, symbolSize: 5,
        itemStyle: { color: t.subtle, opacity: 0.7 },
      },
    ],
    title: chartCaption(panel, t, caption),
    media: [{ query: { maxWidth: 480 }, option: { grid: { left: 84 } } }],
  };
}

// Peer dot-plot — one row per state, states stacked down the y-axis and price on
// x, sorted cheapest→dearest, with a vertical median line. The selected state's
// dot is enlarged + accented (its price labelled) while peers recede to grey;
// with "All India" selected nothing is singled out, so every dot is accented
// (a visual cue that the whole field is in view). The vertical companion to the
// map beside it — same latest-day per-state numbers, read as a ranked list.
function dotplot(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens, caption = true) {
  const enc = panel.encoding;
  const yf = ctrlField(enc.y, ctrl);
  const kf = enc.x!;
  let r = applyFilters(rows, enc, ctrl).filter((row) => String(row[kf]) !== 'All India');
  if (!r.length) return emptyChart(t);
  // dearest first: with the y category axis inverse:true, index 0 renders at the
  // top, so the dearest state sits on top of the list.
  r = r.slice().sort((a, b) => (Number(b[yf]) || 0) - (Number(a[yf]) || 0));
  const names = r.map((row) => String(row[kf]));
  const vals = r.map((row) => Number(row[yf]) || 0);
  const n = vals.length;
  const med = (vals[(n - 1) >> 1] + vals[n >> 1]) / 2;
  const hi = resolveHighlight(enc, ctrl) ?? [];
  const nameSet = new Set(names);
  const anySel = hi.some((h) => nameSet.has(h)); // a real state is picked (not All India)
  const data = r.map((row, i) => {
    const key = names[i];
    const picked = anySel && hi.includes(key);
    const on = !anySel || picked; // All-India mode → every dot accented
    return {
      name: key, value: [vals[i], key],
      symbolSize: picked ? 14 : 9,
      itemStyle: { color: on ? t.c1 : t.subtle, opacity: on ? 1 : 0.6, borderColor: t.surfaceDim, borderWidth: 1 },
      label: picked
        ? { show: true, position: 'right' as const, formatter: fmt(yf, vals[i]),
            color: t.text, fontFamily: t.mono, fontSize: 10 }
        : { show: false },
    };
  });
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    grid: { left: 116, right: 44, top: caption && panel.title ? 34 : 14, bottom: 30 },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) => {
        const dearer = vals.filter((v) => v > o.value[0]).length;
        return `<strong>${o.data.name}</strong><br/>${fmt(yf, o.value[0])}<br/>#${dearer + 1} dearest of ${n}`;
      },
    },
    xAxis: {
      type: 'value' as const, name: enc.yLabel, nameLocation: 'middle' as const, nameGap: 20,
      nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
      axisLabel: { color: t.subtle, formatter: axisFmt(yf) },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    yAxis: {
      type: 'category' as const, data: names, inverse: true,
      axisLabel: { color: t.subtle, fontSize: 10,
        formatter: (v: string) => (v.length > 15 ? v.slice(0, 14) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [{
      type: 'scatter' as const, data, symbolSize: 9,
      emphasis: { itemStyle: { borderColor: t.text } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1 },
        label: { formatter: `median ${fmt(yf, med)}`, position: 'insideEndTop' as const,
          color: t.subtle, fontFamily: t.mono, fontSize: 10 },
        data: [{ xAxis: med }],
      },
    }],
    media: [{ query: { maxWidth: 480 }, option: { grid: { left: 96 }, series: [{ symbolSize: 7 }] } }],
  };
}

// Comparison board — the "rank them, now-vs-then, compare across them" table
// from The Big Book of Dashboards ch.6. One row per commodity, grouped by food
// family and ranked WITHIN each family (like the book's East/West grouping), by
// either the move or the price (Sort control). Three aligned columns share one
// category y-axis, so a row reads left-to-right as one food's whole story:
//   1. current ₹/kg — a bar with a tick for the 'then' price (the book's bullet)
//   2. the move (diverging, ± from a zero line) — the comparable "% difference"
//   3. a sparkline of the all-India price since 2021 — the trajectory
// Absolute ₹ can't be compared across foods (they differ 5×), so column 1 reads
// as a price ladder while column 2 carries the comparable move. Hovering any row
// pops a then-vs-now comparison (Fig 6.2). The state-level spread lives in its
// own scatter panel (spatial, not temporal). Reads movers / yoy / strend.
const FOOD_FAMILY: Record<string, string> = {
  Tomato: 'Vegetables', Onion: 'Vegetables', Potato: 'Vegetables',
  Rice: 'Cereals', Wheat: 'Cereals', Atta: 'Cereals',
  'Tur dal': 'Pulses', 'Moong dal': 'Pulses', 'Urad dal': 'Pulses', 'Masoor dal': 'Pulses', 'Gram dal': 'Pulses',
  'Mustard oil': 'Edible oils', 'Sunflower oil': 'Edible oils',
  Sugar: 'Other staples', Milk: 'Other staples', 'Packet salt': 'Other staples',
};
const FAM_ORDER = ['Vegetables', 'Cereals', 'Pulses', 'Edible oils', 'Other staples'];

// Stable per-food line style: every food owns a FIXED palette slot (+ a dash
// pattern once a hue repeats), so Tomato is ALWAYS the same colour no matter
// what else is selected — colour follows the entity, not its slot in the
// selection. Slots are hand-laid so the default one-per-family pick lands on
// five distinct solid hues, and no food family doubles a hue+dash pair. Dash
// is the secondary (CVD/print) encoding for the repeated hues; the palette
// steps themselves are the validated system chart colours.
export type LineStyleType = 'solid' | 'dashed' | 'dotted';
const FOOD_LINE: Record<string, [number, LineStyleType]> = {
  Onion: [0, 'solid'], Milk: [1, 'solid'], Rice: [2, 'solid'], 'Tur dal': [3, 'solid'],
  Tomato: [4, 'solid'], 'Mustard oil': [5, 'solid'],
  Potato: [0, 'dashed'], 'Sunflower oil': [1, 'dashed'], Wheat: [2, 'dashed'],
  'Moong dal': [3, 'dashed'], 'Masoor dal': [4, 'dashed'], Sugar: [5, 'dashed'],
  'Gram dal': [0, 'dotted'], 'Packet salt': [1, 'dotted'], Atta: [2, 'dotted'], 'Urad dal': [3, 'dotted'],
};
export function foodLine(name: string, t: Tokens): { color: string; type: LineStyleType } {
  const slot = FOOD_LINE[name];
  if (slot) return { color: t.palette[slot[0]], type: slot[1] };
  // unmapped food: a stable hash into the slots (still per-entity, never per-selection)
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { color: t.palette[h % t.palette.length],
    type: (['solid', 'dashed', 'dotted'] as const)[Math.floor(h / t.palette.length) % 3] };
}
function comptable(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens, caption = true) {
  const enc = panel.encoding;
  // which change drives the move column + the tooltip's 'then': d7 / d1 / chg_pct
  const vf = ctrlField(enc.y, ctrl) || 'd7_pct';
  const sortBy = one(ctrl.sortby) || 'move'; // 'move' | 'price'
  const pal = t.palette;
  const up = pal[5], down = pal[1]; // dearer = yellow (c6) · cheaper = cyan (c2)
  const level = t.c1; // orange for the current-price level bar
  const yoyBy = new Map<string, Row>();
  const trendBy = new Map<string, number[]>();
  for (const r of rows) {
    if (r.kind === 'yoy') yoyBy.set(String(r.commodity), r);
    else if (r.kind === 'strend' && String(r.st) === 'All India') {
      const c = String(r.commodity); (trendBy.get(c) ?? trendBy.set(c, []).get(c)!).push(Number(r.price_rs) || 0);
    }
  }
  type Rec = { c: string; fam: string; now: number; ref: number; metric: number; trend: number[] };
  const recs: Rec[] = rows.filter((r) => r.kind === 'movers').map((m) => {
    const c = String(m.commodity);
    const now = Number(m.price_rs) || 0;
    const d1 = Number(m.d1_pct), d7 = Number(m.d7_pct);
    const y = yoyBy.get(c); const chg = y ? Number(y.chg_pct) : NaN;
    const metric = vf === 'chg_pct' ? chg : vf === 'd1_pct' ? d1 : d7;
    // "then" price (the bullet tick + the tooltip's second bar), matched to basis
    const ref = vf === 'chg_pct' ? (y ? Number(y.then_rs) : now)
      : now / (1 + (vf === 'd1_pct' ? d1 : d7) / 100 || 1);
    return { c, fam: FOOD_FAMILY[c] ?? 'Other staples', now, ref,
      metric: Number.isFinite(metric) ? metric : 0, trend: trendBy.get(c) ?? [] };
  });
  if (!recs.length) return emptyChart(t);
  // group by family; within each, rank by the chosen key (biggest/dearest on top)
  const key = (r: Rec) => (sortBy === 'price' ? r.now : r.metric);
  recs.sort((a, b) => (FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam)) || (key(b) - key(a)));
  const cats = recs.map((r) => r.c);
  const N = cats.length;
  const narrow = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches;
  const maxAbs = Math.max(0.5, ...recs.map((r) => Math.abs(r.metric))) * (narrow ? 1.35 : 1.28);
  const maxNow = Math.max(...recs.map((r) => Math.max(r.now, r.ref))) * 1.16; // room for the ₹ label
  const famColor: Record<string, string> = {
    Vegetables: pal[0], Cereals: pal[2], Pulses: pal[3], 'Edible oils': pal[4], 'Other staples': t.subtle };
  const rich = {
    ...Object.fromEntries(FAM_ORDER.map((f) => [f.replace(/\s/g, ''),
      { color: famColor[f], fontFamily: t.mono, fontSize: 11, lineHeight: 14 }])),
    // second label line on narrow: the current price, muted under the name
    p: { color: t.subtle, fontFamily: t.mono, fontSize: 9, lineHeight: 11 },
  };

  const top = panel.title && caption ? 40 : 20, bottom = 34;
  const fmtPct = (x: number) => (x > 0 ? '+' : '') + x + '%';
  // Move (delta) bars — comparable %, diverging. The label is just the %; on
  // narrow the price rides on the category label (a ₹-price bar label left of a
  // negative bar collided with the food names in the 104px gutter).
  const moveBars = recs.map((r) => ({
    value: r.metric,
    itemStyle: { color: r.metric >= 0 ? up : down, opacity: 0.9, borderRadius: 2 },
    label: { show: true, position: (r.metric >= 0 ? 'right' : 'left') as 'right' | 'left',
      formatter: fmtPct(r.metric),
      color: t.subtle, fontFamily: t.mono, fontSize: 10 },
  }));
  const priceOf = Object.fromEntries(recs.map((r) => [r.c, r.now]));
  const catAxis = (idx: number, showLabel: boolean) => ({
    type: 'category' as const, data: cats, inverse: true, gridIndex: idx,
    axisLine: { show: false }, axisTick: { show: false },
    axisLabel: showLabel
      ? { margin: 8, color: t.text, fontSize: 11,
          // narrow: two lines — food name over its current ₹ (no price column there)
          formatter: (v: string) => {
            const name = `{${(FOOD_FAMILY[v] ?? 'Other staples').replace(/\s/g, '')}|${v.length > 13 ? v.slice(0, 12) + '…' : v}}`;
            return narrow ? `${name}\n{p|${fmtINR(priceOf[v] ?? 0)}}` : name;
          },
          rich }
      : { show: false },
  });
  // sparkline: one mini all-India price line per row, self-scaled into its band.
  const sparkRender = (params: any) => {
    const r = recs[params.dataIndex]; const v = r?.trend ?? [];
    const cs = params.coordSys; if (!cs || v.length < 2) return null;
    const rowH = cs.height / N, cy = cs.y + (params.dataIndex + 0.5) * rowH;
    const padX = cs.width * 0.08, innerW = cs.width - padX * 2, amp = rowH * 0.30;
    const vmin = Math.min(...v), vmax = Math.max(...v), vr = vmax - vmin || 1;
    const px = (i: number) => cs.x + padX + (i / (v.length - 1)) * innerW;
    const py = (val: number) => cy + amp - ((val - vmin) / vr) * 2 * amp;
    const points = v.map((val, i) => [px(i), py(val)]);
    const dir = v[v.length - 1] >= v[0] ? up : down;
    return { type: 'group', silent: true, children: [
      { type: 'polyline', shape: { points }, style: { stroke: t.subtle, fill: 'none', lineWidth: 1.2 } },
      { type: 'circle', shape: { cx: px(v.length - 1), cy: py(v[v.length - 1]), r: 2.4 }, style: { fill: dir } },
    ] };
  };

  // Row tooltip (bars only) — the Fig 6.2 now-vs-then read. Sub-₹100 prices get a
  // decimal so a real move isn't hidden by whole-rupee rounding (₹24.2 vs ₹23.6).
  const rs = (v: number) => (v < 100 ? '₹' + v.toFixed(1) : fmtINR(v));
  const rowTip = (o: any) => {
    const r = recs[o.dataIndex]; if (!r) return '';
    if (o.seriesId === 'spark') {
      const v = r.trend; if (v.length < 2) return `<strong>${r.c}</strong>`;
      return `<strong>${r.c}</strong> · all-India since 2021<br/>low ${rs(Math.min(...v))} · high ${rs(Math.max(...v))} · now ${rs(r.now)}`;
    }
    const basis = vf === 'chg_pct' ? 'a year ago' : vf === 'd1_pct' ? 'yesterday' : 'last week';
    const mx = Math.max(r.now, r.ref) || 1;
    const bar = (p: number, on: boolean) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-top:3px">`
      + `<div style="height:9px;width:${Math.round((p / mx) * 116)}px;background:${on ? up : t.subtle};border-radius:2px"></div>`
      + `<span>${rs(p)}</span></div>`;
    const dearer = r.metric >= 0;
    return `<strong>${r.c}</strong> · ${fmtPct(r.metric)} vs ${basis}`
      + `<div style="margin-top:4px;color:${t.subtle}">Now</div>${bar(r.now, dearer)}`
      + `<div style="margin-top:4px;color:${t.subtle}">${basis[0].toUpperCase() + basis.slice(1)}</div>${bar(r.ref, false)}`
      + `<div style="margin-top:5px;color:${dearer ? up : down}">${dearer ? '▲ dearer' : '▼ cheaper'}</div>`
      // dashboard chrome only (caption=false): the view wires row-click → the
      // state-spread panel below; surface that affordance in the hover
      + (!caption ? `<div style="margin-top:4px;color:${t.subtle}">click row → state-by-state spread</div>` : '');
  };

  const base = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    tooltip: { trigger: 'item' as const, confine: true, backgroundColor: t.surfaceDim, borderColor: t.line,
      textStyle: { color: t.text, fontFamily: t.mono, fontSize: 11 }, formatter: rowTip },
  };

  // narrow: a single column — the comparable move, price on the label. The trend
  // is dropped on phones (it's the small 20% column on desktop; the dedicated
  // "every food since 2021" line panel below carries the trajectories on mobile).
  if (narrow) {
    return { ...base,
      grid: [{ left: 104, right: '13%', top, bottom }],
      xAxis: [{ type: 'value', gridIndex: 0, min: -maxAbs, max: maxAbs,
        axisLabel: { color: t.subtle, fontFamily: t.mono, fontSize: 9, formatter: (x: number) => (x > 0 ? '+' : '') + Math.round(x) + '%' },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: t.line, type: 'dashed', opacity: 0.4 } } }],
      yAxis: [catAxis(0, true)],
      series: [{ id: 'chg', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, data: moveBars, barWidth: '52%',
        markLine: { silent: true, symbol: 'none', lineStyle: { color: t.subtle, width: 1 }, label: { show: false }, data: [{ xAxis: 0 }] } }],
    };
  }

  // desktop: current ₹ (bar + then-tick) | move % (diverging) | trend sparkline
  // A real gutter (~4%) between the ₹ and move grids: at 1% their edge axis
  // labels (₹-max and move-min) overprinted into garbage like "₹235B%".
  const moveLabel = vf === 'chg_pct' ? 'YEAR AGO' : vf === 'd1_pct' ? 'YESTERDAY' : 'LAST WEEK';
  return { ...base,
    grid: [{ left: 104, right: '53%', top, bottom },   // current ₹ — ~47%
      { left: '51.5%', right: '22%', top, bottom },      // move — ~26%
      { left: '81%', right: '2%', top, bottom }],         // trend — ~19% (compact = shape reads)
    xAxis: [
      { type: 'value', gridIndex: 0, min: 0, max: maxNow,
        axisLabel: { color: t.subtle, fontFamily: t.mono, fontSize: 9, formatter: (x: number) => '₹' + Math.round(x) },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: t.line, type: 'dashed', opacity: 0.4 } } },
      { type: 'value', gridIndex: 1, min: -maxAbs, max: maxAbs,
        axisLabel: { color: t.subtle, fontFamily: t.mono, fontSize: 9, formatter: (x: number) => (x > 0 ? '+' : '') + Math.round(x) + '%' },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: t.line, type: 'dashed', opacity: 0.4 } } },
      { type: 'value', gridIndex: 2, min: 0, max: 1, show: false },
    ],
    yAxis: [catAxis(0, true), catAxis(1, false), catAxis(2, false)],
    series: [
      // current price bar — calm single colour, ₹ labelled at the bar end
      { id: 'now', type: 'bar', xAxisIndex: 0, yAxisIndex: 0, barWidth: '52%',
        data: recs.map((r) => r.now),
        itemStyle: { color: level, opacity: 0.85, borderRadius: 2 },
        label: { show: true, position: 'right', formatter: (o: any) => fmtINR(recs[o.dataIndex].now),
          color: t.subtle, fontFamily: t.mono, fontSize: 10 } },
      // the "then" tick — a thin upright mark on each row (the book's bullet ref)
      { id: 'tick', type: 'scatter', xAxisIndex: 0, yAxisIndex: 0, silent: true,
        symbol: 'rect', symbolSize: [2.5, 16], z: 5,
        data: recs.map((r, i) => ({ value: [r.ref, i] })),
        itemStyle: { color: t.text } },
      // move (delta) — diverging, from a zero line
      { id: 'chg', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: moveBars, barWidth: '52%',
        markLine: { silent: true, symbol: 'none', lineStyle: { color: t.subtle, width: 1 }, label: { show: false }, data: [{ xAxis: 0 }] } },
      // trajectory
      { id: 'spark', type: 'custom', xAxisIndex: 2, yAxisIndex: 2, data: recs.map((_, i) => i), renderItem: sparkRender },
    ],
    graphic: [
      { type: 'text', left: 104, top: 5, style: { text: 'CURRENT ₹/KG · │ = ' + moveLabel, fill: t.subtle, font: `9px ${t.mono}` } },
      { type: 'text', left: '51.5%', top: 5, style: { text: 'MOVE VS ' + moveLabel, fill: t.subtle, font: `9px ${t.mono}` } },
      { type: 'text', left: '81%', top: 5, style: { text: 'SINCE 2021', fill: t.subtle, font: `9px ${t.mono}` } },
      // dot legend: the sparkline's end dot = today's price, coloured by the
      // five-year direction (same yellow-up / cyan-down as the move column).
      { type: 'text', left: 104, bottom: 6, style: { text: 'SPARKLINE ● = price now · colour = up/down since 2021', fill: t.subtle, font: `9px ${t.mono}` } },
    ],
  };
}

// Convert a human-readable state (the 'State' control's value) to the map's
// upper-case feature name — the same rule the build's REGION_SQL applies, so a
// selected state can be located on the choropleth. 'All India' → no match.
export const toRegion = (st: string) =>
  st === 'DNH and DD' ? 'DADRA & NAGAR HAVELI & DAMAN & DIU' : st.toUpperCase().replace(/ AND /g, ' & ');

function choropleth(pairs: Pairs, { panel, yField, t, highlight }: BuildCtx) {
  const vals = pairs.map((p) => p.value);
  // computed rank by value desc (the DB rank column is unreliable)
  const ranked = pairs.slice().sort((a, b) => b.value - a.value);
  const rankOf = new Map(ranked.map((p, i) => [p.key, i + 1]));
  const byKey = new Map(pairs.map((p) => [p.key, p.value]));
  // Selected state: mark it with a bold outline only, NOT a fill colour (fill
  // still encodes price) and NOT a pinned label (dark text is illegible on the
  // dark-filled small NE states) — the view pops the tooltip on selection instead.
  const selRegion = highlight?.length ? toRegion(highlight[0]) : undefined;
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) => byKey.has(o.name)
        ? `<strong>${o.name}</strong><br/>Rank #${rankOf.get(o.name)} of ${pairs.length}<br/>${fmt(yField, byKey.get(o.name)!)}`
        : `${o.name}<br/>no data`,
    },
    visualMap: {
      min: Math.min(...vals), max: Math.max(...vals), left: 'left', bottom: 24, calculable: true,
      text: ['high', 'low'], textStyle: { color: t.subtle, fontFamily: t.mono },
      inRange: { color: [t.surfaceDim, t.c6, t.c1] }, formatter: (v: number) => fmt(yField, v),
    },
    series: [{
      type: 'map', map: panel.map ?? 'india', roam: false, nameProperty: 'name',
      label: { show: false }, itemStyle: { borderColor: t.line, borderWidth: 0.5 },
      emphasis: { label: { show: true, color: t.text, fontFamily: t.mono, fontSize: 10 }, itemStyle: { areaColor: t.c1 } },
      // pin the selected region's label so it reads without a hover
      selectedMode: false,
      data: pairs.map((p) => {
        const sel = p.key === selRegion;
        return sel
          ? { name: p.key, value: p.value,
              itemStyle: { borderColor: t.text, borderWidth: 2 },
              emphasis: { itemStyle: { borderColor: t.text, borderWidth: 2 } } }
          : { name: p.key, value: p.value };
      }),
    }],
  };
}

type Series = { name: string; data: number[] }[];

// shared frame for multi-series time charts (stacked + multi-line)
const multiSeriesFrame = (xs: string[], yField: string, t: Tokens, agg: string | undefined, zoom: boolean, yName?: string) => ({
  backgroundColor: 'transparent',
  textStyle: { fontFamily: t.mono, color: t.subtle },
  // extra top room so the y-axis unit name clears the legend above it
  grid: { left: 8, right: 16, top: 58, bottom: zoom ? 60 : 28, containLabel: true },
  legend: { type: 'scroll' as const, top: 6, textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 },
    inactiveColor: t.line, pageTextStyle: { color: t.subtle } },
  tooltip: { trigger: 'axis' as const, valueFormatter: (v: number) => fmt(yField, v) },
  xAxis: xTimeAxis(xs, t, agg),
  yAxis: yValueAxis(yField, t, yName),
  dataZoom: zoom ? zoomBars(t, xs.length) : undefined,
  ...(zoom ? dragZoomOption() : {}),
});

function stacked(type: 'area' | 'bar', xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false, yName?: string) {
  const pal = t.palette;
  return {
    ...multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis, yName),
    series: series.map((s, i) => {
      const color = seriesColor(pal, i, s.name, t);
      return {
        name: s.name, type: type === 'bar' ? 'bar' : 'line', stack: 'total',
        ...(type === 'bar'
          ? { itemStyle: { color } }
          : { smooth: false, showSymbol: false, lineStyle: { width: 1, color },
              areaStyle: { color, opacity: 0.85 }, itemStyle: { color } }),
        emphasis: { focus: 'series' },
        data: s.data,
      };
    }),
  };
}

// unstacked, unshaded comparison lines — one line per series on a shared axis.
function multiline(xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false, yName?: string, legendLeft = false, lineOf?: (name: string) => { color: string; type: LineStyleType }) {
  const pal = t.palette;
  const frame = multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis, yName);
  // Left legend (desktop): vertical + scrollable down the left gutter for many
  // series; on a narrow screen it folds back to the top (a left rail would starve
  // the plot). ECharts `media` reflows it on resize without a rebuild.
  const legendOpt = legendLeft
    ? { ...frame,
        grid: { ...frame.grid, left: 150, top: 20 },
        legend: { type: 'scroll' as const, orient: 'vertical' as const, left: 8, top: 20, bottom: 20,
          textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 }, inactiveColor: t.line,
          pageTextStyle: { color: t.subtle }, pageIconColor: t.subtle },
        media: [{ query: { maxWidth: 760 }, option: {
          grid: { left: 8, top: 58 },
          legend: { orient: 'horizontal', left: 'center', top: 6, bottom: 'auto' } } }] }
    : frame;
  return {
    ...legendOpt,
    series: series.map((s, i) => {
      // 'All India' is a reference line: muted + dashed when a state is overlaid
      // on it; when it's the only line (All-India view) it's the primary subject.
      const isRef = s.name === 'All India' && series.length > 1;
      const own = !isRef && s.name !== 'All India' && lineOf ? lineOf(s.name) : undefined;
      const color = isRef ? t.subtle : s.name === 'All India' ? t.c1
        : own ? own.color : seriesColor(pal, i, s.name, t);
      return {
        name: s.name, type: 'line' as const, smooth: true, showSymbol: false, connectNulls: true,
        // reference line (national median under a selected state) recedes: thinner,
        // dashed and semi-transparent so the state line reads as the subject.
        lineStyle: { width: isRef ? 1.5 : 2, color, opacity: isRef ? 0.45 : 1,
          ...(isRef ? { type: 'dashed' as const } : own ? { type: own.type } : {}) },
        itemStyle: { color }, emphasis: { focus: 'series' },
        data: s.data,
      };
    }),
  };
}

// Two contrasting curves on independent y-axes (e.g. a soaring count against a
// sinking rate). Each axis formats with its own field's units; the unit toggle
// still scales the left/count axis. One tidy row per x, with `y` and `y2`.
// NOTE: kept as a deliberate capability — no panel uses chart:'dual' right now
// (the reliability beat moved to a single line), but it's wired and ready.
function dualAxis(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens) {
  const enc = panel.encoding;
  const xf = enc.x!;
  const yL = ctrlField(enc.y, ctrl);
  const yR = enc.y2!;
  const r = applyFilters(rows, enc, ctrl).slice().sort((a, b) => String(a[xf]).localeCompare(String(b[xf])));
  const xs = r.map((d) => String(d[xf]));
  const left = r.map((d) => Number(d[yL]) || 0);
  const right = r.map((d) => Number(d[yR]) || 0);
  const cL = t.c1; // left curve: primary
  const cR = t.palette[2]; // right curve: a contrasting hue
  const nameStyle = { color: t.subtle, fontFamily: t.mono, fontSize: 9 };
  const lName = enc.yLabel ?? unitName(yL);
  const rName = enc.y2Label ?? unitName(yR);
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 8, right: 12, top: 58, bottom: 28, containLabel: true },
    legend: { top: 6, textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 }, inactiveColor: t.line },
    tooltip: {
      trigger: 'axis',
      formatter: (ps: any[]) =>
        `<strong>${ps[0].axisValue}</strong><br/>` +
        ps.map((p) => `${p.marker}${p.seriesName}: ${fmt(p.seriesIndex === 0 ? yL : yR, p.value)}`).join('<br/>'),
    },
    xAxis: xCatAxis(xs, t),
    yAxis: [
      { type: 'value' as const, name: unitName(yL), nameLocation: 'end' as const, nameGap: 10,
        nameTextStyle: { ...nameStyle, align: 'left' as const }, position: 'left' as const,
        axisLabel: { color: t.subtle, formatter: axisFmt(yL) },
        splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } } },
      { type: 'value' as const, name: unitName(yR), nameLocation: 'end' as const, nameGap: 10,
        nameTextStyle: { ...nameStyle, align: 'right' as const }, position: 'right' as const,
        axisLabel: { color: t.subtle, formatter: axisFmt(yR) }, splitLine: { show: false } },
    ],
    series: [
      { name: lName, type: 'line' as const, smooth: true, showSymbol: true, symbolSize: 6, yAxisIndex: 0,
        data: left, lineStyle: { width: 2.5, color: cL }, itemStyle: { color: cL }, areaStyle: { color: cL, opacity: 0.08 } },
      { name: rName, type: 'line' as const, smooth: true, showSymbol: true, symbolSize: 6, yAxisIndex: 1,
        data: right, lineStyle: { width: 2.5, color: cR }, itemStyle: { color: cR } },
    ],
  };
}

// Slope (rank-flip) chart: each category ranked by one measure on the left and
// another on the right, lines connecting. Reveals when "what's most frequent"
// and "where the money is" disagree. `y` = left measure, `y2` = right measure.
function slope(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens) {
  const enc = panel.encoding;
  const keyf = enc.x!;
  const lf = ctrlField(enc.y, ctrl);
  const rf = enc.y2!;
  const r = applyFilters(rows, enc, ctrl);
  const n = r.length;
  const rankMap = (field: string) =>
    new Map(
      [...r].sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0)).map((d, i) => [String(d[keyf]), i + 1])
    );
  const lRank = rankMap(lf), rRank = rankMap(rf);
  const hi = resolveHighlight(enc, ctrl);
  const richFor = (on: boolean) => ({
    n: { color: on ? t.text : t.subtle, fontFamily: t.mono, fontSize: 11, lineHeight: 14, fontWeight: on ? 600 : 400 },
    v: { color: t.subtle, fontFamily: t.mono, fontSize: 10, lineHeight: 13 },
  });
  // left side = the `y` measure; right side = the `y2` measure. Both go through
  // fmt so they track the unit toggle. Without yLabel the left measure keeps the
  // original payments semantics (vol in millions → crore txns); with explicit
  // column labels both sides format by their own field.
  const countStr = (v: number) => (enc.yLabel ? fmt(lf, v) : fmt('volume_cr', v / 10));
  const series = r.map((d) => {
    const k = String(d[keyf]);
    const a = lRank.get(k)!, b = rRank.get(k)!;
    // with a highlight set, those keys are primary and the rest recede to grey;
    // without one, colour by direction (rises toward value → primary).
    const on = hi ? hi.includes(k) : b < a;
    const color = on ? t.c1 : t.subtle;
    return {
      name: k, type: 'line' as const, symbol: 'circle', symbolSize: on ? 10 : 7,
      data: [
        { value: a, label: { position: 'left' as const, formatter: `{n|${k}}\n{v|${countStr(Number(d[lf]))}}` } },
        { value: b, label: { position: 'right' as const, formatter: `{n|${k}}\n{v|${fmt(rf, Number(d[rf]))}}` } },
      ],
      label: { show: true, rich: richFor(on) },
      lineStyle: { width: on ? 3 : 1.5, color }, itemStyle: { color },
      emphasis: { focus: 'series' as const },
      z: on ? 4 : 1,
    };
  });
  const head = { color: t.subtle, fontFamily: t.mono, fontSize: 11, fontWeight: 600 as const };
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    // anchored titles as column headers (axis labels clip at narrow widths).
    title: [
      { text: enc.yLabel ?? 'BY COUNT', left: 14, top: 4, textStyle: head },
      { text: enc.y2Label ?? 'BY VALUE', right: 14, top: 4, textStyle: head },
    ],
    grid: { left: 100, right: 100, top: 36, bottom: 14 },
    tooltip: { trigger: 'item' as const, formatter: (o: any) => `<strong>${o.seriesName}</strong>` },
    xAxis: { type: 'category' as const, data: ['count', 'value'], boundaryGap: true, show: false },
    yAxis: { type: 'value' as const, inverse: true, min: 0.5, max: n + 0.5, show: false },
    series,
  };
}

// Bump (rank-over-time) chart: the slope chart generalised past two columns.
// Each series is ranked against the others within every x period (1 = largest
// `y` that period) and drawn as a line that rises/falls as the running order
// changes — a league table over time. Endpoints carry a {rank, name} label.
// `series` = the racer, `x` = the period, `y` = the measure ranked each period.
function bump(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens) {
  const enc = panel.encoding;
  const xf = enc.x!;
  const sf = enc.series!;
  const yf = ctrlField(enc.y, ctrl);
  const r = applyFilters(rows, enc, ctrl);
  const xs = [...new Set(r.map((d) => String(d[xf])))].sort();
  const xi = new Map(xs.map((x, i) => [x, i]));
  // null = key absent that period (line gaps; e.g. an app launched mid-range)
  const meas = new Map<string, (number | null)[]>(); // key → measure aligned to xs
  for (const d of r) {
    const k = String(d[sf]);
    if (!meas.has(k)) meas.set(k, new Array(xs.length).fill(null));
    const i = xi.get(String(d[xf]))!;
    meas.get(k)![i] = (meas.get(k)![i] ?? 0) + (Number(d[yf]) || 0);
  }
  const keys = [...meas.keys()];
  const n = keys.length;
  const lastI = xs.length - 1;
  const rank = new Map<string, (number | null)[]>(keys.map((k) => [k, new Array(xs.length).fill(null)]));
  for (let i = 0; i < xs.length; i++) {
    keys.filter((k) => meas.get(k)![i] != null)
      .sort((a, b) => (meas.get(b)![i] as number) - (meas.get(a)![i] as number))
      .forEach((k, idx) => { rank.get(k)![i] = idx + 1; });
  }
  // order by latest-period standing so palette colours read top-to-bottom
  keys.sort((a, b) => (rank.get(a)![lastI] ?? 99) - (rank.get(b)![lastI] ?? 99));
  const hi = resolveHighlight(enc, ctrl);
  const pal = t.palette;
  const richFor = (color: string, on: boolean) => ({
    n: { color: on ? t.text : t.subtle, fontFamily: t.mono, fontSize: 11, lineHeight: 14, fontWeight: on ? 600 : 400 },
    r: { color, fontFamily: t.mono, fontSize: 11, fontWeight: 700 as const },
  });
  const series = keys.map((k, idx) => {
    const on = hi ? hi.includes(k) : true;
    const color = on ? pal[idx % pal.length] : t.subtle;
    const ranks = rank.get(k)!;
    const fp = ranks.findIndex((v) => v != null); // first period the key appears
    const data = ranks.map((rk, i) => ({
      value: rk, // null → the line gaps before the key exists
      label: rk == null ? { show: false }
        : i === fp && i !== lastI
          ? { show: true, position: 'left' as const, formatter: `{r|#${rk}}  {n|${k}}` }
          : i === lastI
            ? { show: true, position: 'right' as const, formatter: `{n|${k}}  {r|#${rk}}` }
            : { show: false },
    }));
    return {
      name: k, type: 'line' as const, symbol: 'circle', symbolSize: on ? 9 : 6, smooth: 0.2,
      data, label: { show: true, rich: richFor(color, on) },
      lineStyle: { width: on ? 3 : 1.5, color }, itemStyle: { color },
      emphasis: { focus: 'series' as const }, z: on ? 4 : 1,
    };
  });
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 112, right: 112, top: 24, bottom: 24 },
    tooltip: { trigger: 'item' as const, formatter: (o: any) => `<strong>${o.seriesName}</strong><br/>#${o.value} in ${o.name}` },
    xAxis: {
      type: 'category' as const, data: xs, boundaryGap: false,
      // The name-label gutters leave a narrow plot, so ECharts' auto-thinning
      // can drop the last period (making the data look stale). Pin first / middle
      // / last so the latest period always shows, at every width.
      axisLabel: { color: t.subtle, fontFamily: t.mono,
        interval: (i: number) => i === 0 || i === lastI || i === Math.round(lastI / 2) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    yAxis: { type: 'value' as const, inverse: true, min: 0.5, max: n + 0.5, show: false },
    series,
    // Phones: the web line weight (3) crowds the narrow plot, so thin the lines
    // and shrink the markers. Merges by series index onto the base series above.
    media: [
      {
        query: { maxWidth: 480 },
        option: {
          series: keys.map((k) => {
            const on = hi ? hi.includes(k) : true;
            return { lineStyle: { width: on ? 2 : 1 }, symbolSize: on ? 6 : 4 };
          }),
        },
      },
    ],
  };
}

// centered "no data" placeholder — used when a selection yields nothing to plot
// (e.g. Settlement Systems has value but ~zero volume). Avoids feeding ECharts a
// degenerate all-zero pie, which renders broken and can corrupt the instance.
const emptyChart = (t: Tokens, msg = 'No data for this selection') => ({
  backgroundColor: 'transparent',
  title: { text: msg, left: 'center', top: 'middle',
    textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 13, fontWeight: 400 as const } },
  series: [] as unknown[],
});

function donut(pairs: Pairs, { yField, t }: BuildCtx) {
  const pal = t.palette;
  const total = pairs.reduce((a, p) => a + p.value, 0);
  if (!(total > 0)) return emptyChart(t);
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: {
      text: fmt(yField, total), subtext: 'total', left: '34%', top: '44%', textAlign: 'center',
      textStyle: { color: t.text, fontFamily: t.mono, fontSize: 14, fontWeight: 600 },
      subtextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
    },
    tooltip: { trigger: 'item', formatter: (o: any) => `<strong>${o.name}</strong><br/>${fmt(yField, o.value)} · ${o.percent}%` },
    legend: { type: 'scroll', orient: 'vertical', right: 8, top: 'middle',
      formatter: (name: string) => (name.length > 22 ? name.slice(0, 21) + '…' : name),
      textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 }, inactiveColor: t.line, pageTextStyle: { color: t.subtle } },
    series: [{
      type: 'pie', radius: ['46%', '72%'], center: ['34%', '50%'], avoidLabelOverlap: true,
      label: { show: false }, labelLine: { show: false },
      itemStyle: { borderColor: t.surfaceDim, borderWidth: 1 },
      data: pairs.map((p, i) => ({
        name: p.key, value: p.value,
        itemStyle: { color: p.key === 'Other' ? t.subtle : pal[i % pal.length] },
      })),
    }],
    // Narrow panels (mobile): the side legend collides with the ring, so drop it
    // below and centre the pie. ECharts re-applies this on resize.
    media: [
      {
        query: { maxWidth: 480 },
        option: {
          title: { left: '50%', top: '34%' },
          legend: { orient: 'horizontal', left: 'center', right: 'auto', top: 'auto', bottom: 4 },
          series: [{ center: ['50%', '40%'], radius: ['40%', '60%'] }],
        },
      },
    ],
  };
}

// Build a panel's ECharts option given the dataset + current control state.
export function buildPanel(panel: PanelSpec, rows: Row[], ctrl: CtrlState, t: Tokens, caption = true) {
  const chartCtl = panel.controls?.find((c) => c.affects === 'chart');
  const type = (chartCtl ? one(ctrl[chartCtl.id]) : panel.chart) as PanelSpec['chart'];
  // period control drives D/M/Q/Y; with no control but a temporal x (date/month),
  // default to monthly so the axis still formats as a time series (story charts).
  const agg = panel.encoding.period ? one(ctrl[panel.encoding.period])
    : panel.encoding.x === 'date' || panel.encoding.x === 'month' ? 'M' : undefined;

  if (type === 'dual') return dualAxis(rows, panel, ctrl, t);
  if (type === 'slope') return slope(rows, panel, ctrl, t);
  if (type === 'bump') return bump(rows, panel, ctrl, t);
  if (type === 'strips') return strips(rows, panel, ctrl, t, caption);
  if (type === 'boxplot') return boxplot(rows, panel, ctrl, t, caption);
  if (type === 'dotplot') return dotplot(rows, panel, ctrl, t, caption);
  if (type === 'comptable') return comptable(rows, panel, ctrl, t, caption);
  if (panel.encoding.series && (type === 'area' || type === 'bar')) {
    const { xs, series, yField } = resolveSeries(rows, panel.encoding, ctrl);
    return stacked(type, xs, series, yField, t, agg, panel.staticAxis, panel.encoding.yLabel);
  }
  if (panel.encoding.series && type === 'line') {
    const { xs, series, yField } = resolveSeries(rows, panel.encoding, ctrl);
    return multiline(xs, series, yField, t, agg, panel.staticAxis, panel.encoding.yLabel, panel.encoding.legend === 'left',
      panel.encoding.colorBy === 'food' ? (n: string) => foodLine(n, t) : undefined);
  }
  if (type === 'donut') {
    const lim = typeof panel.encoding.limit === 'string'
      ? +(one(ctrl[panel.encoding.limit.slice(1)]) || 0) : panel.encoding.limit;
    const { pairs, yField } = resolve(rows, { ...panel.encoding, sort: 'desc', limit: undefined }, ctrl);
    return donut(groupOther(pairs, lim), { panel, yField, t });
  }

  const { pairs, yField } = resolve(rows, panel.encoding, ctrl);
  const ctx: BuildCtx = { panel, yField, t, highlight: resolveHighlight(panel.encoding, ctrl), caption };
  if (type === 'choropleth') return choropleth(pairs, ctx);
  if (type === 'stair') return stair(pairs, ctx);
  if (type === 'bar' && panel.encoding.horizontal) return horizontalBar(pairs, ctx);
  return lineOrBar(type === 'bar' ? 'bar' : 'line', pairs, ctx, agg);
}

// Stat tiles (chart:'stat') — computed over the filtered window, returned as
// a {value,label} pair the renderer drops into an HTML tile (not ECharts).
export function computeStat(panel: PanelSpec, rows: Row[], ctrl: CtrlState): { value: string; label: string; delta?: string } {
  // Latest price + day-on-day move: expects the filters to select a single row
  // carrying the `y` price field and a `d1_pct` % change (▲/▼ vs yesterday).
  if (panel.stat === 'priceDelta') {
    const r = applyFilters(rows, panel.encoding, ctrl);
    if (!r.length) return { value: '—', label: panel.title };
    const yf = ctrlField(panel.encoding.y, ctrl);
    const price = Number(r[0][yf]) || 0;
    const d = Number(r[0].d1_pct);
    const delta = Number.isFinite(d) && d !== 0 ? `  ${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)}%` : '';
    return { value: fmt(yf, price) + delta, label: panel.title };
  }
  // State tile — one tile that follows the "State" control: "All India" shows the
  // national median (no rank); a single state shows its price plus where it sits
  // among peers (the chapter's exact-KPI). Both carry a small vs-previous-day
  // delta (`delta`, rendered smaller + muted by the view). Reads the `dist` kind,
  // whose 'All India' companion row makes the two cases one code path.
  if (panel.stat === 'statePrice') {
    const r = applyFilters(rows, panel.encoding, ctrl); // where kind:dist + commodity
    const st = one(ctrl.state) || 'All India';
    const mine = r.find((row) => String(row.st) === st);
    if (!mine) return { value: '—', label: panel.title };
    const yf = ctrlField(panel.encoding.y, ctrl);
    const price = Number(mine[yf]) || 0;
    const d = Number(mine.d1_pct);
    const delta = Number.isFinite(d) && d !== 0 ? `${d > 0 ? '▲' : '▼'}${Math.abs(d)}%` : '';
    // en spaces around the middot give the two label halves room to breathe.
    const SEP = " · ";
    if (st === 'All India') {
      return { value: `${fmt(yf, price)}/kg`, delta, label: `All-India median${SEP}vs previous day` };
    }
    const states = r.filter((row) => String(row.st) !== 'All India');
    const n = states.length;
    const cheaper = states.filter((row) => (Number(row[yf]) || 0) < price).length;
    const rank = n - cheaper; // 1 = dearest
    const pct = n > 1 ? Math.round((cheaper / (n - 1)) * 100) : 0;
    return { value: `${fmt(yf, price)}/kg`, delta,
      label: `${st}${SEP}dearer than ${pct}% of states${SEP}#${rank} of ${n}` };
  }
  // Cheapest ↔ dearest tile: today's price range across states for the selected
  // commodity, naming the two extreme states.
  if (panel.stat === 'cheapestDearest') {
    const r = applyFilters(rows, panel.encoding, ctrl).filter((row) => String(row.st) !== 'All India');
    if (r.length < 2) return { value: '—', label: panel.title };
    const yf = ctrlField(panel.encoding.y, ctrl);
    let lo = r[0], hi = r[0];
    for (const row of r) {
      const v = Number(row[yf]) || 0;
      if (v < (Number(lo[yf]) || 0)) lo = row;
      if (v > (Number(hi[yf]) || 0)) hi = row;
    }
    return { value: `${fmt(yf, Number(lo[yf]))} – ${fmt(yf, Number(hi[yf]))}`,
      label: `${lo.st} → ${hi.st}` };
  }
  // Year-on-year tile: the selected commodity's all-India change vs a year ago.
  if (panel.stat === 'yoyStat') {
    const r = applyFilters(rows, panel.encoding, ctrl); // where kind:yoy + commodity
    const c = r.length ? Number(r[0].chg_pct) : NaN;
    if (!Number.isFinite(c)) return { value: '—', label: panel.title };
    return { value: `${c > 0 ? '▲' : c < 0 ? '▼' : ''}${Math.abs(c)}%`, label: panel.title };
  }
  // Overview tiles: totals across the selected instruments + range + leading share.
  if (panel.stat === 'totalVolume' || panel.stat === 'totalValue' || panel.stat === 'leadShare') {
    const r = applyFilters(rows, panel.encoding, ctrl);
    if (!r.length) return { value: '—', label: panel.title };
    if (panel.stat === 'leadShare') {
      const yf = ctrlField(panel.encoding.y, ctrl);
      const by = panel.encoding.series ?? 'product';
      const agg = new Map<string, number>();
      let tot = 0;
      for (const row of r) {
        const v = Number(row[yf]) || 0;
        agg.set(String(row[by]), (agg.get(String(row[by])) ?? 0) + v);
        tot += v;
      }
      if (!tot) return { value: '—', label: panel.title };
      const [k, v] = [...agg.entries()].sort((a, b) => b[1] - a[1])[0];
      return { value: `${k} · ${Math.round((v / tot) * 100)}%`, label: panel.title };
    }
    const yf = panel.stat === 'totalVolume' ? 'volume_cr' : 'value_lcr';
    const tot = r.reduce((a, row) => a + (Number(row[yf]) || 0), 0);
    return { value: fmt(yf, tot), label: panel.title };
  }

  const r = applyFilters(rows, { ...panel.encoding, y: 'volume_cr' }, ctrl);
  let volCr = 0, valLcr = 0;
  const dates = new Set<string>(); // distinct days = the avg-daily denominator
  for (const row of r) {
    volCr += Number(row.volume_cr) || 0;
    valLcr += Number(row.value_lcr) || 0;
    dates.add(String(row.date));
  }
  const days = dates.size;
  if (panel.stat === 'avgDailyVolume') {
    return { value: days ? fmtVolCr(volCr / days) : '—', label: panel.title };
  }
  if (panel.stat === 'avgDailyValue') {
    return { value: days ? fmtValLcr(valLcr / days) : '—', label: panel.title };
  }
  // ticket size: total ₹ / total txns = (valLcr*1e12)/(volCr*1e7) = valLcr/volCr*1e5
  const ticket = volCr ? (valLcr / volCr) * 1e5 : 0;
  return { value: volCr ? fmtINR(ticket) : '—', label: panel.title };
}
