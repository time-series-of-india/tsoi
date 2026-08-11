// Charts for /independence ("The line at 1947").
//
// The page draws seven charts across five panels, and its entire argument rests
// on them being the SAME chart with different data in it: one timeline, 1858 to
// 2026, with the rule at 1947 landing on the same pixel every time. So there is
// exactly one option factory here, `baseOption()`, and no builder is allowed to
// touch grid, xAxis or the year rules directly. If a chart ever drifts out of
// alignment it will be because something bypassed this file's one door, not
// because a margin was tuned in two places.
//
// Deliberately NOT the dashboards runtime (src/lib/dashboards/runtime.ts): that
// module solves spec-driven panels over DB-generated series with unit toggles
// and control state, none of which applies here. What is borrowed is its
// idioms: read design tokens off the document with getComputedStyle, re-render
// on the data-theme MutationObserver, resize with a ResizeObserver.
import * as echarts from 'echarts';
import type {
  BarSeriesOption,
  EChartsOption,
  EChartsType,
  GridComponentOption,
  LineSeriesOption,
  MarkLineComponentOption,
  MarkPointComponentOption,
  TooltipComponentFormatterCallbackParams,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';
import { dataUrl } from '../data-url';

/* ------------------------------------------------------------------ data --- */

export type Point = [number, number];

export interface PanelSeries {
  id: string;
  entity: string;
  label?: string;
  unit?: string;
  /** Temperature only: the reference period the anomaly is measured against. */
  baseline?: string;
  points: Point[];
}

export interface PanelData {
  panel: string;
  updated: string;
  series: PanelSeries[];
}

const PANELS = ['economy', 'demographics', 'environment', 'infrastructure', 'governance'] as const;
export type PanelId = (typeof PANELS)[number];

/* ---------------------------------------------------------------- tokens --- */

export interface Tokens {
  text: string;
  subtle: string;
  line: string;
  lineVariant: string;
  surface: string;
  mono: string;
  c1: string;
  c2: string;
  c4: string;
  c5: string;
  c6: string;
  c1text: string;
  c2text: string;
  c6text: string;
  kharif: string;
}

/** Design tokens, read live off :root so both themes come for free. */
export function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    text: v('--tsoi-color-on-surface'),
    subtle: v('--tsoi-color-on-surface-variant'),
    line: v('--tsoi-color-outline'),
    lineVariant: v('--tsoi-color-outline-variant'),
    surface: v('--tsoi-color-surface'),
    mono: v('--tsoi-font-mono'),
    c1: v('--tsoi-color-chart-1'),
    c2: v('--tsoi-color-chart-2'),
    c4: v('--tsoi-color-chart-4'),
    c5: v('--tsoi-color-chart-5'),
    c6: v('--tsoi-color-chart-6'),
    c1text: v('--tsoi-color-chart-1-text') || v('--tsoi-color-chart-1'),
    c2text: v('--tsoi-color-chart-2-text') || v('--tsoi-color-chart-2'),
    c6text: v('--tsoi-color-chart-6-text') || v('--tsoi-color-chart-6'),
    kharif: v('--tsoi-color-season-kharif'),
  };
}

/* ------------------------------------------------------- shared invariant --- */

/** The frame. 89 years of Crown rule, the rule, 79 years of the republic. */
export const AXIS_MIN = 1858;
export const AXIS_MAX = 2026;
export const RULE_YEAR = 1947;
/** Quiet century markers either side of the rule. */
const SECONDARY_YEARS = [1900, 2000];

/** Margins narrow below this width. They stay identical across all charts at
 *  any one viewport, which is what the invariant actually requires. */
const NARROW_AT = 768;

function isNarrow(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < NARROW_AT;
}

function reduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The grid, and the only place it is defined. containLabel MUST stay false:
 * with it on, ECharts sizes the plot around whatever the axis labels happen to
 * measure, so two charts with different y-label widths silently disagree about
 * where 1947 is.
 */
function sharedGrid(): GridComponentOption {
  return isNarrow()
    ? { left: 40, right: 44, top: 28, bottom: 26, containLabel: false }
    : { left: 48, right: 56, top: 28, bottom: 26, containLabel: false };
}

/**
 * The x-axis, and the only place it is defined. `interval` is the full span so
 * the only two ticks ECharts can produce are the endpoints; 1900, 1947 and 2000
 * are labelled by the rule markLines instead, which is what lets 1947 read
 * stronger than its neighbours.
 */
