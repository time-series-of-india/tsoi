// Spec-driven dashboard runtime — the CODE half (registry + resolver).
// Specs are pure data (see specs.ts / later user submissions); this turns a
// tidy dataset + current control state into an ECharts `option` (or, for
// stat tiles, an HTML string), in TSOI design tokens. No per-dashboard logic.

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
  highlight?: string[]; // slope: keys to colour as primary; the rest recede
  horizontal?: boolean;
}

export interface Control {
  id: string;
  type: 'select' | 'toggle' | 'multiselect' | 'daterange';
  label: string;
  field?: string; // selects/multiselects whose options come from a dataset column
  labels?: Record<string, string>; // display labels for raw option values (value stays the key)
  dependsOn?: string[]; // cascading: option list filtered by these controls' values
  options?: { value: string; label: string }[];
  quick?: { value: string; label: string }[]; // daterange: quick-range presets (see resolveRange tokens)
  default: string | string[]; // array for multiselect
  defaultTop?: number; // multiselect: when entering a new scope, preselect the top-N by `rankBy`
  rankBy?: string; // measure field to rank options for `defaultTop` (default volume_cr)
  affects?: 'chart'; // a toggle whose value overrides the panel's chart type
}

export interface PanelSpec {
  id: string;
  title: string;
  chart: 'line' | 'bar' | 'area' | 'donut' | 'choropleth' | 'stat' | 'dual' | 'slope' | 'bump';
  encoding: Encoding;
  controls?: Control[];
  map?: string; // registered map name for choropleth
  wide?: boolean; // span the full panel grid (full-width row)
  staticAxis?: boolean; // time chart: show the full range, no zoom slider (editorial)
  stat?: 'avgDailyVolume' | 'avgDailyValue' | 'ticket' | 'totalVolume' | 'totalValue' | 'leadShare';
}

export interface DashboardSpec {
  slug: string;
  theme: string;
  title: string;
  description: string;
  dataset: string;
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
  const r = applyFilters(rows, enc, ctrl);
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
interface BuildCtx { panel: PanelSpec; yField: string; t: Tokens }

// shared time-series chart pieces (line / stacked / multi-line all reuse these)
// Touch devices get no in-chart zoom at all: the `inside` pan traps page scroll,
// and the slider gets tapped by accident mid-scroll, collapsing the window with
// no easy way back. On mobile, range is controlled by the dashboard's RANGE
// dropdown instead. zoomBars (mouse only) keeps both inside pan + slider.
const isCoarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const zoomBars = (t: Tokens, _n: number) => [
  { type: 'inside', start: 0, end: 100 },
  { type: 'slider', height: 16, bottom: 22, start: 0, end: 100,
    borderColor: t.line, fillerColor: t.c1 + '33', handleStyle: { color: t.c1 }, textStyle: { color: t.subtle } },
];
const yValueAxis = (yField: string, t: Tokens) => ({
  type: 'value' as const, name: unitName(yField), nameLocation: 'end' as const, nameGap: 10,
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
    yAxis: yValueAxis(yField, t),
    dataZoom: zoom ? zoomBars(t, pairs.length) : undefined,
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

function choropleth(pairs: Pairs, { panel, yField, t }: BuildCtx) {
  const vals = pairs.map((p) => p.value);
  // computed rank by value desc (the DB rank column is unreliable)
  const ranked = pairs.slice().sort((a, b) => b.value - a.value);
  const rankOf = new Map(ranked.map((p, i) => [p.key, i + 1]));
  const byKey = new Map(pairs.map((p) => [p.key, p.value]));
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
      data: pairs.map((p) => ({ name: p.key, value: p.value })),
    }],
  };
}

type Series = { name: string; data: number[] }[];