function sharedXAxis(t: Tokens, showYears: boolean): XAXisComponentOption {
  return {
    type: 'value',
    min: AXIS_MIN,
    max: AXIS_MAX,
    interval: AXIS_MAX - AXIS_MIN,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: showYears
      ? {
          show: true,
          color: t.subtle,
          fontFamily: t.mono,
          fontSize: 9,
          margin: 9,
          formatter: (value: number) => String(value),
        }
      : { show: false },
  };
}

function sharedYAxis(t: Tokens, cfg: PanelAxis): YAXisComponentOption {
  return {
    type: 'value',
    min: cfg.yMin ?? 0,
    max: cfg.yMax,
    interval: cfg.yInterval,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: true, lineStyle: { color: t.lineVariant, type: 'dashed', width: 1 } },
    axisLabel: {
      color: t.subtle,
      fontFamily: t.mono,
      fontSize: 10,
      margin: 8,
      formatter: (value: number) => cfg.yFormat(value),
    },
  };
}

type RulePos = 'start' | 'middle' | 'end' | 'insideStartTop' | 'insideStartBottom' | 'insideEndTop' | 'insideEndBottom';

/** A dashed horizontal reference (the world's 1950 energy level; the 33% seat reservation). */
export interface HRule {
  y: number;
  label: string;
  pos?: RulePos;
}

/**
 * Every year rule on the page, carried by an empty series so it never depends
 * on which data series a chart happens to have. On stacked strands the top two
 * drop the labels and keep the lines, so the rule still runs through all three.
 */
function ruleSeries(t: Tokens, cfg: PanelAxis): LineSeriesOption {
  const data: NonNullable<MarkLineComponentOption['data']> = [];

  for (const year of SECONDARY_YEARS) {
    data.push({
      xAxis: year,
      lineStyle: { color: t.line, type: 'dotted', width: 1, opacity: 0.9 },
      label: cfg.showYears
        ? {
            show: true,
            formatter: String(year),
            position: 'start',
            distance: 5,
            color: t.subtle,
            fontFamily: t.mono,
            fontSize: 9,
          }
        : { show: false },
    });
  }

  // The rule. Same x on every chart, drawn on every chart, labelled wherever
  // years are shown, because on mobile each chart is read alone.
  data.push({
    xAxis: RULE_YEAR,
    lineStyle: { color: t.text, type: 'solid', width: 1, opacity: 0.5 },
    label: cfg.showYears
      ? {
          show: true,
          formatter: String(RULE_YEAR),
          position: 'start',
          distance: 5,
          color: t.text,
          fontFamily: t.mono,
          fontSize: 9,
          fontWeight: 500,
        }
      : { show: false },
  });

  if (cfg.zeroLine) {
    data.push({
      yAxis: 0,
      lineStyle: { color: t.line, type: 'solid', width: 1 },
      label: { show: false },
    });
  }

  for (const h of cfg.hRules ?? []) {
    data.push({
      yAxis: h.y,
      lineStyle: { color: t.subtle, type: 'dashed', width: 1, opacity: 0.75 },
      label: {
        show: true,
        formatter: h.label,
        position: h.pos ?? 'insideStartTop',
        distance: 4,
        color: t.subtle,
        fontFamily: t.mono,
        fontSize: 9,
      },
    });
  }

  return {
    type: 'line',
    name: '',
    data: [],
    silent: true,
    animation: false,
    tooltip: { show: false },
    markLine: {
      silent: true,
      symbol: 'none',
      animation: false,
      emphasis: { disabled: true },
      data,
    },
  };
}

/* --------------------------------------------------------------- tooltip --- */

interface AxisParam {
  seriesName?: string;
  color?: string;
  value?: unknown;
  axisValue?: number | string;
}

function tooltipFormatter(t: Tokens, fmt: (v: number) => string) {
  return (raw: TooltipComponentFormatterCallbackParams): string => {
    const rows = (Array.isArray(raw) ? raw : [raw]) as AxisParam[];
    const shown = rows.filter((r) => r.seriesName && Array.isArray(r.value));
    if (!shown.length) return '';
    const head = Math.round(Number(shown[0].axisValue ?? (shown[0].value as number[])[0]));
    const body = shown
      .map((r) => {
        const pair = r.value as number[];
        const year = Math.round(pair[0]);
        const stamp = year === head ? '' : `<span style="opacity:.6"> ${year}</span>`;
        return (
          `<div style="display:flex;gap:10px;justify-content:space-between">` +
          `<span style="color:${r.color ?? t.text}">${escapeHtml(r.seriesName ?? '')}${stamp}</span>` +
          `<span style="font-weight:500">${escapeHtml(fmt(pair[1]))}</span>` +
          `</div>`
        );
      })
      .join('');
    return `<div style="font-weight:600;margin-bottom:3px">${head}</div>${body}`;
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/* ------------------------------------------------------ the one factory --- */

export interface PanelAxis {
  /** y floor; defaults to 0. */
  yMin?: number;
  yMax: number;
  yInterval: number;
  yFormat: (v: number) => string;
  /** Bottom year labels. Only the lowest chart of a stack shows them. */
  showYears: boolean;
  /** Solid rule at y=0 (temperature and drought, which are signed). */
  zeroLine?: boolean;
  /** Dashed horizontal references. */
  hRules?: HRule[];
  /** Tooltip value formatter; defaults to the axis formatter. */
  tipFormat?: (v: number) => string;
}

/**
 * The single door every chart on this page goes through. Callers supply only
 * their y-axis and their data series; grid, x-axis, year rules, tooltip and
 * animation policy are decided here so they cannot drift apart chart to chart.
 */
export function baseOption(
  t: Tokens,
  cfg: PanelAxis,
  series: (LineSeriesOption | BarSeriesOption)[],
): EChartsOption {
  const animate = !reduceMotion();
  return {
    animation: animate,
    animationDuration: 500,
    animationEasing: 'cubicOut',
    grid: sharedGrid(),
    xAxis: sharedXAxis(t, cfg.showYears),
    yAxis: sharedYAxis(t, cfg),
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', lineStyle: { color: t.subtle, width: 1, type: 'dashed' } },
      backgroundColor: t.surface,
      borderColor: t.line,
      borderWidth: 1,
      borderRadius: 2,
      padding: [6, 8],
      extraCssText: 'box-shadow:none',
      textStyle: { color: t.text, fontFamily: t.mono, fontSize: 11 },
      formatter: tooltipFormatter(t, cfg.tipFormat ?? cfg.yFormat),
    },
    series: [...series, ruleSeries(t, cfg)],
  };
}

/* ---------------------------------------------------------------- series --- */

/** A value called out against the rule (the AEI reference-marker treatment). */
export interface Callout {
  year: number;
  value: number;
  text: string;
  pos?: 'top' | 'bottom' | 'left' | 'right';
}

interface LineCfg {
  name: string;
  points: Point[];
  color: string;
  /** Text-safe cast for the end label, where the palette has one. */
  labelColor?: string;
  /** India is always the heavy saffron line. */
  primary?: boolean;
  callouts?: Callout[];
}

function lineFor(t: Tokens, cfg: LineCfg): LineSeriesOption {
  const s: LineSeriesOption = {
    type: 'line',
    name: cfg.name,
    data: cfg.points,
    symbol: 'none',
    showSymbol: false,
    // The pre-series-start region is empty axis, never zero: the unequal
    // starts are information, so nothing is padded or back-filled.
    connectNulls: false,
    lineStyle: { width: cfg.primary ? 2.5 : 1.25, opacity: cfg.primary ? 1 : 0.8 },
    itemStyle: { color: cfg.color },
    emphasis: { disabled: true },
    endLabel: {
      show: true,
      formatter: () => cfg.name,
      color: cfg.labelColor ?? cfg.color,
      fontFamily: t.mono,
      fontSize: 10,
      distance: 6,
    },
    z: cfg.primary ? 4 : 3,
  };
  if (cfg.callouts?.length) s.markPoint = calloutPoints(t, cfg.color, cfg.callouts);
  return s;
}

function calloutPoints(t: Tokens, color: string, callouts: Callout[]): MarkPointComponentOption {
  const data: NonNullable<MarkPointComponentOption['data']> = callouts.map((c) => ({
    name: c.text,
    coord: [c.year, c.value],
    label: {
      show: true,
      formatter: c.text,
      position: c.pos ?? 'top',
      distance: 7,
      color: t.text,
      fontFamily: t.mono,
      fontSize: 10,
      fontWeight: 500,
    },
  }));
  return {
    silent: true,
    animation: false,
    symbol: 'circle',
    symbolSize: 5,
    itemStyle: { color },
    data,
  };
}

/* -------------------------------------------------------------- helpers --- */

function pick(d: PanelData, id: string, entity = 'India'): PanelSeries | undefined {
  return d.series.find((s) => s.id === id && s.entity === entity);
}

function at(s: PanelSeries | undefined, year: number): number | undefined {
  return s?.points.find((p) => p[0] === year)?.[1];
}

function last(s: PanelSeries | undefined): Point | undefined {
  return s && s.points.length ? s.points[s.points.length - 1] : undefined;
}

const group = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

const kilo = (v: number) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : String(v));
const dollars = (v: number) => (Math.abs(v) >= 1000 ? `$${v / 1000}k` : `$${v}`);
const pct = (v: number) => `${group(v, Number.isInteger(v) ? 0 : 1)}%`;
const tonnes = (v: number) => `${group(v, Number.isInteger(v) ? 0 : 1)}t`;
const degrees = (v: number) => `${v > 0 ? '+' : ''}${group(v, Number.isInteger(v) ? 0 : 1)}°C`;
// SPEI is a z-score: it carries no unit, and trailing zeroes on the axis would
// only imply a precision it does not have.
const zscore = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 2 });