// shared frame for multi-series time charts (stacked + multi-line)
const multiSeriesFrame = (xs: string[], yField: string, t: Tokens, agg: string | undefined, zoom: boolean) => ({
  backgroundColor: 'transparent',
  textStyle: { fontFamily: t.mono, color: t.subtle },
  // extra top room so the y-axis unit name clears the legend above it
  grid: { left: 8, right: 16, top: 58, bottom: zoom ? 60 : 28, containLabel: true },
  legend: { type: 'scroll' as const, top: 6, textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 },
    inactiveColor: t.line, pageTextStyle: { color: t.subtle } },
  tooltip: { trigger: 'axis' as const, valueFormatter: (v: number) => fmt(yField, v) },
  xAxis: xTimeAxis(xs, t, agg),
  yAxis: yValueAxis(yField, t),
  dataZoom: zoom ? zoomBars(t, xs.length) : undefined,
});

function stacked(type: 'area' | 'bar', xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false) {
  const pal = t.palette;
  return {
    ...multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis),
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
function multiline(xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false) {
  const pal = t.palette;
  return {
    ...multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis),
    series: series.map((s, i) => {
      const color = seriesColor(pal, i, s.name, t);
      return {
        name: s.name, type: 'line' as const, smooth: true, showSymbol: false, connectNulls: true,
        lineStyle: { width: 2, color }, itemStyle: { color }, emphasis: { focus: 'series' },
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
  const hi = enc.highlight;
  const richFor = (on: boolean) => ({
    n: { color: on ? t.text : t.subtle, fontFamily: t.mono, fontSize: 11, lineHeight: 14, fontWeight: on ? 600 : 400 },
    v: { color: t.subtle, fontFamily: t.mono, fontSize: 10, lineHeight: 13 },
  });
  // left side = the `y` measure shown as a crore count; right side = the `y2`
  // measure (a rupee value). Both go through fmt so they track the unit toggle.
  const countStr = (v: number) => fmt('volume_cr', v / 10); // vol in millions → crore txns
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
      { text: 'BY COUNT', left: 14, top: 4, textStyle: head },
      { text: 'BY VALUE', right: 14, top: 4, textStyle: head },
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
  const hi = enc.highlight;
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
export function buildPanel(panel: PanelSpec, rows: Row[], ctrl: CtrlState, t: Tokens) {
  const chartCtl = panel.controls?.find((c) => c.affects === 'chart');
  const type = (chartCtl ? one(ctrl[chartCtl.id]) : panel.chart) as PanelSpec['chart'];
  // period control drives D/M/Q/Y; with no control but a temporal x (date/month),
  // default to monthly so the axis still formats as a time series (story charts).
  const agg = panel.encoding.period ? one(ctrl[panel.encoding.period])
    : panel.encoding.x === 'date' || panel.encoding.x === 'month' ? 'M' : undefined;

  if (type === 'dual') return dualAxis(rows, panel, ctrl, t);
  if (type === 'slope') return slope(rows, panel, ctrl, t);
  if (type === 'bump') return bump(rows, panel, ctrl, t);
  if (panel.encoding.series && (type === 'area' || type === 'bar')) {
    const { xs, series, yField } = resolveSeries(rows, panel.encoding, ctrl);
    return stacked(type, xs, series, yField, t, agg, panel.staticAxis);
  }
  if (panel.encoding.series && type === 'line') {
    const { xs, series, yField } = resolveSeries(rows, panel.encoding, ctrl);
    return multiline(xs, series, yField, t, agg, panel.staticAxis);
  }
  if (type === 'donut') {
    const lim = typeof panel.encoding.limit === 'string'
      ? +(one(ctrl[panel.encoding.limit.slice(1)]) || 0) : panel.encoding.limit;
    const { pairs, yField } = resolve(rows, { ...panel.encoding, sort: 'desc', limit: undefined }, ctrl);
    return donut(groupOther(pairs, lim), { panel, yField, t });
  }

  const { pairs, yField } = resolve(rows, panel.encoding, ctrl);
  const ctx: BuildCtx = { panel, yField, t };
  if (type === 'choropleth') return choropleth(pairs, ctx);
  if (type === 'bar' && panel.encoding.horizontal) return horizontalBar(pairs, ctx);
  return lineOrBar(type === 'bar' ? 'bar' : 'line', pairs, ctx, agg);
}

// Stat tiles (chart:'stat') — computed over the filtered window, returned as
// a {value,label} pair the renderer drops into an HTML tile (not ECharts).
export function computeStat(panel: PanelSpec, rows: Row[], ctrl: CtrlState) {
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