/* -------------------------------------------------------------- builders --- */

function buildEconomy(d: PanelData, t: Tokens): EChartsOption {
  const india = pick(d, 'gdp_pc');
  const end = last(india);
  const v1947 = at(india, RULE_YEAR);
  const callouts: Callout[] = [];
  if (v1947 !== undefined) callouts.push({ year: RULE_YEAR, value: v1947, text: `$${group(v1947)}`, pos: 'top' });
  if (end) callouts.push({ year: end[0], value: end[1], text: `$${group(Math.round(end[1]))}`, pos: 'left' });

  return baseOption(
    t,
    {
      yMax: 8000,
      yInterval: 2000,
      yFormat: dollars,
      tipFormat: (v) => `$${group(Math.round(v))}`,
      showYears: true,
    },
    india ? [lineFor(t, { name: 'India', points: india.points, color: t.c1, labelColor: t.c1text, primary: true, callouts })] : [],
  );
}

function buildDemographics(d: PanelData, t: Tokens): EChartsOption {
  const india = pick(d, 'child_mortality');
  const china = pick(d, 'child_mortality', 'China');
  const v1911 = at(india, 1911);
  const end = last(india);
  const callouts: Callout[] = [];
  if (v1911 !== undefined) callouts.push({ year: 1911, value: v1911, text: `${Math.round(v1911)}%`, pos: 'right' });
  if (end) callouts.push({ year: end[0], value: end[1], text: `${group(end[1], 1)}%`, pos: 'top' });

  const series: LineSeriesOption[] = [];
  // Comparator first so India draws over it.
  if (china) series.push(lineFor(t, { name: 'China', points: china.points, color: t.c6, labelColor: t.c6text }));
  if (india) series.push(lineFor(t, { name: 'India', points: india.points, color: t.c1, labelColor: t.c1text, primary: true, callouts }));

  return baseOption(t, { yMax: 35, yInterval: 10, yFormat: pct, showYears: true }, series);
}

function buildCo2(d: PanelData, t: Tokens): EChartsOption {
  const order: Array<[string, string, string, string]> = [
    ['World', 'World', t.c2, t.c2text],
    ['United States', 'USA', t.c4, t.c4],
    ['China', 'China', t.c6, t.c6text],
  ];
  const series: LineSeriesOption[] = [];
  for (const [entity, name, color, labelColor] of order) {
    const s = pick(d, 'co2_pc', entity);
    if (s) series.push(lineFor(t, { name, points: s.points, color, labelColor }));
  }
  const india = pick(d, 'co2_pc');
  if (india) series.push(lineFor(t, { name: 'India', points: india.points, color: t.c1, labelColor: t.c1text, primary: true }));

  // yMax 24, not the 2024 values' neighbourhood: the US line peaked at 22.2 t
  // in 1973 and must not clip — the fall from that peak is part of the story.
  // Tooltip precision adapts downward: 19th-century India is 0.002 t, and the
  // 1-decimal axis format would show it as a false "0.0t".
  const tipTonnes = (v: number) =>
    `${v.toLocaleString('en-US', { maximumSignificantDigits: v < 0.1 ? 1 : 3 })}t`;
  return baseOption(t, { yMax: 24, yInterval: 8, yFormat: tonnes, tipFormat: tipTonnes, showYears: false }, series);
}

function buildTemp(d: PanelData, t: Tokens): EChartsOption {
  const india = pick(d, 'temp_anomaly');
  return baseOption(
    t,
    { yMin: -1.5, yMax: 1.5, yInterval: 1.5, yFormat: degrees, showYears: false, zeroLine: true },
    india ? [lineFor(t, { name: 'India', points: india.points, color: t.c5, primary: true })] : [],
  );
}

function buildDrought(d: PanelData, t: Tokens): EChartsOption {
  const spei = pick(d, 'spei4_sep');
  const points = spei?.points ?? [];

  // The five deepest monsoon failures, taken from the data rather than
  // assumed (the generator validates they are 1918, 1965, 1972, 1987, 2002 —
  // the years the prose names). A phone-width plot cannot seat five labels
  // without collisions, so narrow viewports keep the three the argument
  // hangs on: the pre-independence failure and the two famous later ones.
  const all = [...points].sort((a, b) => a[1] - b[1]).slice(0, 5);
  const deepest = isNarrow() ? all.filter(([y]) => [1918, 1965, 2002].includes(y)) : all;
  const bars: BarSeriesOption = {
    type: 'bar',
    name: 'SPEI-4',
    barWidth: 3,
    barMinWidth: 2,
    data: points.map(([year, value]) => ({
      value: [year, value],
      itemStyle: { color: value < 0 ? t.c6 : t.kharif, opacity: 0.9 },
    })),
    emphasis: { disabled: true },
    markPoint: {
      silent: true,
      animation: false,
      // The label is the whole point; the marker itself would only sit on top
      // of a bar that already reads. symbol 'none' suppresses the label too,
      // and itemStyle.opacity cascades to the label in ECharts, so the symbol
      // is kept and given a transparent fill instead.
      symbol: 'circle',
      symbolSize: 1,
      itemStyle: { color: 'rgba(0, 0, 0, 0)' },
      data: deepest.map(([year, value]) => ({
        name: String(year),
        // Clamp the label anchor above the plot floor: the deepest bars reach
        // past -2.5, and a label hung below their true tip lands on the
        // x-axis year row.
        coord: [year, Math.max(value, -2.2)],
        label: {
          show: true,
          formatter: String(year),
          position: 'bottom',
          distance: 3,
          color: t.subtle,
          fontFamily: t.mono,
          fontSize: 9,
        },
      })),
    },
  };

  return baseOption(
    t,
    { yMin: -3, yMax: 3, yInterval: 3, yFormat: zscore, showYears: true, zeroLine: true },
    [bars],
  );
}

function buildInfrastructure(d: PanelData, t: Tokens): EChartsOption {
  const series: LineSeriesOption[] = [];
  const order: Array<[string, string, string, string]> = [
    ['United States', 'USA', t.c4, t.c4],
    ['World', 'World', t.c2, t.c2text],
  ];
  for (const [entity, name, color, labelColor] of order) {
    const s = pick(d, 'energy_pc', entity);
    if (s) series.push(lineFor(t, { name, points: s.points, color, labelColor }));
  }
  const india = pick(d, 'energy_pc');
  const end = last(india);
  const callouts: Callout[] = end ? [{ year: end[0], value: end[1], text: group(Math.round(end[1])), pos: 'top' }] : [];
  if (india) series.push(lineFor(t, { name: 'India', points: india.points, color: t.c1, labelColor: t.c1text, primary: true, callouts }));

  // The world's own 1950 level, taken from the data: India is still under it.
  const world1950 = at(pick(d, 'energy_pc', 'World'), 1950);
  const hRules: HRule[] = world1950 !== undefined ? [{ y: world1950, label: 'world average, 1950', pos: 'insideStartTop' }] : [];

  return baseOption(
    t,
    // US primary energy peaked at 93,272 kWh/person (1970s); 100k keeps it in frame.
    { yMax: 100000, yInterval: 25000, yFormat: kilo, tipFormat: (v) => `${group(Math.round(v))} kWh`, showYears: true, hRules },
    series,
  );
}

function buildGovernance(d: PanelData, t: Tokens): EChartsOption {
  const india = pick(d, 'women_parliament');
  const v2019 = at(india, 2019);
  const v2024 = at(india, 2024);
  const callouts: Callout[] = [];
  if (v2019 !== undefined) callouts.push({ year: 2019, value: v2019, text: `${group(v2019, 1)}%`, pos: 'top' });
  if (v2024 !== undefined) callouts.push({ year: 2024, value: v2024, text: `${group(v2024, 1)}%`, pos: 'bottom' });

  return baseOption(
    t,
    {
      yMax: 35,
      yInterval: 10,
      yFormat: pct,
      showYears: true,
      hRules: [{ y: 33, label: 'reserved by law, date not set', pos: 'insideStartBottom' }],
    },
    india ? [lineFor(t, { name: 'India', points: india.points, color: t.c1, labelColor: t.c1text, primary: true, callouts })] : [],
  );
}

/** Mount key (`data-chart`) → builder. Env strands are three charts, one panel.
 *  Exported so the option objects can be built and rendered headlessly. */
export const BUILDERS: Record<string, (d: PanelData, t: Tokens) => EChartsOption> = {
  economy: buildEconomy,
  demographics: buildDemographics,
  'environment-co2': buildCo2,
  'environment-temp': buildTemp,
  'environment-drought': buildDrought,
  infrastructure: buildInfrastructure,
  governance: buildGovernance,
};

/* ------------------------------------------------------------------ init --- */

interface Live {
  chart: EChartsType;
  build: () => EChartsOption;
}

/**
 * Reads the temperature strand's baseline out of the JSON and writes it into
 * the strand label, because an anomaly figure without its reference period is
 * the easiest way for this page to be wrong in public.
 */
function applyBaseline(el: HTMLElement, d: PanelData): void {
  const s = d.series.find((x) => x.id === 'temp_anomaly');
  if (!s?.baseline) return;
  const label = document.querySelector<HTMLElement>('[data-baseline-slot]');
  if (label) label.textContent = s.baseline;
  el.setAttribute('data-baseline', s.baseline);
}

export function initIndependenceCharts(): void {
  const mounts = Array.from(document.querySelectorAll<HTMLElement>('[data-chart]'));
  if (!mounts.length) return;

  const cache = new Map<string, Promise<PanelData>>();
  const load = (panel: string): Promise<PanelData> => {
    let p = cache.get(panel);
    if (!p) {
      p = fetch(dataUrl(`/data/independence/${panel}.json`)).then((r) => {
        if (!r.ok) throw new Error(`independence: ${panel}.json ${r.status}`);
        return r.json() as Promise<PanelData>;
      });
      cache.set(panel, p);
    }
    return p;
  };

  const live: Live[] = [];
  const renderAll = () => {
    for (const l of live) l.chart.setOption(l.build(), true);
  };

  // A box with no layout yet cannot be measured, so wait for one rather than
  // initialising into a zero-width canvas.
  const whenSized = (el: HTMLElement, go: () => void) => {
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      go();
      return;
    }
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        ro.disconnect();
        go();
      }
    });
    ro.observe(el);
  };

  const mount = (el: HTMLElement) => {
    const panel = el.dataset.panel;
    const key = el.dataset.chart;
    if (!panel || !key) return;
    const builder = BUILDERS[key];
    if (!builder) return;
    load(panel)
      .then((data) => {
        if (key === 'environment-temp') applyBaseline(el, data);
        whenSized(el, () => {
          const chart = echarts.init(el);
          const build = () => builder(data, readTokens());
          chart.setOption(build());
          live.push({ chart, build });
          new ResizeObserver(() => chart.resize()).observe(el);
          void document.fonts?.ready.then(() => chart.setOption(build(), true));
        });
      })
      .catch((err: unknown) => {
        // A missing dataset must not take the page's prose down with it.
        console.error(err);
      });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          mount(e.target as HTMLElement);
        }
      },
      { rootMargin: '300px 0px' },
    );
    for (const el of mounts) io.observe(el);
  } else {
    for (const el of mounts) mount(el);
  }

  new MutationObserver(renderAll).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // A finger scrolling past a chart opens its axis tooltip and nothing ever
  // closes it, so the page dismisses every tip on scroll. Passive: it must
  // never cost frames on the reading path.
  window.addEventListener(
    'scroll',
    () => {
      for (const l of live) l.chart.dispatchAction({ type: 'hideTip' });
    },
    { passive: true },
  );

  // Crossing the narrow breakpoint changes the shared margins, so every chart
  // has to be rebuilt together. Resizing one alone would break the alignment.
  let narrow = isNarrow();
  window.addEventListener('resize', () => {
    const now = isNarrow();
    if (now !== narrow) {
      narrow = now;
      renderAll();
    }
  });
}
