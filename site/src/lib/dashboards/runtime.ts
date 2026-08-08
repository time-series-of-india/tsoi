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
  yLabels?: Record<string, string>; // one label per measure, where `y` is "@controlId":
                   // a panel that switches between an index and a rate cannot carry a
                   // single axis name without one of the two readings being mislabelled
  y2Label?: string; // legend name for the y2 series
  where?: Record<string, string>; // constant field=value filters (not control-driven) — lets one dataset hold multiple entity kinds
  filters?: string[]; // control ids whose values filter rows on the same-named field.
                      // 'controlId>rowField' filters a DIFFERENTLY-named field, for
                      // the case where one row column can be driven by more than one
                      // control (the state desk reads its `code_name` from whichever
                      // of its two pickers is in charge — see DashboardSpec.derived)
  timeRange?: string; // control id giving a range TOKEN (see resolveRange): a month count,
                      // 'ytd'/'fy', or an absolute 'YYYY-MM~YYYY-MM' window (0/'' = all)
  period?: string; // control id giving the aggregation bucket (D/M/Q/Y) for the x date field
  aggregate?: 'sum' | 'avg'; // how to combine rows in a bucket — sum (default) or mean (rates: %)
  latest?: boolean; // restrict to the single latest month after filtering
  sort?: 'asc' | 'desc';
  extremes?: number; // keep the n largest AND the n smallest, dropping the middle.
                   // A ranking of 358 items is a ranking nobody reads; the two ends
                   // of it are the question. Not a `limit`, which only ever keeps
                   // one end and would turn "what moved" into "what rose"
  limit?: number | string; // number, or "@controlId" for a top-N control
  rankBy?: string; // pick the top-N by THIS field, but plot `y` (e.g. biggest
                   // banks by volume, shown by their decline rate)
  highlight?: string[] | string; // keys to colour as primary (the rest recede);
                   // "@controlId" reads the single highlighted key from a live control
  highlightMember?: string; // strips only: accent one MEMBER (e.g. a state) across
                   // every row instead of a whole row; "@controlId" reads it live
  memberLabel?: string; // strips only: the field a member READS as, where the field it
                   // is keyed by is a join key (a map region) rather than a name
  facet?: 'food'; // strips only: split into small multiples by food family, each with
                   // its own ×-the-median axis. Without it the swarm is one grid in
                   // the y field's own unit
  referenceSeries?: string; // multi-line: the series the others are measured against
                   // (the headline among its divisions) — drawn dashed in ink rather
                   // than taking a palette hue, so it reads as the benchmark it is
  events?: Record<string, string>; // a constant field=value scope (same shape as `where`)
                   // selecting rows that carry a `date` and a `label`: sparse dated marks
                   // annotating a long line. Quieter than anything that caveats the data,
                   // because that is the difference — a seam qualifies the numbers, an
                   // event only says what month a reader is looking at
  referenceBand?: Record<string, string>; // a constant field=value scope (same shape
                   // as `where`) selecting the ONE row that carries a target band:
                   // `lo`, `hi`, an optional `mid` rule and an optional `from` month
                   // the band starts at. Drawn behind the line as a faint area with a
                   // dashed rule at the middle — the RBI's 4% ± 2, here, but the chart
                   // knows only that a band was declared and where its numbers live
  filtersKeep?: Record<string, string[]>; // values a `filters` control never excludes:
                   // the headline stays on a divisions chart whichever divisions are
                   // picked, without the picker having to offer it as a division
  seriesInclude?: string[]; // multi-line: keep only these series; entries may be
                   // "@controlId" tokens (resolved live) or literal series names
  tooltipFields?: { field: string; label: string }[]; // stacked bars: extra fields read
                   // off the SOURCE row behind a bar (its weight, its own rate), so a
                   // hover explains the segment rather than only measuring it
  markWhen?: string; // choropleth: a truthy row field that marks a region as
                   // qualified (e.g. an imputed reading) — drawn as a dashed outline
  coverage?: string; // time chart: a footnote about how much of the series exists,
                   // rendered under the plot. '{n}' becomes the number of periods
                   // drawn and '{from}' the first one, so the sentence counts the
                   // data rather than repeating a number someone typed
  colorBy?: 'food' | 'division'; // stable per-entity colours (see foodLine /
                   // divisionLine) instead of slot-in-selection palette order.
                   // Read by the multi-line AND the stacked path, so two panels
                   // colouring by two different name fields — one by a division's
                   // own name, one by its series name — still give one division
                   // one colour on one desk
  emphasis?: string; // divbars: the ONE member to pick out of a ranking, as a
                   // literal or an "@controlId" token. Where it is not among
                   // the bars drawn, nothing changes
  emphasisKey?: string; // the SOURCE row field `emphasis` is matched on, where the
                   // bars are keyed by something else (a name against a code)
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
  labelField?: string; // a SECOND dataset column carrying each option's display name, for
                   // controls whose value has to be a key rather than a name: the state
                   // picker holds the map's own upper-case region (so the map, the series
                   // and the click all agree) while reading as "Kerala", and the item
                   // picker holds a COICOP code while reading as "Tomato". Options are
                   // then ordered by the label, which is what the reader scans
  dependsOn?: string[]; // cascading: option list filtered by these controls' values
  cascadeOrAll?: boolean; // a cascade that would leave NO options leaves them ALL.
                   // The state desk's item picker narrows to the division the Series
                   // select is on; the headline is not a division, so under it the
                   // narrowing has nothing to narrow to and the picker offers every
                   // item. Without this the general case of "the parent control is
                   // not a parent of anything" is a picker with nothing in it
  where?: Record<string, string>; // constant field=value row scope applied when deriving this
                   // control's options from the dataset (same shape/semantics as Encoding.where) —
                   // lets a select/multiselect on a multi-entity-kind dataset see only its own kind
  options?: { value: string; label: string; group?: string }[];
  groupBy?: string; // select only: a dataset column whose value files each option under
                   // an <optgroup>. A picker that reaches two different KINDS of thing —
                   // the headline and its divisions, then a handful of individual items —
                   // is one list a reader cannot skim and two lists they can
  groupLabels?: Record<string, string>; // display name per group, and the order the
                   // groups appear in; a group not named here follows, under its own key
  liveOptions?: { // options this control can currently answer, read off the data rather
                  // than declared: an option no row in scope can serve is DISABLED, and a
                  // control down to one option is disabled whole. What makes an item on
                  // the state map turn off the sector switch, without either the item or
                  // the sector being named anywhere in the machinery
    where?: Record<string, string>; // constant row scope (same shape as Encoding.where)
    filters?: string[];             // control ids whose current values narrow the rows first
    by?: 'value' | 'field';         // an option names a VALUE of `field` (default), or a
                                    // FIELD the rows must carry (a measure toggle)
  };
  quick?: { value: string; label: string }[]; // daterange: quick-range presets (see resolveRange tokens)
  default: string | string[]; // array for multiselect
  defaultTop?: number; // multiselect: when entering a new scope, preselect the top-N by `rankBy`
  rankBy?: string; // measure field to rank options for `defaultTop` (default volume_cr)
  deadWhen?: { control: string; is: string }; // dim this control while another control
                   // says it is not in charge. Purely visual, unlike `liveOptions`,
                   // which disables the options the data cannot answer: the state
                   // desk's Series picker is not the subject under Item and still
                   // narrows the item list, so it must dim without going inert
  affects?: 'chart'; // a toggle whose value overrides the panel's chart type
  search?: boolean; // select only: past SEARCH_THRESHOLD options, upgrade the native
                   // select into a type-ahead combobox (see client.ts). A list of 358
                   // items is not a list anyone scrolls; a list of twelve is. The
                   // native select stays in the markup and is what a reader without
                   // JavaScript gets, so this only ever adds a way in
  info?: string; // hover description shown via the dotted-underline info tooltip
}

/** Options past which a `search` select is worth upgrading to a combobox. */
export const SEARCH_THRESHOLD = 30;

/**
 * A select's options in render order, split into <optgroup>s where the control
 * asks for them. Groups come out in the order `groupLabels` names them, so a
 * spec decides which heading leads; a group the spec did not name follows,
 * under its own key. A control with no `groupBy` gets one unlabelled group, so
 * both renderers — the build-time markup and the client's repopulate — walk the
 * same structure whether or not grouping is in play.
 */
export function optionGroups(c: Control): { label?: string; options: { value: string; label: string }[] }[] {
  const opts = c.options ?? [];
  if (!c.groupBy) return [{ options: opts }];
  const order = [...Object.keys(c.groupLabels ?? {})];
  for (const o of opts) if (o.group && !order.includes(o.group)) order.push(o.group);
  return order
    .map((g) => ({ label: c.groupLabels?.[g] ?? g, options: opts.filter((o) => o.group === g) }))
    .filter((g) => g.options.length > 0);
}

/**
 * Which of a control's options the rows in scope can currently answer.
 *
 * Two kinds of option, and the difference is what the option NAMES. A sector
 * toggle's options are values of a column: an option survives if some row
 * carries it. A measure toggle's options are columns: an option survives if
 * some row carries a reading in it. Either way the answer comes from the data,
 * so a desk that gains a series with no rural half turns its own sector switch
 * off without anything here knowing what a sector is.
 *
 * Returns undefined when the control declares no such rule, which is every
 * control that has always been able to answer everything.
 */
export function liveOptionValues(c: Control, rows: Row[], ctrl: CtrlState): Set<string> | undefined {
  const rule = c.liveOptions;
  if (!rule || !c.options?.length) return undefined;
  let r = rows;
  for (const [f, v] of Object.entries(rule.where ?? {})) r = r.filter((row) => String(row[f]) === v);
  for (const token of rule.filters ?? []) {
    const { ctl, field: f } = splitFilter(token);
    if (ctl === c.id) continue;
    const v = ctrl[ctl];
    if (Array.isArray(v)) { if (v.length) r = r.filter((row) => v.includes(String(row[f]))); }
    else if (v != null && v !== '') r = r.filter((row) => String(row[f]) === String(v));
  }
  const live = new Set<string>();
  if (rule.by === 'field') {
    for (const o of c.options) {
      if (r.some((row) => row[o.value] != null && row[o.value] !== '' && Number.isFinite(Number(row[o.value])))) live.add(o.value);
    }
  } else {
    const field = c.field ?? c.id;
    for (const row of r) live.add(String(row[field]));
  }
  return live;
}

/**
 * The rows a control's option list is drawn from: its constant scope, then each
 * cascade it declares.
 *
 * A cascade entry may name a differently-spelled field with the same
 * `'control>field'` form the encoding filters take — the state desk narrows a
 * list of items filed by DIVISION using a picker that holds a series NAME. And
 * where the control asks for it, a cascade that would leave nothing standing
 * narrows nothing at all: the parent is not a parent of anything here (the
 * headline is not a division), which is a different situation from a parent
 * with no children and must not read as an empty picker.
 */
export function cascadeRows(c: Control, rows: Row[], ctrl: CtrlState,
  fieldOf: (id: string) => string = (id) => id): Row[] {
  let r = rows;
  if (c.where) for (const [f, v] of Object.entries(c.where)) r = r.filter((row) => String(row[f]) === v);
  for (const dep of c.dependsOn ?? []) {
    const { ctl, field } = splitFilter(dep);
    const f = field === ctl ? fieldOf(ctl) : field;
    const narrowed = r.filter((row) => String(row[f]) === one(ctrl[ctl]));
    if (narrowed.length || !c.cascadeOrAll) r = narrowed;
  }
  return r;
}

/**
 * The values of a desk's derived controls, given the rest of its control state.
 * Each one holds whatever the control its switch selects currently holds; a
 * switch on a value the spec did not name resolves to nothing rather than to a
 * stale answer.
 */
export function derivedValues(derived: DashboardSpec['derived'], ctrl: CtrlState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of derived ?? []) {
    const src = d.cases[one(ctrl[d.from])];
    out[d.id] = src ? one(ctrl[src]) : '';
  }
  return out;
}

/**
 * The options a typed query leaves standing, in the order they should be
 * offered. Substring rather than prefix — a reader looking for "Wheat atta"
 * types "atta" — but a label that STARTS with the query comes first, so typing
 * "milk" offers "Milk: liquid" ahead of "Butter milk". Ties keep the list's own
 * order, which is alphabetical by label. An empty query changes nothing.
 */
export function filterOptions<T extends { value: string; label: string }>(options: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice();
  const hits: T[] = [];
  const rest: T[] = [];
  for (const o of options) {
    const label = o.label.toLowerCase();
    if (label.startsWith(q)) hits.push(o);
    else if (label.includes(q) || o.value.toLowerCase().includes(q)) rest.push(o);
  }
  return [...hits, ...rest];
}

export interface PanelSpec {
  id: string;
  title: string;
  chart: 'line' | 'bar' | 'area' | 'donut' | 'choropleth' | 'stat' | 'dual' | 'slope' | 'bump' | 'stair' | 'strips' | 'boxplot' | 'dotplot' | 'comptable' | 'spine' | 'contribbars' | 'divbars' | 'widget';
  encoding: Encoding;
  controls?: Control[];
  map?: string; // registered map name for choropleth
  widget?: string; // chart:'widget' — the hand-built figure this panel mounts
                   // instead of an ECharts option (see client.ts). The panel is
                   // a desk-shaped host for a read's own widget, not a new chart.
  wide?: boolean; // span the full panel grid (full-width row)
  staticAxis?: boolean; // time chart: show the full range, no zoom slider (editorial)
  stat?: 'avgDailyVolume' | 'avgDailyValue' | 'ticket' | 'totalVolume' | 'totalValue' | 'leadShare'
    | 'priceDelta' | 'statePrice' | 'cheapestDearest' | 'yoyStat'
    | 'cpiLatest' | 'cpiTopMover' | 'extreme' | 'countOf' | 'sinceEvent' | 'cpiItem';
  note?: string; // a caveat about THIS panel, rendered under its chart. The desk-level
                 // `note` heads the whole desk; a sentence that only qualifies one
                 // figure belongs against that figure instead of above five others
  noteFrom?: string[]; // dot paths into the raw dataset appended to `note` at build
                 // time, same contract as DashboardSpec.noteFrom
  accent?: 'primary' | 'ink' | 'teal' | 'item'; // the hue this panel's own figure is drawn in
                 // (and its stat tile's number). Panels that answer the same question
                 // in two units — the headline rate and the index behind it — are told
                 // apart by colour rather than by reading their titles twice
  selects?: string; // choropleth: the control id a click on a region sets. The map
                 // becomes the picker for whatever else on the desk reads that
                 // control (its own series panel, the scatter's accent)
  selectsBase?: string; // with `selects`, a value the picking happens ON TOP of:
                 // it survives a plain click, and un-picking the last region
                 // falls back to it rather than to an empty panel. The national
                 // line every state is compared against, in practice
  info?: string; // hover description shown via the dotted-underline info tooltip
}

export interface DashboardSpec {
  slug: string;
  section: string; // top-level nav section (economy, environment, …)
  theme: string; // subject cluster within the section (payments, food, …)
  title: string;
  description: string;
  dataset: string;
  shape?: string; // the dataset's own document shape, flattened to tidy rows by
                  // shapes.ts. Omit for the usual `{ rows: [...] }` generators.
  source?: string; // attribution caption rendered under the panels (legal load-bearing)
  note?: string; // user-visible data caveat (e.g. provisional weekend figures)
  noteFrom?: string[]; // dot paths into the RAW dataset document whose strings are
                  // appended to `note` at build time. For caveats that carry a
                  // measured number the generator owns (how coarse a rounded
                  // index makes its rates, say): the sentence then comes from
                  // the data instead of being typed here, and it renders as
                  // prose that wraps rather than as a chart annotation that clips.
  globals?: Control[];
  /**
   * Control values that are not chosen but WORKED OUT: `id` holds whatever the
   * control named by `cases[value of from]` currently holds. A desk with two
   * pickers and a switch saying which of them is in charge has one question its
   * panels want answered — which series are we on — and this is that answer,
   * computed once rather than by every encoding testing the switch itself.
   * Not rendered anywhere: it has no widget, only a value.
   */
  derived?: { id: string; from: string; cases: Record<string, string> }[];
  /**
   * Rows this desk fetches only when it needs them.
   *
   * A dataset that would be enormous whole can ship a small document per value
   * of one control instead. When that control changes, the client fetches the
   * named document, converts it with a registered shaper (see shapes.ts) and
   * REPLACES whatever the last fetch put in the desk's row pool, then redraws.
   * The URL is never built from a pattern: it is read off a row of the main
   * dataset, so the generator can content-hash each document and a rebuilt one
   * arrives under a name no cache has seen.
   */
  lazyRows?: {
    control: string;                  // the control whose value picks the document
    where?: Record<string, string>;   // row scope the lookup happens in
    match: string;                    // row field the control's value is matched on
    file: string;                     // row field carrying the document's filename
    base: string;                     // URL directory the filename hangs under
    shape: string;                    // registered shaper for the fetched document
  };
  panels: PanelSpec[];
}

// A BOARD is a page of desks: one subject (payments, food prices) worked
// through from several angles. Where a DashboardSpec describes one desk's
// panels, a BoardSpec describes the page around them — its bar title, the
// controls hoisted out of the desks to page level, and the desk running order.
// Data, like everything else here: two boards are two BoardSpecs rendered by
// one component, and a third subject is a third spec rather than a third copy.
export interface BoardDesk {
  dashboard: string; // slug of the DashboardSpec this desk renders
  anchor: string; // short anchor id for the jump nav and the URL hash, e.g. 'banks'
  title: string; // short desk title for the sticky bar, e.g. 'Bank performance'
  info: string; // one-sentence description for the title's tooltip
}

export interface BoardSpec {
  slug: string; // the board's own name — its page URL, and its fold-state key
  section: string;
  theme: string;
  title: string; // page-bar title, e.g. 'India Payments'
  globals?: Control[]; // controls hoisted to the page bar; a desk carrying a
                       // control of the same id has it dropped from its own bar
                       // and driven from up here instead
  desks: BoardDesk[];
}

export interface Tokens {
  text: string; subtle: string; line: string; surfaceDim: string;
  // The panel's own paper. A choropleth needs it for the regions with NO
  // reading: ECharts' default fill for those is a hardcoded near-white, which
  // is invisible on a light ground and glares on a dark one — and an item
  // priced in twelve states leaves two dozen of them blank.
  surface: string;
  mono: string; c1: string; c6: string;
  // The text-safe cast of chart-3, which is the hue the funnel's item floor
  // wears. Wherever an item is named rather than drawn — a bar's own label,
  // a tile's figure — it takes this instead, because the fill colours fall
  // below 4.5:1 as small type on the light surfaces.
  c3text: string;
  palette: string[]; // chart-1..6, for multi-series (stacked) and donut slices
}

// Read the live TSOI design tokens off :root (so charts track light/dark). Client-only.
export function readTokens(): Tokens {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    text: v('--tsoi-color-on-surface'), subtle: v('--tsoi-color-on-surface-variant'),
    line: v('--tsoi-color-outline'), surfaceDim: v('--tsoi-color-surface-dim'),
    surface: v('--tsoi-color-surface'),
    mono: v('--tsoi-font-mono'), c1: v('--tsoi-color-chart-1'), c6: v('--tsoi-color-chart-6'),
    c3text: v('--tsoi-color-chart-3-text') || v('--tsoi-color-chart-3'),
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
// Percentage POINTS, not percent: a contribution of 1.74pp is 1.74 of the
// headline's own percent, and calling it 1.74% would invite the reader to add
// it to the rate rather than read it as a slice of it. Signed, because a
// negative contribution is the whole point of the stacked bar.
const fmtPp = (v: number) => {
  const a = Math.abs(v);
  // Precision follows the magnitude: a division that moved the headline by a
  // thousandth of a point should read as that, not as a signed zero.
  const d = a >= 10 ? 1 : a >= 0.1 ? 2 : 3;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + grp(a, d) + 'pp';
};
export function fmt(field: string, v: number): string {
  if (field.endsWith('_pp')) return fmtPp(v);
  if (field.endsWith('_pts')) return grp(v, Math.abs(v) >= 100 ? 1 : 2); // index points
  // A basket SHARE, not a rate. It keeps two decimals at every magnitude
  // because the interesting movements are in them: a division going from
  // 42.62% of household spending to 36.75% reads as 43%→37% under the rate
  // rule below, which is the whole story rounded away.
  if (field.endsWith('_wt')) return grp(v, 2) + '%';
  if (field.endsWith('_pct')) { const a = Math.abs(v); return grp(v, a >= 10 ? 0 : a >= 1 ? 1 : 2) + '%'; }
  if (field.endsWith('_rs')) return fmtINR(v); // ₹ per transaction (ticket size)
  if (field === 'value_lcr') return fmtValLcr(v);
  if (field === 'value_cr') return fmtValCr(v);
  return fmtVolCr(v); // volume_cr / counts
}
const unitName = (field: string) => {
  if (field.endsWith('_pp')) return 'percentage points';
  if (field.endsWith('_pts')) return 'index points';
  if (field.endsWith('_wt')) return 'share of the basket, %';
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
  if (!intl() || field.endsWith('_pct') || field.endsWith('_pp') || field.endsWith('_pts')
    || field.endsWith('_wt') || field.endsWith('_rs')) return 1;
  return field === 'value_lcr' ? 1 : 0.01; // LCr→tn is 1:1; crore→bn is ÷100
};
const axisFmt = (field: string) => (v: number) => {
  // Percent axis: add a decimal for small-magnitude scales (e.g. a 0–2% axis)
  // so ticks don't round to duplicate whole numbers.
  if (field.endsWith('_pp')) return grp(v, v === 0 || Math.abs(v) >= 10 ? 0 : 1);
  // An index tick prints the decimals it HAS, not the decimals its magnitude
  // suggests. A 99–103 axis ticks every half point, and rounding by magnitude
  // gave "102, 102" one above the other — an axis printing the same number
  // twice for two different gridlines.
  if (field.endsWith('_pts')) return grp(v, Number.isInteger(v) ? 0 : 1);
  if (field.endsWith('_wt')) return grp(v, v === 0 || Math.abs(v) >= 10 ? 0 : 1) + '%';
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

/**
 * The same month written out, for the one place a month is the READING rather
 * than the axis: a tile whose whole statement is when something happened.
 * "Sep-74" is a tick label; "September 1974" is a sentence.
 */
export const longMonthLabel = (m: string) => {
  const [y, mm] = String(m).split('-');
  return new Date(+y, +mm - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

/**
 * How a dataset's vintage prints on the bar. A daily series is dated to the
 * day; a MONTHLY one is dated to the month, because its `asOf` is the first of
 * the reported month by convention — "01 Jun 2026" would read as a measurement
 * taken that morning rather than the June print it is. The dataset declares
 * which it is (`asOfGrain`), since nothing about the string can tell them
 * apart: a daily series can perfectly well end on the first.
 */
export const asOfLabel = (iso: string, grain?: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    ...(grain === 'month' ? {} : { day: '2-digit' }),
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });

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

/**
 * A filter token: which CONTROL supplies the value, and which row FIELD it is
 * matched against. The two are the same name in almost every case — that is the
 * contract the whole spec layer rests on — so the second half is optional and
 * `'sel>code_name'` is the exception rather than the shape.
 */
export const splitFilter = (token: string): { ctl: string; field: string } => {
  const i = token.indexOf('>');
  return i < 0 ? { ctl: token, field: token } : { ctl: token.slice(0, i), field: token.slice(i + 1) };
};

function applyFilters(rows: Row[], enc: Encoding, ctrl: CtrlState): Row[] {
  let r = rows;
  for (const [f, v] of Object.entries(enc.where ?? {})) r = r.filter((row) => String(row[f]) === v);
  for (const token of enc.filters ?? []) {
    const { ctl, field: f } = splitFilter(token);
    const v = ctrl[ctl];
    const keep = enc.filtersKeep?.[ctl] ?? enc.filtersKeep?.[f];
    const kept = (row: Row) => !!keep && keep.includes(String(row[f]));
    if (Array.isArray(v)) r = r.filter((row) => v.includes(String(row[f])) || kept(row)); // multiselect (empty ⇒ none but the kept)
    else if (v != null && v !== '') r = r.filter((row) => String(row[f]) === String(v) || kept(row));
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

// The axis name for the measure actually being drawn. A panel whose `y` is a
// control (index or year-on-year, on the same lines) needs one name per
// measure; everything else keeps its single yLabel.
const yLabelOf = (enc: Encoding, yField: string) => enc.yLabels?.[yField] ?? enc.yLabel;

// Resolve the `highlight` encoding into a concrete key list. A static array is
// used verbatim; an "@controlId" string reads the single accented key from a
// live control (e.g. the selected state on the peer swarm).
const resolveHighlight = (enc: Encoding, ctrl: CtrlState): string[] | undefined => {
  const h = enc.highlight;
  if (!h) return undefined;
  if (typeof h === 'string') {
    if (!h.startsWith('@')) return [h];
    // A multiselect resolves to ALL its values, not just the first: the state
    // desk lights every state the reader has picked, not whichever came back
    // at the head of the list.
    const v = ctrl[h.slice(1)];
    return (Array.isArray(v) ? v : [v]).map(String).filter(Boolean);
  }
  return h;
};

/**
 * A target band declared by `Encoding.referenceBand`: the one row matching that
 * scope, read as numbers. Returns undefined when the panel declares no band or
 * the dataset carries no such row — a board built before its generator started
 * emitting one draws no band rather than failing.
 */
export interface Band { lo: number; hi: number; mid?: number; from?: string }
export function resolveBand(rows: Row[], enc: Encoding): Band | undefined {
  const scope = enc.referenceBand;
  if (!scope) return undefined;
  const row = rows.find((r) => Object.entries(scope).every(([f, v]) => String(r[f]) === v));
  if (!row) return undefined;
  const lo = Number(row.lo), hi = Number(row.hi), mid = Number(row.mid);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined;
  return { lo, hi, ...(Number.isFinite(mid) ? { mid } : {}), ...(row.from ? { from: String(row.from) } : {}) };
}

/**
 * The band as ECharts marks, clipped to the part of the axis it applies to. A
 * band with a `from` earlier than the first category on screen is simply drawn
 * full width, which is how the same declaration serves both the eighteen-month
 * window (where the target has applied throughout) and the fifty-seven-year
 * line (where it has not).
 *
 * Deliberately quiet: a target is the paper the line is read against, not a
 * second series. The fill is the chart's own teal at low alpha and the middle
 * rule is a hairline, so at a glance the panel still shows one line.
 */
/**
 * A y axis wide enough to hold the band it is drawing. ECharts clips a markArea
 * to the axis it sits on, so without this a 2–6 band behind a line running at
 * 4.4 would be shaded from 2 to the top of the panel and read as "above 2",
 * which is not what a band says. Only ever widens: the data keeps whatever room
 * it already had.
 */
const bandAxis = <T extends object>(yAxis: T, yField: string, band?: Band): T => (band ? {
  ...yAxis,
  // A rate keeps its zero — the floor is a real quantity there and the band
  // must not raise it — while a LEVEL, which never had one, keeps hugging its
  // own data (see scaleToData).
  min: (v: { min: number }) => Math.min(v.min, band.lo, scaleToData(yField) ? v.min : 0),
  max: (v: { max: number }) => Math.max(v.max, band.hi),
} as T : yAxis);

function bandMarkData(band: Band | undefined, xs: string[], t: Tokens) {
  const none = { area: [] as object[], line: [] as object[] };
  if (!band || !xs.length) return none;
  const start = band.from ? xs.findIndex((x) => x >= band.from!) : 0;
  if (start < 0) return none;                     // the band begins after this window ends
  const from = xs[Math.max(0, start)], to = xs[xs.length - 1];
  // Each mark carries its OWN style rather than the series' markArea style,
  // because a chart may already be shading something else with it — the long
  // line tints the year after every ratio link — and two different caveats
  // must not arrive in one colour.
  //
  // Achromatic on purpose. The tint used to be the chart's second palette
  // step, which is the hue the divisions wear everywhere else on this board —
  // the funnel's division floor, the contribution figures, the mover tiles —
  // so a reference band was borrowing a series colour and reading as one more
  // thing measured. A target is furniture: the paper the line is read against.
  // It therefore takes the same neutral the dashed midline and its label
  // already take, at an alpha that stays findable in both themes without
  // competing with the line on top of it.
  const tint = t.subtle + '18';
  return {
    area: [[{ xAxis: from, yAxis: band.lo, itemStyle: { color: tint } }, { xAxis: to, yAxis: band.hi }]],
    line: band.mid != null
      ? [[{ xAxis: from, yAxis: band.mid,
            lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1, opacity: 0.7 },
            // rotate is stated, not left to inherit: the long line's markLine
            // turns its seam labels on their side, and a band rule joining that
            // list would come out standing on end in the middle of the plot.
            label: { show: true, formatter: `${band.mid}% target`, position: 'insideStartTop' as const,
              rotate: 0, color: t.subtle, fontFamily: t.mono, fontSize: 9 } },
          { xAxis: to, yAxis: band.mid }]]
      : [],
  };
}

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
  // The row behind each key, so a tooltip can quote fields the aggregation
  // dropped (an item's weight and its index beside its rate). Last row wins,
  // which is exactly right for the one-row-per-key panels that ask for it.
  const sources = new Map<string, Row>();
  for (const row of r) {
    // A row that does not carry the measure at all is NOT a zero. The 2024
    // base published eleven index months before it could publish a first
    // year-on-year, and reading those absent rates as zeroes drew a line along
    // the axis through a year in which nothing was measured — a chart claiming
    // inflation had been nil. Absent rows are skipped, so a period with no
    // reading has no point rather than a false one.
    const raw = row[yField];
    if (raw == null || raw === '' || !Number.isFinite(Number(raw))) continue;
    const k = keyOf(row);
    acc.set(k, (acc.get(k) ?? 0) + Number(raw));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
    sources.set(k, row);
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
  // The two ends of the ranking, the middle dropped. Applied after the sort so
  // it takes the ends of whatever order the spec asked for, and skipped
  // entirely when there is not enough to have a middle.
  if (enc.extremes && pairs.length > 2 * enc.extremes) {
    const desc = pairs.slice().sort((a, b) => b.value - a.value);
    pairs = [...desc.slice(0, enc.extremes), ...desc.slice(-enc.extremes)];
  }
  // Keys any of whose contributing rows raised the `markWhen` flag — a data
  // quality mark (an imputed reading) that the chart must show rather than
  // average away. Empty unless a spec asks for it.
  const marked = new Set<string>();
  if (enc.markWhen) for (const row of r) if (Number(row[enc.markWhen])) marked.add(keyOf(row));
  return { pairs, yField, marked, sources };
}

type Pairs = { key: string; value: number }[];

// Collapse everything past the top-N into a single "Other" slice (donut/legend
// stay honest about the whole). Assumes `pairs` already sorted desc by value.
function groupOther(pairs: Pairs, limit?: number): Pairs {
  if (!limit || pairs.length <= limit) return pairs;
  const rest = pairs.slice(limit).reduce((a, p) => a + p.value, 0);
  return [...pairs.slice(0, limit), { key: 'Other', value: rest }];
}

// The key a pivoted cell's SOURCE row is filed under, so a tooltip can quote
// fields the pivot dropped. A separator no series name can contain, stated once
// rather than typed at each of the three call sites — which is how the writer,
// the bucket remap and the tooltip lookup came to use three different ones and
// every extra tooltip field silently resolved to nothing.
export const cellKey = (series: string, i: number) => `${series}\u0000${i}`;

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
  let xs = [...new Set(r.map(keyOf))].sort();
  const xIndex = new Map(xs.map((x, i) => [x, i]));
  // Series name -> values aligned to xs. Cells start NULL, not zero: a month a
  // series has no reading for is a hole in the chart, and filling it with zero
  // draws the strongest claim the axis can make — that the thing was measured
  // and came out nil. Division and state year-on-year begin a year into the
  // 2024 base, so half of every such line would otherwise sit on the axis.
  const cells = new Map<string, (number | null)[]>();
  const counts = new Map<string, number[]>(); // parallel row-counts per cell (for avg)
  const totals = new Map<string, number>();
  // The source row behind each cell, so a tooltip can quote fields the pivot
  // dropped (a division's weight and its own rate beside its contribution).
  // Only kept when a spec asks — one bucket per cell, last row wins, which is
  // exactly right for the one-row-per-cell datasets that use it.
  const sources = enc.tooltipFields ? new Map<string, Row>() : null;
  for (const row of r) {
    const s = String(row[sField]);
    if (!cells.has(s)) { cells.set(s, new Array(xs.length).fill(null)); counts.set(s, new Array(xs.length).fill(0)); }
    // A row present but carrying no reading for THIS measure still names its
    // series — the line keeps its colour and its legend entry — and leaves its
    // own cell empty.
    const raw = row[yField];
    if (raw == null || raw === '' || !Number.isFinite(Number(raw))) continue;
    const v = Number(raw);
    const i = xIndex.get(keyOf(row))!;
    const arr = cells.get(s)!;
    arr[i] = (arr[i] ?? 0) + v;
    counts.get(s)![i] += 1;
    totals.set(s, (totals.get(s) ?? 0) + v);
    sources?.set(cellKey(s, i), row);
  }
  if (enc.aggregate === 'avg') {
    for (const [s, arr] of cells) {
      const c = counts.get(s)!;
      for (let i = 0; i < arr.length; i++) if (c[i]) arr[i] = (arr[i] as number) / c[i];
    }
  }
  // Drop buckets no series has a reading for, so a measure that starts later
  // than the rows do starts the AXIS there too rather than leaving a third of
  // the panel blank. (The single-series resolver gets this for free: a skipped
  // row never reaches the axis.) Nulls inside the kept span stay nulls — a hole
  // in the middle of a line is a fact about that series, not about the month.
  const live = xs.map((_, i) => [...cells.values()].some((arr) => arr[i] != null));
  if (live.some((k) => !k) && live.some((k) => k)) {
    const keep = xs.map((_, i) => i).filter((i) => live[i]);
    xs = keep.map((i) => xs[i]);
    for (const [s, arr] of cells) cells.set(s, keep.map((i) => arr[i]));
    if (sources) {
      const moved = new Map<string, Row>();
      keep.forEach((from, to) => {
        for (const s of cells.keys()) {
          const row = sources.get(cellKey(s, from));
          if (row) moved.set(cellKey(s, to), row);
        }
      });
      sources.clear();
      for (const [k, v] of moved) sources.set(k, v);
    }
  }
  const ordered = [...cells.keys()].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  const limit = typeof enc.limit === 'string' ? +(ctrl[enc.limit.slice(1)] ?? 0) : enc.limit;
  let series = ordered.map((name) => ({ name, data: cells.get(name)! }));
  if (limit && series.length > limit) {
    const other: (number | null)[] = new Array(xs.length).fill(null);
    for (const s of series.slice(limit)) s.data.forEach((v, i) => {
      if (v != null) other[i] = (other[i] ?? 0) + v;
    });
    series = [...series.slice(0, limit), { name: 'Other', data: other }];
  }
  return { xs, series, yField, sources };
}
interface BuildCtx { panel: PanelSpec; yField: string; t: Tokens; highlight?: string[]; caption?: boolean; marked?: Set<string>; band?: Band; emphasis?: string }

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
// An INDEX LEVEL is measured from its own base, not from zero: a CPI running
// 101.7 to 107.0 on a zero-based axis is a flat line with 100 points of empty
// paper under it, which is the whole movement rounded away. Levels therefore
// scale to their data; counts, money and rates keep zero, where zero is a real
// quantity and hiding it would exaggerate the swings.
const scaleToData = (yField: string) => yField.endsWith('_pts');
const yValueAxis = (yField: string, t: Tokens, name?: string) => ({
  type: 'value' as const, name: name ?? unitName(yField), nameLocation: 'end' as const, nameGap: 10,
  scale: scaleToData(yField),
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
// Saffron is the site's headline hue and stays with the headline; the index
// behind it reads in ink, and the contribution figures in the teal the funnel
// already gives the divisions row. `item` is the funnel's own item floor —
// chart-3 — which is the hue a reader of this board has already been taught
// means "one priced thing".
export const accentColor = (accent: PanelSpec['accent'], t: Tokens) =>
  accent === 'ink' ? t.text : accent === 'teal' ? (t.palette[1] ?? t.c1)
    : accent === 'item' ? (t.palette[2] ?? t.c1) : t.c1;

function lineOrBar(type: 'line' | 'bar', pairs: Pairs, { panel, yField, t, band }: BuildCtx, agg?: string) {
  const isTime = agg != null;
  const zoom = isTime && pairs.length > 18 && !panel.staticAxis && !isCoarse();
  const c1 = accentColor(panel.accent, t);
  const bm = bandMarkData(band, pairs.map((p) => p.key), t);
  const marks = bm.area.length
    ? { markArea: { silent: true, label: { show: false }, data: bm.area },
        ...(bm.line.length ? { markLine: { silent: true, symbol: 'none', data: bm.line } } : {}) }
    : {};
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 8, right: 16, top: 36, bottom: zoom ? 60 : 28, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => fmt(yField, v) },
    xAxis: isTime
      ? xTimeAxis(pairs.map((p) => p.key), t, agg)
      : { type: 'category', data: pairs.map((p) => p.key),
          axisLabel: { color: t.subtle, hideOverlap: true }, axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false } },
    yAxis: bandAxis(yValueAxis(yField, t, yLabelOf(panel.encoding, yField)), yField, band),
    dataZoom: zoom ? zoomBars(t, pairs.length) : undefined,
    ...(zoom ? dragZoomOption() : {}),
    series: [
      type === 'line'
        // The fill reads as "this much of something"; under a line that does
        // not start at zero it would be shading an arbitrary slab, so a level
        // gets the line alone.
        ? { type: 'line', smooth: true, showSymbol: false, data: pairs.map((p) => p.value),
            lineStyle: { color: c1, width: 2 }, itemStyle: { color: c1 },
            // A band behind the line is already shading part of the plot, and
            // a fill under the line on top of it makes two overlapping washes
            // out of one reading. The band wins: it is the thing the line is
            // being read against.
            ...(scaleToData(yField) || band ? {} : { areaStyle: { color: c1, opacity: 0.12 } }),
            ...marks }
        : { type: 'bar', data: pairs.map((p) => p.value), itemStyle: { color: c1 }, ...marks },
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
  const hiMembers = enc.highlightMember
    ? (enc.highlightMember.startsWith('@')
        ? (() => { const v = ctrl[enc.highlightMember.slice(1)]; return (Array.isArray(v) ? v : [v]).map(String); })()
        : [enc.highlightMember])
    : [];
  const memberMode = !!enc.highlightMember;
  // 'All India' is the swarm's companion row, not a member of it, so selecting
  // it accents nothing rather than nothing at all being drawn.
  const selMembers = new Set(hiMembers.filter((m) => m && m !== 'All India' && m !== 'ALL INDIA'));
  const selMember = [...selMembers][0] ?? '';
  let r = applyFilters(rows, enc, ctrl);
  if (memberMode) r = r.filter((d) => String(d[kf]) !== 'All India');
  if (!r.length) return emptyChart(t);
  // Faceted small multiples, one grid per food family — the food board's
  // spread panel, whose families and ×-the-median axis are its own. Every
  // other swarm reads as one grid below, in whatever unit its y field carries.
  if (memberMode && enc.facet === 'food') return stripFacets(r, panel, ctrl, t, caption, selMember, yf, kf, sf);
  const names = [...new Set(r.map((d) => String(d[sf])))]; // dataset order = row order
  const vals = r.map((d) => Number(d[yf]) || 0);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const range = hi - lo || 1;
  const minGap = range / 32;
  // The jitter that keeps dots from sitting on each other also has to stay
  // INSIDE its own row: at ±3 offsets of 7px the outermost dots of neighbouring
  // series met in the middle and the reader could not tell which row a dot
  // belonged to. Two offsets of 5px, with a smaller dot, keeps every swarm in
  // its own lane — the panel's height (see the strips rule in BoardView) is
  // what buys the lanes their clearance.
  const pitch = 5;
  const rowsOrder = [0, 1, -1, 2, -2];
  const hiRows = resolveHighlight(enc, ctrl);
  const data: object[] = [];
  // The accented member rides in its OWN series, drawn after the swarm. A
  // per-datum `z` is ignored by ECharts scatter — inside one series the paint
  // order is the data order — so a pale dot landing on top of the selected one
  // left it as a ring with somebody else's fill inside it.
  const selData: object[] = [];
  // A member label the reader can find their state by: the swarm's keys are the
  // map's own upper-case region names where a desk shares a key with a
  // choropleth, so the row carrying a friendlier spelling supplies it.
  const labelOfKey = new Map<string, string>();
  if (enc.memberLabel) for (const d of r) labelOfKey.set(String(d[kf]), String(d[enc.memberLabel] ?? d[kf]));
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
      // One member lit across every row is the whole point of the swarm when a
      // desk has a state selected: it reads as where this state sits in each
      // series, without needing thirteen separate charts to say it.
      const isSel = selMembers.has(m.key);
      const color = isSel ? t.c1 : rowOn ? t.c6 : t.subtle;
      const opacity = isSel ? 1 : rowOn ? 0.55 : 0.35;
      (isSel ? selData : data).push({
        name: labelOfKey.get(m.key) ?? m.key, value: [m.v, name], price: m.price, series: name,
        rank: n - idx, n, // 1 = highest
        symbolOffset: [0, row * pitch],
        itemStyle: { color, opacity, borderColor: isSel ? t.text : t.surfaceDim, borderWidth: isSel ? 1.5 : 1 },
      });
    });
  }
  // The food swarm measures a ratio to the median state, where 1 is the
  // reference; every other unit here is a rate, where 0 is. Both are the same
  // idea — the line the dots are read against — so which one it is follows
  // from the field rather than from a second spec knob.
  const ratio = !yf.endsWith('_pct') && !yf.endsWith('_pp') && !yf.endsWith('_pts');
  const refValue = ratio ? 1 : 0;
  const refLabel = ratio ? 'median' : 'zero';
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    // Fixed left gutter (like horizontalBar): containLabel's auto-measure is
    // unreliable with the mono webfont and clips the widest row name. A
    // full-width panel can afford the room the long names need — "Personal
    // care, social protection and…" is not a row label anyone can use at
    // thirteen characters.
    grid: { left: panel.wide ? 200 : 96, right: 20, top: panel.title ? 34 : 18, bottom: 26 },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) =>
        `<strong>${o.name}</strong><br/>${o.data.series}<br/>`
        + (ratio ? `${o.value[0]}× the median state` : fmt(yf, o.value[0]))
        + (o.data.rank ? `<br/>#${o.data.rank} highest of ${o.data.n}` : ''),
    },
    xAxis: {
      type: 'value' as const,
      // A rate swarm has to keep its own floor: clamping to zero the way a
      // ratio does would push every negative dot off the plot.
      min: ratio ? Math.max(0, Math.floor((lo - range * 0.06) * 10) / 10)
        : Math.floor((lo - range * 0.06) * 10) / 10,
      max: Math.ceil((hi + range * 0.06) * 10) / 10,
      axisLabel: { color: t.subtle, formatter: ratio ? (v: number) => v + '×' : axisFmt(yf) },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    yAxis: {
      type: 'category' as const, data: names, inverse: true,
      axisLabel: { color: t.subtle, fontSize: 11,
        formatter: (v: string) => { const n = panel.wide ? 28 : 13; return v.length > n ? v.slice(0, n - 1) + '…' : v; } },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [{
      type: 'scatter' as const, data, symbolSize: 7,
      emphasis: { itemStyle: { borderColor: t.text } },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1 },
        // inverse category axis flips the line direction: 'start' = plot top
        label: { formatter: refLabel, position: 'start' as const,
          color: t.subtle, fontFamily: t.mono, fontSize: 10 },
        data: [{ xAxis: refValue }],
      },
    }, ...(selData.length ? [{
      type: 'scatter' as const, data: selData, symbolSize: 10,
      emphasis: { itemStyle: { borderColor: t.text } },
    }] : [])],
    // A phone cannot afford a 200px name gutter — it leaves the swarm itself
    // about half the screen, which is the half that carries the numbers. The
    // names shorten and the plot takes the room back.
    media: [
      { query: { maxWidth: 760 }, option: {
        grid: { left: 116 },
        yAxis: { axisLabel: { formatter: (v: string) => (v.length > 14 ? v.slice(0, 13) + '…' : v) } } } },
      { query: { maxWidth: 480 }, option: {
        grid: { left: 96 },
        series: [{ type: 'scatter' as const, symbolSize: 6 }, { type: 'scatter' as const, symbolSize: 9 }],
        yAxis: { axisLabel: { fontSize: 10, formatter: (v: string) => (v.length > 11 ? v.slice(0, 10) + '…' : v) } } } },
    ],
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
  // transient row accent set by the board→scatter click linkage (see the desk
  // client wiring); not a spec control, so it never serializes to the URL
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
      series: fams.map(() => ({ type: 'scatter' as const, symbolSize: 8 })),
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
    // Phones: smaller dots so 30+ steps keep daylight between them. The type
    // is repeated because a media override is resolved as a fresh series spec,
    // not merged onto the one above it — leave it off and ECharts 6 rejects the
    // entry as a series of unknown type the moment the query matches.
    media: [{ query: { maxWidth: 480 }, option: { series: [{ type: 'scatter' as const, symbolSize: 7 }] } }],
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
  // With a SECOND measure this is a dumbbell: two dots per row joined by a
  // rule, and the rule's length is the reading. The smallest extension that
  // gets there — everything below (the category axis, the gutter, the median
  // line, the responsive rules) is the dot plot's already.
  if (enc.y2) return dumbbell(r, panel, enc, yf, enc.y2, kf, t, caption);
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
    // type repeated for the same reason as in stair() above.
    media: [{ query: { maxWidth: 480 }, option: { grid: { left: 96 }, series: [{ type: 'scatter' as const, symbolSize: 7 }] } }],
  };
}

// Dumbbell — the dot plot with a second measure. One row per category, a dot
// for each of the two readings and a rule between them, sorted by the GAP: the
// question a dumbbell answers is "where do these two disagree most", so the
// order is the answer rather than an alphabet. Both dots keep their own hue and
// the legend names them from the spec's own column labels, because "left" and
// "right" is not a thing a reader can carry to the next row.
function dumbbell(r: Row[], panel: PanelSpec, enc: Encoding, yf: string, y2f: string,
  kf: string, t: Tokens, caption: boolean) {
  const recs = r.map((row) => ({
    key: String(row[kf]), a: Number(row[yf]) || 0, b: Number(row[y2f]) || 0,
  })).sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b));
  const names = recs.map((d) => d.key);
  const aName = enc.yLabel ?? unitName(yf);
  const bName = enc.y2Label ?? unitName(y2f);
  const aColor = t.c1, bColor = t.palette[1] ?? t.c6;
  const vals = recs.flatMap((d) => [d.a, d.b]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(0.4, (hi - lo) * 0.08);
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    title: chartCaption(panel, t, caption),
    legend: { top: 6, data: [aName, bName],
      textStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 10 }, inactiveColor: t.line },
    grid: { left: 200, right: 44, top: 34, bottom: 34 },
    tooltip: {
      trigger: 'item' as const, confine: true,
      formatter: (o: any) => {
        const d = recs[o.dataIndex];
        const gap = d.a - d.b;
        return `<strong>${d.key}</strong><br/>${aName}: ${fmt(yf, d.a)}<br/>${bName}: ${fmt(y2f, d.b)}`
          + `<br/>gap ${gap > 0 ? '+' : ''}${fmt(yf, gap)}`;
      },
    },
    xAxis: {
      type: 'value' as const, min: Math.max(0, lo - pad), max: hi + pad,
      // hideOverlap: on a phone the last two ticks printed as "40%45%".
      axisLabel: { color: t.subtle, hideOverlap: true, formatter: axisFmt(yf) },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } },
    },
    yAxis: {
      type: 'category' as const, data: names, inverse: true,
      axisLabel: { color: t.subtle, fontSize: 11, interval: 0,
        formatter: (v: string) => (v.length > 28 ? v.slice(0, 27) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [
      // The rule first, so both dots sit on top of it.
      { type: 'custom' as const, silent: true, data: recs.map((_, i) => i),
        renderItem: (params: any, api: any) => {
          const d = recs[params.dataIndex];
          const p1 = api.coord([d.a, params.dataIndex]);
          const p2 = api.coord([d.b, params.dataIndex]);
          return { type: 'line', shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
            style: { stroke: t.subtle, lineWidth: 1.5, opacity: 0.55 } };
        } },
      { name: aName, type: 'scatter' as const, symbolSize: 11,
        data: recs.map((d, i) => ({ value: [d.a, i], name: d.key })),
        itemStyle: { color: aColor, borderColor: t.surfaceDim, borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: t.text } } },
      { name: bName, type: 'scatter' as const, symbolSize: 11,
        data: recs.map((d, i) => ({ value: [d.b, i], name: d.key })),
        itemStyle: { color: bColor, borderColor: t.surfaceDim, borderWidth: 1 },
        emphasis: { itemStyle: { borderColor: t.text } } },
    ],
    // 520, not 760: this is a half-width panel by design, so at 760 the phone
    // rule fired on a desktop column and cut every division name to a dozen
    // letters.
    media: [{ query: { maxWidth: 520 }, option: {
      grid: { left: 116 },
      yAxis: { axisLabel: { fontSize: 10, formatter: (v: string) => (v.length > 15 ? v.slice(0, 14) + '…' : v) } },
      series: [{ type: 'custom' as const }, { type: 'scatter' as const, symbolSize: 9 }, { type: 'scatter' as const, symbolSize: 9 }] } }],
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
const hashedLine = (key: string, t: Tokens): { color: string; type: LineStyleType } => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { color: t.palette[h % t.palette.length],
    type: (['solid', 'dashed', 'dotted'] as const)[Math.floor(h / t.palette.length) % 3] };
};
export function foodLine(name: string, t: Tokens): { color: string; type: LineStyleType } {
  const slot = FOOD_LINE[name];
  if (slot) return { color: t.palette[slot[0]], type: slot[1] };
  // unmapped food: a stable hash into the slots (still per-entity, never per-selection)
  return hashedLine(name, t);
}

// The same idea for the twelve COICOP divisions, keyed by CODE rather than by
// name — the divisions desk draws them twice, once labelled by the division's
// own name and once by its series name, and only the code is the same string on
// both sides. Slots are hand-laid so the default pick (01 food, 04 housing,
// 07 transport, 13 personal care) lands on four distinct solid hues; dash
// cycles once a hue repeats, exactly as the foods' map does. There is no 12:
// insurance and financial services sits outside India's CPI.
//
// GEN is deliberately absent. On the lines it is the declared reference series
// and is already drawn dashed in ink; in the stack it never appears at all.
const DIVISION_LINE: Record<string, [number, LineStyleType]> = {
  '01': [0, 'solid'], '04': [1, 'solid'], '07': [2, 'solid'], '13': [3, 'solid'],
  '02': [4, 'solid'], '03': [5, 'solid'],
  '05': [0, 'dashed'], '06': [1, 'dashed'], '08': [2, 'dashed'], '09': [3, 'dashed'],
  '10': [4, 'dashed'], '11': [5, 'dashed'],
};
export function divisionLine(code: string, t: Tokens): { color: string; type: LineStyleType } {
  const slot = DIVISION_LINE[code];
  if (slot) return { color: t.palette[slot[0]], type: slot[1] };
  return hashedLine(code, t);
}

/**
 * A per-series style resolver for a panel whose series are division NAMES.
 *
 * The map above is keyed by code because that is the only key both panels
 * share; this walks the rows once to learn which name goes with which code, so
 * a spec never has to carry a second list of division names in step with the
 * first. Any row carrying a division code and a readable name teaches it one
 * pair — `division` on the contribution rows, `code_name` on the series rows.
 */
export function divisionLineOf(rows: Row[], t: Tokens): (name: string) => { color: string; type: LineStyleType } {
  const codeOf = new Map<string, string>();
  for (const row of rows) {
    const code = row.code == null ? '' : String(row.code);
    if (!DIVISION_LINE[code]) continue;
    for (const f of ['division', 'code_name'] as const) {
      const n = row[f];
      if (n != null && n !== '' && !codeOf.has(String(n))) codeOf.set(String(n), code);
    }
  }
  return (name: string) => divisionLine(codeOf.get(name) ?? name, t);
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

// ── the long spine ────────────────────────────────────────────────────────
// One monthly year-on-year line stitched from two different instruments across
// fifty-odd years. The stitching is the honesty problem, and it has three
// parts, all drawn rather than footnoted:
//   · a dashed rule at every seam, where the series changes source or base;
//   · a faint band over the twelve months following a RATIO-LINKED seam, whose
//     year-on-year rates each compare an index on the new basis against one on
//     the old, so the whole window is a cross-basket comparison. Handover seams
//     get no band: there the source publishes the rate itself and owns the
//     continuity;
//   · a hollow marker on months priced under collection limits.
// Era shading is deliberately off: five tinted bands behind a fifty-year line
// read as the subject, and the subject is the line.
// Expects rows carrying `seam`, `seam_label`, `seam_linked`, `limited` and
// `quant_note` beside the measure (see shapes.ts). Reads rows rather than
// resolved pairs because those flags are per-month and the pair resolver has
// no room for them.
function spine(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens) {
  const enc = panel.encoding;
  const yf = ctrlField(enc.y, ctrl);
  const xf = enc.x ?? 'date';
  const r = applyFilters(rows, enc, ctrl).slice().sort((a, b) => String(a[xf]).localeCompare(String(b[xf])));
  if (!r.length) return emptyChart(t);
  const xs = r.map((d) => String(d[xf]));
  const vals = r.map((d) => Number(d[yf]) || 0);
  const seams = r.map((_, i) => i).filter((i) => Number(r[i].seam));
  const limited = r.map((_, i) => i).filter((i) => Number(r[i].limited));
  // A year-on-year rate looks back twelve months, so a link at month i taints
  // rates i..i+11. Clipped to the window in view, which is why it is computed
  // after the range filter rather than from the raw seam list.
  const bands = seams.filter((i) => Number(r[i].seam_linked))
    .map((i) => [xs[i], xs[Math.min(i + 11, xs.length - 1)]] as const)
    .filter(([a, b]) => a !== b);
  const zoom = xs.length > 18 && !isCoarse() && !panel.staticAxis;
  const monthName = (k: string) => periodLabel(k, 'M');
  // The target band, clipped to the months it has applied to (see bandMarks).
  const band = resolveBand(rows, enc);
  const bm = bandMarkData(band, xs, t);
  const bandOn = bm.area.length > 0;
  // Dated marks, kept to the window in view. Quieter than the seam rules on
  // purpose: a seam is a caveat about the numbers and an event is a caption on
  // them, and drawn at the same weight the reader cannot tell which is which.
  const xAt = new Map(xs.map((x, i) => [x, i]));
  const evRows = enc.events
    ? rows.filter((row) => Object.entries(enc.events!).every(([f, v]) => String(row[f]) === v))
      .filter((row) => xAt.has(String(row.date)))
    : [];
  const evLabel = new Map(evRows.map((row) => [String(row.date), String(row.label)]));
  // The key, one clause per mark, and only for the marks this window actually
  // contains. Named here because the narrow layout below has to count them.
  const keys = ['DASHED RULE = A CHANGE OF SOURCE OR BASE',
    ...(evRows.length ? ['TICK = A DATED MARKER'] : []),
    ...(bandOn ? [`SHADED ${band!.lo}–${band!.hi}% = THE INFLATION TARGET BAND`] : []),
    ...(bands.length ? ['SHADED YEAR = RATES SPANNING A RATIO LINK'] : []),
    ...(limited.length ? ['HOLLOW DOT = PRICED UNDER COLLECTION LIMITS'] : [])];
  // ── the era the reader is looking at, counted rather than asserted ───────
  // The window control is the whole point of this panel, so the sentence under
  // it has to recompute with it: what the visible months averaged, where they
  // peaked, and how many of them sat at or above the band's ceiling. Every
  // figure comes from the points on screen; with no band declared the third
  // clause simply is not made.
  {
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    let pk = 0;
    for (let i = 1; i < vals.length; i++) if (vals[i] > vals[pk]) pk = i;
    const over = band ? vals.filter((v) => v >= band.hi).length : 0;
    // A decimal, not the axis rounding: `fmt` drops to whole numbers past 10,
    // which turns a 34.68% peak into "35%" — the axis can afford that and a
    // sentence naming the highest month on a fifty-seven-year line cannot.
    const say = (v: number) => grp(v, 1) + (yf.endsWith('_pct') ? '%' : '');
    setFoot(`Over the ${xs.length} months in view, year-on-year inflation averaged `
      + `${say(mean)} and peaked at ${say(vals[pk])} in ${monthName(xs[pk])}`
      + (band ? `, and sat at or above ${say(band.hi)} in ${over} of them.` : '.'));
  }
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 8, right: 16, top: 30, bottom: zoom ? 60 : 30, containLabel: true },
    tooltip: {
      trigger: 'axis' as const, confine: true,
      // the limited-collection note is a full paragraph from the generator
      // (it names the four indices the two rates were computed from), so the
      // box has to wrap and cap its own height rather than stretch off the panel
      extraCssText: 'max-width: 360px; max-height: 60vh; overflow-y: auto; white-space: normal;',
      formatter: (ps: any[]) => {
        const i = ps[0].dataIndex;
        return `<strong>${monthName(xs[i])}</strong><br/>${fmt(yf, vals[i])} on the year`
          // The label rides the hover as well as the axis, because below 620px
          // the printed labels come off and the tick alone is left.
          + (evLabel.has(xs[i]) ? `<br/>${evLabel.get(xs[i])}` : '')
          + (Number(r[i].limited) ? `<br/>${r[i].limited_note}` : '')
          + (Number(r[i].seam) ? `<br/>series seam: ${r[i].seam_label || 'a change of source or base'}` : '');
      },
    },
    xAxis: xTimeAxis(xs, t, 'M'),
    yAxis: bandAxis(yValueAxis(yf, t, enc.yLabel), yf, band),
    dataZoom: zoom ? zoomBars(t, xs.length) : undefined,
    ...(zoom ? dragZoomOption() : {}),
    series: [
      {
        type: 'line' as const, smooth: false, showSymbol: false, data: vals,
        lineStyle: { color: t.c1, width: 1.4 }, itemStyle: { color: t.c1 },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: t.subtle, type: 'dashed' as const, width: 1, opacity: 0.85 },
          label: { formatter: (o: any) => monthName(o.name), position: 'insideEndTop' as const,
            color: t.subtle, fontFamily: t.mono, fontSize: 9, rotate: 90 },
          data: [
            ...seams.map((i) => ({ xAxis: i, name: xs[i] })),
            { yAxis: 0, lineStyle: { color: t.line, type: 'solid' as const, width: 1 }, label: { show: false } },
            ...bm.line,
          ],
        },
        // the cross-basket year after each ratio link. Faint on purpose: the
        // band is a caveat on twelve months of a fifty-year line, and at any
        // ink heavy enough to read as a block it competes with the line it is
        // qualifying. Just enough tint to be seen when looked for.
        markArea: {
          silent: true,
          itemStyle: { color: t.subtle + '10' },
          label: { show: false },
          data: [...bands.map(([from, to]) => [{ xAxis: from }, { xAxis: to }]), ...bm.area],
        },
      },
      // months priced under collection limits — hollow, on the line, in the key
      {
        type: 'scatter' as const, symbolSize: 7, symbol: 'circle',
        data: limited.map((i) => [i, vals[i]]),
        itemStyle: { color: 'transparent', borderColor: t.text, borderWidth: 1.2 },
        tooltip: { show: false }, z: 6,
      },
      // Dated marks, in a series of their own so their weight is set once and
      // set apart from the seams': a hairline at a third of the seams' opacity,
      // labelled along the foot of the plot rather than turned on its side at
      // the top where the seam dates already are.
      ...(evRows.length ? [{
        type: 'line' as const, data: [] as unknown[], silent: true,
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: t.subtle, type: 'dotted' as const, width: 1, opacity: 0.6 },
          // Turned on its side and hung from the FOOT of the plot: horizontal
          // captions along the bottom ran through the month axis and off the
          // right edge, and the top of this chart already belongs to the seam
          // dates. Reading upward from the floor, five captions on a
          // fifty-seven-year axis never meet each other or anything else.
          label: { formatter: (o: any) => o.name, position: 'insideStartTop' as const,
            rotate: 90, distance: 3, color: t.subtle, fontFamily: t.mono, fontSize: 9 },
          data: evRows.map((row) => ({ xAxis: xAt.get(String(row.date)), name: String(row.label) })),
        },
      }] : []),
    ],
    // centred, because the y-axis unit name already owns the top-left corner.
    // Each clause appears only when the window in view actually contains the
    // thing it explains.
    graphic: [
      { type: 'text' as const, left: 'center', top: 4, silent: true,
        style: { text: keys.join(' · '), fill: t.subtle, font: `9px ${t.mono}` } },
    ],
    // On a phone the three clauses on one line ran off both ends of the chart
    // and through the axis name. Stacked, left-aligned, with the plot pushed
    // down far enough to clear however many clauses this window earned — a key
    // that doesn't fit is not a key.
    media: [{ query: { maxWidth: 620 }, option: {
      // 4px of lead + a line per clause, then room for the axis's own name,
      // which hangs nameGap above the plot in the same corner the key now uses.
      grid: { left: 8, right: 16, top: 26 + keys.length * 11, bottom: zoom ? 60 : 30, containLabel: true },
      graphic: [{ type: 'text' as const, left: 4, top: 4, silent: true,
        style: { text: keys.join('\n'), lineHeight: 11, fill: t.subtle, font: `9px ${t.mono}` } }],
      // A phone has no room for five captions along a fifty-seven-year axis;
      // the ticks stay and the words move into the tooltip, which is where a
      // touch reader meets them anyway. Index 2 is the event series (see above).
      ...(evRows.length ? { series: [{ type: 'line' as const }, { type: 'scatter' as const },
        { type: 'line' as const, markLine: { label: { show: false } } }] } : {}),
    } }],
  };
}

// ── contribution breakdown for one month ──────────────────────────────────
// The stacked bar above says how the headline was built over time; this says
// how it was built THIS month, sorted by how much each division moved it
// rather than by how big the division is. Diverging from a zero line, because
// a division pulling the headline down is the interesting case and a
// single-direction ranking would hide it.
// The footer is load-bearing: TSOI computes these contributions itself, so the
// panel states the arithmetic's own error against the published headline
// instead of quietly absorbing it.
function contribbars(rows: Row[], panel: PanelSpec, ctrl: CtrlState, t: Tokens) {
  const enc = panel.encoding;
  const yf = ctrlField(enc.y, ctrl);
  const kf = enc.x!;
  const r = applyFilters(rows, enc, ctrl);
  if (!r.length) return emptyChart(t);
  const recs = r.map((row) => ({
    key: String(row[kf]),
    v: Number(row[yf]) || 0,
    weight: Number(row.weight_wt) || 0,
    own: Number(row.infl_pct) || 0,
  })).sort((a, b) => Math.abs(a.v) - Math.abs(b.v)); // smallest first: inverse:false puts the biggest on top
  const sum = recs.reduce((a, d) => a + d.v, 0);
  const gen = Number(r[0].gen_pct) || 0;
  const residual = Number(r[0].residual_pp) || 0;
  // Push and pull in two hues. The accent takes the pushing side, so a desk can
  // put this figure in the same colour as the numbers around it; the other side
  // keeps the counterpart hue rather than a mirror of the same one, because a
  // division pulling the headline down is a different fact, not a darker one.
  const up = accentColor(panel.accent, t), down = panel.accent === 'teal' ? t.palette[5] : t.palette[1];
  // The axis diverges only when the data does. A month in which every division
  // pushed the same way would otherwise spend half its width on an empty side.
  const lo = Math.min(0, ...recs.map((d) => d.v));
  const hi = Math.max(0, ...recs.map((d) => d.v));
  const pad = Math.max(0.05, (hi - lo) * 0.22);
  // Four decimals, not the display rounding: the whole sentence exists to show
  // the size of the arithmetic's own error, and rounding it to the chart's
  // precision would hide exactly the number it is disclosing. A gap too small
  // to print at four places is stated as a bound rather than as "0.0000pp",
  // which would read as exactness the method cannot claim.
  setFoot(`Divisions sum to ${sum.toFixed(4)}pp against a published headline of ${gen.toFixed(2)}%. `
    + (Math.abs(residual) < 0.00005
      ? 'The two differ by less than 0.0001pp, which is rounding.'
      : `The two differ by ${Math.abs(residual).toFixed(4)}pp, which is rounding.`));
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 200, right: 28, top: 10, bottom: 56 },
    tooltip: {
      trigger: 'item' as const, confine: true,
      formatter: (o: any) => {
        const d = recs[o.dataIndex];
        return `<strong>${d.key}</strong><br/>weight ${fmt('weight_wt', d.weight)}`
          + `<br/>its own rate ${fmt('infl_pct', d.own)}`
          + `<br/>contribution ${fmt(yf, d.v)}`;
      },
    },
    xAxis: {
      type: 'value' as const, min: lo - (lo < 0 ? pad : 0), max: hi + (hi > 0 ? pad : 0),
      name: enc.yLabel ?? 'PERCENTAGE POINTS OF THE HEADLINE', nameLocation: 'middle' as const, nameGap: 24,
      nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
      axisLabel: { color: t.subtle, formatter: axisFmt(yf) },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.4 } },
    },
    yAxis: {
      type: 'category' as const, data: recs.map((d) => d.key),
      axisLabel: { color: t.text, fontSize: 11,
        formatter: (v: string) => (v.length > 30 ? v.slice(0, 29) + '…' : v) },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [{
      type: 'bar' as const, barWidth: '58%',
      data: recs.map((d) => ({
        value: d.v,
        itemStyle: { color: d.v >= 0 ? up : down, opacity: 0.9, borderRadius: 2 },
        label: { show: true, position: (d.v >= 0 ? 'right' : 'left') as 'right' | 'left',
          formatter: fmt(yf, d.v), color: t.subtle, fontFamily: t.mono, fontSize: 10 },
      })),
      markLine: { silent: true, symbol: 'none', lineStyle: { color: t.subtle, width: 1 },
        label: { show: false }, data: [{ xAxis: 0 }] },
    }],
    media: [{ query: { maxWidth: 760 }, option: { grid: { left: 116 },
      yAxis: { axisLabel: { formatter: (v: string) => (v.length > 16 ? v.slice(0, 15) + '…' : v) } } } }],
  };
}

// ── diverging horizontal bars ─────────────────────────────────────────────
// The generic cousin of contribbars: a ranked list read from a zero line, with
// the risers above it and the fallers below. Where contribbars is about one
// month's contributions and closes with the arithmetic's own residual, this
// knows nothing about what it is ranking — it takes pairs, an accent and
// whatever extra fields the spec wants on the hover, and draws them.
//
// Paired with `Encoding.extremes`, which is what makes a 358-row ranking
// readable: the two ends of it, and no claim that the middle does not exist.
function divbars(pairs: Pairs, sources: Map<string, Row>, { panel, yField, t, emphasis }: BuildCtx) {
  if (!pairs.length) return emptyChart(t);
  const enc = panel.encoding;
  // Largest at the top: the category axis draws index 0 at the bottom unless
  // inverted, and a ranking that reads upward is a ranking read backwards.
  const recs = pairs.slice().sort((a, b) => a.value - b.value);
  const up = accentColor(panel.accent, t);
  const down = panel.accent === 'teal' ? t.palette[5] : t.palette[1];
  const lo = Math.min(0, ...recs.map((d) => d.value));
  const hi = Math.max(0, ...recs.map((d) => d.value));
  const pad = Math.max(0.05, (hi - lo) * 0.18);
  const extra = enc.tooltipFields ?? [];
  // The one member the desk is threaded to, where the ranking happens to
  // contain it. Matched on the SOURCE row rather than on the bar's own key,
  // because a bar is labelled by a name and the control holds a code. Not a
  // second colour scale: the bar keeps the hue that says which way it went and
  // takes a ring, and its name is the only label on the axis in the item hue.
  const key = enc.emphasisKey ?? enc.x ?? '';
  const on = emphasis
    ? new Set(recs.filter((d) => String(sources.get(d.key)?.[key] ?? '') === emphasis).map((d) => d.key))
    : new Set<string>();
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono, color: t.subtle },
    grid: { left: 176, right: 56, top: 10, bottom: 46 },
    tooltip: {
      trigger: 'item' as const, confine: true,
      formatter: (o: any) => {
        const d = recs[o.dataIndex];
        const row = sources.get(d.key);
        return `<strong>${d.key}</strong><br/>${fmt(yField, d.value)}`
          + (row ? extra.map((f) => `<br/>${f.label}: ${fmt(f.field, Number(row[f.field]) || 0)}`).join('') : '');
      },
    },
    xAxis: {
      type: 'value' as const, min: lo - (lo < 0 ? pad : 0), max: hi + (hi > 0 ? pad : 0),
      name: enc.yLabel, nameLocation: 'middle' as const, nameGap: 24,
      nameTextStyle: { color: t.subtle, fontFamily: t.mono, fontSize: 9 },
      axisLabel: { color: t.subtle, formatter: axisFmt(yField) },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.4 } },
    },
    yAxis: {
      type: 'category' as const, data: recs.map((d) => d.key),
      // interval 0: a bar nobody can name is not a ranking. ECharts thins
      // category labels that crowd, which on twenty rows in a phone-height
      // panel dropped every other one — including the biggest mover's.
      axisLabel: { color: t.text, fontSize: 11, interval: 0,
        // Rich text is the only way to colour ONE category label: the axis
        // takes a single colour otherwise, and the emphasised row has to be
        // findable without hunting.
        rich: { on: { color: t.c3text, fontSize: 11, fontWeight: 600 as const } },
        formatter: (v: string) => {
          const s = v.length > 26 ? v.slice(0, 25) + '…' : v;
          return on.has(v) ? `{on|${s}}` : s;
        } },
      axisLine: { lineStyle: { color: t.line } }, axisTick: { show: false },
    },
    series: [{
      type: 'bar' as const, barWidth: '62%',
      data: recs.map((d) => ({
        value: d.value,
        itemStyle: { color: d.value >= 0 ? up : down, opacity: on.has(d.key) ? 1 : 0.9, borderRadius: 2,
          ...(on.has(d.key) ? { borderColor: t.c3text, borderWidth: 2 } : {}) },
        label: { show: true, position: (d.value >= 0 ? 'right' : 'left') as 'right' | 'left',
          formatter: fmt(yField, d.value), color: on.has(d.key) ? t.c3text : t.subtle,
          fontFamily: t.mono, fontSize: 10, fontWeight: (on.has(d.key) ? 600 : 400) as number },
      })),
      markLine: { silent: true, symbol: 'none', lineStyle: { color: t.subtle, width: 1 },
        label: { show: false }, data: [{ xAxis: 0 }] },
    }],
    // 520, not the 760 the wide-panel charts use: this one is a half-width
    // panel by design, so at 760 the narrow rule fired on a desktop column and
    // cut "Silver jewellery" to eight letters. The gutter at this width holds a
    // 26-character name comfortably; a phone is what needs the shorter one.
    media: [{ query: { maxWidth: 520 }, option: { grid: { left: 112 },
      yAxis: { axisLabel: { fontSize: 10, formatter: (v: string) => (v.length > 15 ? v.slice(0, 14) + '…' : v) } } } }],
  };
}

// Convert a human-readable state (the 'State' control's value) to the map's
// upper-case feature name — the same rule the build's REGION_SQL applies, so a
// selected state can be located on the choropleth. 'All India' → no match.
export const toRegion = (st: string) =>
  st === 'DNH and DD' ? 'DADRA & NAGAR HAVELI & DAMAN & DIU' : st.toUpperCase().replace(/ AND /g, ' & ');

function choropleth(pairs: Pairs, { panel, yField, t, highlight, marked }: BuildCtx) {
  // Nothing to draw is a state this panel now genuinely reaches: a desk whose
  // rows arrive on demand renders once before they land. Without this the
  // visual map is built on Math.min of an empty list, the ramp is asked for a
  // gradient stop between ∞ and −∞, and the paint throws — after which the
  // instance never recovers and the map stays blank for the rest of the
  // session, however good the next set of rows is.
  if (!pairs.length) return emptyChart(t);
  const vals = pairs.map((p) => p.value);
  // computed rank by value desc (the DB rank column is unreliable)
  const ranked = pairs.slice().sort((a, b) => b.value - a.value);
  const rankOf = new Map(ranked.map((p, i) => [p.key, i + 1]));
  const byKey = new Map(pairs.map((p) => [p.key, p.value]));
  // Selected states are named, not outlined in black. A heavy dark ring reads
  // as a border dispute on a map of India and fights the saffron ramp it sits
  // on; it also cannot say WHICH states are selected once there is more than
  // one. Instead each selected region takes a chip label in the page's own
  // colours — legible over the dark end of the ramp, where dark text is not —
  // and a ring in that same page colour, which reads as a cut-out rather than
  // as a border. The fill still belongs to the number.
  const selRegions = new Set((highlight ?? []).map((h) => toRegion(h)));
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.mono },
    tooltip: {
      trigger: 'item',
      formatter: (o: any) => byKey.has(o.name)
        ? `<strong>${o.name}</strong><br/>Rank #${rankOf.get(o.name)} of ${pairs.length}<br/>${fmt(yField, byKey.get(o.name)!)}`
          + (marked?.has(o.name) ? `<br/>imputed by the source` : '')
        : `${o.name}<br/>no data`,
    },
    // The imputation key. Drawn only when something is actually flagged, so a
    // clean month says nothing rather than saying "none".
    graphic: marked?.size
      ? [{ type: 'text' as const, right: 8, bottom: 6, silent: true,
          style: { text: 'dashed outline = imputed by the source',
            fill: t.subtle, font: `9px ${t.mono}` } }]
      : undefined,
    visualMap: {
      min: Math.min(...vals), max: Math.max(...vals), left: 'left', bottom: 24, calculable: true,
      text: ['high', 'low'], textStyle: { color: t.subtle, fontFamily: t.mono },
      inRange: { color: [t.surfaceDim, t.c6, t.c1] }, formatter: (v: number) => fmt(yField, v),
    },
    series: [{
      type: 'map', map: panel.map ?? 'india', roam: false, nameProperty: 'name',
      label: { show: false },
      // areaColor is the NO-DATA fill: a region the data never mentions keeps
      // the panel's own paper rather than ECharts' hardcoded near-white, and is
      // therefore distinct from the low end of the ramp (surface-dim) in both
      // themes. On the state desk an item priced in a dozen states leaves the
      // rest blank, and blank has to read as blank.
      itemStyle: { areaColor: t.surface, borderColor: t.line, borderWidth: 0.5 },
      emphasis: { label: { show: true, color: t.text, fontFamily: t.mono, fontSize: 10 }, itemStyle: { areaColor: t.c1 } },
      // pin the selected region's label so it reads without a hover
      selectedMode: false,
      data: pairs.map((p) => {
        const sel = selRegions.has(p.key);
        // An imputed reading keeps its fill (the number is the source's) but
        // wears a dashed outline, so the map never smooths the caveat away.
        const mark = marked?.has(p.key)
          ? { borderColor: t.text, borderWidth: 1.2, borderType: 'dashed' as const } : null;
        if (sel) return { name: p.key, value: p.value,
          itemStyle: { ...mark, borderColor: t.surfaceDim, borderWidth: 2.5 },
          emphasis: { itemStyle: { borderColor: t.surfaceDim, borderWidth: 2.5 } },
          // The chip carries the reading, not just the name. A tap on a phone
          // IS the selection gesture — it redraws the map, and a tooltip does
          // not survive a redraw — so without the number here the map is the
          // one panel a touch reader can look at but cannot read.
          label: { show: true, formatter: (o: { name: string; value: number }) => `${o.name}  ${fmt(yField, o.value)}`,
            color: t.text, fontFamily: t.mono, fontSize: 9,
            backgroundColor: t.surfaceDim, borderColor: t.line, borderWidth: 0.5,
            padding: [2, 4], borderRadius: 2 } };
        return mark
          ? { name: p.key, value: p.value, itemStyle: mark }
          : { name: p.key, value: p.value };
      }),
    }],
  };
}

// A cell is null where that series has no reading for that x — see
// resolveSeries. Charts pass nulls straight to ECharts, which draws a gap.
type Series = { name: string; data: (number | null)[] }[];

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

function stacked(type: 'area' | 'bar', xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false, yName?: string,
  tip?: { fields: { field: string; label: string }[]; sources: Map<string, Row> }, coverage?: string,
  lineOf?: (name: string) => { color: string; type: LineStyleType }) {
  const pal = t.palette;
  // "Six months so far" has to be counted, not typed, or it is wrong the month
  // a seventh arrives.
  if (coverage && xs.length) {
    setFoot(coverage.replace('{n}', String(xs.length)).replace('{from}', periodLabel(xs[0], agg)));
  }
  // With tooltipFields the hover switches from the axis read (every stack at
  // this x) to the segment read: this division, at this month, with the two
  // numbers that produced it. An axis tooltip carrying three extra lines per
  // division would be taller than the chart.
  const itemTip = tip ? {
    tooltip: {
      trigger: 'item' as const, confine: true,
      formatter: (o: any) => {
        const row = tip.sources.get(cellKey(o.seriesName, o.dataIndex));
        const head = `<strong>${o.seriesName}</strong><br/>${periodLabel(xs[o.dataIndex], agg)}`;
        const extra = row
          ? tip.fields.map((f) => `<br/>${f.label}: ${fmt(f.field, Number(row[f.field]) || 0)}`).join('')
          : '';
        return `${head}${extra}<br/>contribution ${fmt(yField, o.value)}`;
      },
    },
  } : {};
  const frame = multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis, yName);
  return {
    ...frame,
    // A stack is read from its baseline: whatever the field's unit, this axis
    // keeps zero even where a plain line of the same unit would scale to its
    // data (see scaleToData).
    yAxis: { ...frame.yAxis, scale: false },
    ...itemTip,
    series: series.map((s, i) => {
      // Where a spec locks an entity to a hue, the stack takes the same hue the
      // lines beside it take. Only the hue: a stacked bar has no stroke to dash,
      // so the dash half of the lock is the lines' alone.
      const own = s.name === 'Other' ? undefined : lineOf?.(s.name);
      const color = own ? own.color : seriesColor(pal, i, s.name, t);
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
function multiline(xs: string[], series: Series, yField: string, t: Tokens, agg?: string, staticAxis = false, yName?: string, legendLeft = false, lineOf?: (name: string) => { color: string; type: LineStyleType }, referenceSeries?: string,
  tip?: { fields: { field: string; label: string }[]; sources: Map<string, Row> }) {
  const pal = t.palette;
  const frameBase = multiSeriesFrame(xs, yField, t, agg, xs.length > 18 && !isCoarse() && !staticAxis, yName);
  // Extra fields off the SOURCE row behind each point — a rebased index and the
  // published level it came from, where the panel is drawing arithmetic on a
  // published number and has to show its working. Still an axis tooltip: the
  // whole point of two lines is reading them at the same x.
  const frame = tip ? { ...frameBase, tooltip: { trigger: 'axis' as const, confine: true,
    formatter: (ps: any[]) => `<strong>${periodLabel(String(ps[0].axisValue), agg)}</strong>`
      + ps.map((pt) => {
        const row = tip.sources.get(cellKey(pt.seriesName, pt.dataIndex));
        return `<br/>${pt.marker}${pt.seriesName}: ${pt.value == null ? '—' : fmt(yField, pt.value)}`
          + (row ? tip.fields.map((f) => ` (${f.label} ${fmt(f.field, Number(row[f.field]) || 0)})`).join('') : '');
      }).join(''),
  } } : frameBase;
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
      // A DECLARED reference — the headline among its own divisions — is the
      // one line on the chart that is not a peer of the others: it is what the
      // others add up to. Ink and dashed says that without a legend note, and
      // without spending one of the six hues on it.
      const isBenchmark = !!referenceSeries && s.name === referenceSeries && series.length > 1;
      const own = !isRef && s.name !== 'All India' && lineOf ? lineOf(s.name) : undefined;
      const color = isRef ? t.subtle : isBenchmark ? t.text : s.name === 'All India' ? t.c1
        : own ? own.color : seriesColor(pal, i, s.name, t);
      return {
        name: s.name, type: 'line' as const, smooth: true, showSymbol: false, connectNulls: true,
        // reference line (national median under a selected state) recedes: thinner,
        // dashed and semi-transparent so the state line reads as the subject.
        lineStyle: { width: isRef ? 1.5 : 2, color, opacity: isRef ? 0.45 : 1,
          ...(isRef || isBenchmark ? { type: 'dashed' as const } : own ? { type: own.type } : {}) },
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
  // A missing measure is a gap, not a zero: the 2024-base series carries an
  // index from its first month but no year-on-year until a year has passed,
  // and plotting that absence as 0% would invent a collapse.
  const val = (d: Row, f: string) => (d[f] == null || d[f] === '' ? null : Number(d[f]));
  const left = r.map((d) => val(d, yL));
  const right = r.map((d) => val(d, yR));
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
        `<strong>${periodLabel(String(ps[0].axisValue), /^\d{4}-\d{2}$/.test(String(ps[0].axisValue)) ? 'M' : undefined)}</strong><br/>` +
        ps.map((p) => `${p.marker}${p.seriesName}: `
          + (p.value == null ? 'not published yet' : fmt(p.seriesIndex === 0 ? yL : yR, p.value))).join('<br/>'),
    },
    xAxis: xCatAxis(xs, t, xs.every((k) => /^\d{4}-\d{2}$/.test(k)) ? 'M' : undefined),
    yAxis: [
      // Each axis takes the spec's own column label where it has one: on a
      // two-measure chart "Index (2024=100)" says more than the bare unit.
      { type: 'value' as const, name: lName, nameLocation: 'end' as const, nameGap: 10,
        nameTextStyle: { ...nameStyle, align: 'left' as const }, position: 'left' as const,
        scale: true,
        axisLabel: { color: t.subtle, formatter: axisFmt(yL) },
        splitLine: { lineStyle: { color: t.line, type: 'dashed' as const, opacity: 0.5 } } },
      { type: 'value' as const, name: rName, nameLocation: 'end' as const, nameGap: 10, scale: true,
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
  // The gutters are the label columns, and a category name that does not fit
  // one runs off the panel rather than wrapping. Reserve a real column and cut
  // the name to it (the full name is in the hover), rather than letting a long
  // taxonomy label — "Furnishings, household equipment and routine household
  // maintenance" — decide the layout.
  const narrowSlope = typeof matchMedia !== 'undefined' && matchMedia('(max-width: 880px)').matches;
  const gutter = narrowSlope ? 116 : 210;
  const cap = narrowSlope ? 15 : 30;
  const clip = (s: string) => (s.length > cap ? s.slice(0, cap - 1) + '…' : s);
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
        { value: a, label: { position: 'left' as const, formatter: `{n|${clip(k)}}\n{v|${countStr(Number(d[lf]))}}` } },
        { value: b, label: { position: 'right' as const, formatter: `{n|${clip(k)}}\n{v|${fmt(rf, Number(d[rf]))}}` } },
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
    grid: { left: gutter, right: gutter, top: 36, bottom: 14 },
    tooltip: { trigger: 'item' as const, confine: true,
      formatter: (o: any) => {
        const d = r.find((x) => String(x[keyf]) === o.seriesName);
        return `<strong>${o.seriesName}</strong>`
          + (d ? `<br/>${enc.yLabel ?? 'left'}: ${countStr(Number(d[lf]))}`
               + `<br/>${enc.y2Label ?? 'right'}: ${fmt(rf, Number(d[rf]))}` : '');
      } },
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
            return { type: 'line' as const, lineStyle: { width: on ? 2 : 1 }, symbolSize: on ? 6 : 4 };
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
          series: [{ type: 'pie' as const, center: ['50%', '40%'], radius: ['40%', '60%'] }],
        },
      },
    ],
  };
}

// Build a panel's ECharts option given the dataset + current control state.
// ── the desk-foot channel ──────────────────────────────────────────────────
// Two charts here compute a sentence only their own numbers can produce: how
// far the divisions' contributions miss the published headline, and how many
// months of a young series exist so far. Both are footnotes — small print
// about the figure — and the board keeps its small print together at the foot
// of the desk, where PanelSpec.note already goes.
//
// They cannot travel the same road as `note`, because BoardView writes that at
// build time and these change with every control the reader touches. So the
// builder records its sentence here and buildPanel hands it back through
// takeFoot(). One slot is enough: a build runs start to finish before the next
// begins. Taking it clears it, so a panel that stops having a footnote does
// not inherit the last one that did.
let footSlot: string | undefined;
const setFoot = (text: string) => { footSlot = text; };
export const takeFoot = () => { const s = footSlot; footSlot = undefined; return s; };

// Tooltips are read on a phone too, and `confine` can only slide a box that
// already FITS. A formatter printing a COICOP division name in full — "Personal
// care, social protection and miscellaneous goods and services" — lays out one
// 600px line, and a 600px box on a 390px screen runs off the edge wherever it
// is put. The cap gives those lines somewhere to wrap; a short tooltip is
// unaffected, so desktop keeps its comfortable one-line reading.
const TIP_CSS = 'max-width: min(88vw, 380px); max-height: 60vh; overflow-y: auto; white-space: normal;';
const capTooltip = <T,>(option: T): T => {
  const tip = (option as { tooltip?: { extraCssText?: string; confine?: boolean } }).tooltip;
  if (tip && !tip.extraCssText) { tip.extraCssText = TIP_CSS; tip.confine = true; }
  return option;
};

export function buildPanel(panel: PanelSpec, rows: Row[], ctrl: CtrlState, t: Tokens, caption = true) {
  footSlot = undefined;
  return capTooltip(buildPanelOption(panel, rows, ctrl, t, caption));
}

function buildPanelOption(panel: PanelSpec, rows: Row[], ctrl: CtrlState, t: Tokens, caption: boolean) {
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
  if (type === 'spine') return spine(rows, panel, ctrl, t);
  if (type === 'contribbars') return contribbars(rows, panel, ctrl, t);
  // Per-entity colour, where a spec locks one. Built once here so the stacked
  // and the multi-line path resolve the SAME table — that is the whole point of
  // the lock, and the two used to colour by slot in their own selection.
  const lineOf = panel.encoding.colorBy === 'food' ? (n: string) => foodLine(n, t)
    : panel.encoding.colorBy === 'division' ? divisionLineOf(rows, t)
      : undefined;
  if (panel.encoding.series && (type === 'area' || type === 'bar')) {
    const { xs, series, yField, sources } = resolveSeries(rows, panel.encoding, ctrl);
    return stacked(type, xs, series, yField, t, agg, panel.staticAxis, panel.encoding.yLabel,
      sources && panel.encoding.tooltipFields ? { fields: panel.encoding.tooltipFields, sources } : undefined,
      panel.encoding.coverage, lineOf);
  }
  if (panel.encoding.series && type === 'line') {
    const { xs, series, yField, sources } = resolveSeries(rows, panel.encoding, ctrl);
    return multiline(xs, series, yField, t, agg, panel.staticAxis, yLabelOf(panel.encoding, yField), panel.encoding.legend === 'left',
      lineOf,
      panel.encoding.referenceSeries,
      sources && panel.encoding.tooltipFields ? { fields: panel.encoding.tooltipFields, sources } : undefined);
  }
  if (type === 'donut') {
    const lim = typeof panel.encoding.limit === 'string'
      ? +(one(ctrl[panel.encoding.limit.slice(1)]) || 0) : panel.encoding.limit;
    const { pairs, yField } = resolve(rows, { ...panel.encoding, sort: 'desc', limit: undefined }, ctrl);
    return donut(groupOther(pairs, lim), { panel, yField, t });
  }

  const { pairs, yField, marked, sources } = resolve(rows, panel.encoding, ctrl);
  const ctx: BuildCtx = { panel, yField, t, highlight: resolveHighlight(panel.encoding, ctrl), caption, marked,
    band: resolveBand(rows, panel.encoding),
    emphasis: panel.encoding.emphasis
      ? (panel.encoding.emphasis.startsWith('@') ? one(ctrl[panel.encoding.emphasis.slice(1)]) : panel.encoding.emphasis)
      : undefined };
  if (type === 'divbars') return divbars(pairs, sources, ctx);
  if (type === 'choropleth') return choropleth(pairs, ctx);
  if (type === 'stair') return stair(pairs, ctx);
  if (type === 'bar' && panel.encoding.horizontal) return horizontalBar(pairs, ctx);
  return lineOrBar(type === 'bar' ? 'bar' : 'line', pairs, ctx, agg);
}

// Stat tiles (chart:'stat') — computed over the filtered window, returned as
// a {value,label} pair the renderer drops into an HTML tile (not ECharts).
export function computeStat(panel: PanelSpec, rows: Row[], ctrl: CtrlState): { value: string; label: string; delta?: string } {
  // Unit words live in the LABEL, where there is room for them, and the move
  // beside the number stays a glyph and a figure: the tile is read at a
  // glance, and "▲1.09 pts on the month" is a sentence to be read instead.
  // The full statement is a hover away on the label's own tooltip.
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
  // The latest published reading of whatever `y` names, and how it moved since
  // the month before it. One implementation for the index tile and the rate
  // tile: the unit suffix on the field decides how both numbers print, so the
  // index moves in points and the rate moves in percentage points without the
  // tile having to know which it is holding.
  //
  // "Latest" is the latest month that actually carries the field, not the
  // latest month in the dataset — the 2024 base published eleven index months
  // before it could publish a first rate, and a tile reading the last row
  // would have shown a dash through all of them.
  if (panel.stat === 'cpiLatest') {
    const yf = ctrlField(panel.encoding.y, ctrl);
    const r = applyFilters(rows, panel.encoding, ctrl)
      .filter((row) => Number.isFinite(Number(row[yf])))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!r.length) return { value: '—', label: panel.title };
    const last = r[r.length - 1];
    const prev = r[r.length - 2];
    const v = Number(last[yf]);
    const label = `${panel.title} · ${monthLabel(String(last.date).slice(0, 7))}`;
    // A tile quotes the published figure, so it keeps the decimals the source
    // published: MoSPI's June rate is 4.38%, and a tile reading 4.4% beside a
    // move of 0.45 pp is a tile rounding its own headline. Charts keep the
    // site-wide axis precision, where a second decimal is noise.
    const value = yf.endsWith('_pct') ? `${v.toFixed(2)}%` : fmt(yf, v);
    if (!prev) return { value, label };
    // The MOVE is always in the y field's own unit — a rate that went 3.93 to
    // 4.38 rose by 0.45 percentage points, never by 0.45 per cent — which the
    // label states once rather than the number repeating it.
    const d = v - Number(prev[yf]);
    const delta = Math.abs(d) < 0.005 ? 'flat' : `${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(2)}`;
    return { value, delta, label };
  }
  // The top or bottom member of whatever the panel's filters have selected:
  // the highest and the lowest state for the chosen series, month and sector,
  // one tile each. Which end is a question of direction, so it is read off the
  // encoding's own `sort` rather than needing a second stat name, and the
  // member is named by `x` — the same field the map keys its regions by.
  // Nothing is derived here beyond a maximum: the value is the published
  // reading and the label is its member's name.
  if (panel.stat === 'extreme') {
    const yf = ctrlField(panel.encoding.y, ctrl);
    const kf = panel.encoding.x ?? 'state';
    const r = applyFilters(rows, panel.encoding, ctrl)
      .filter((row) => Number.isFinite(Number(row[yf])));
    if (!r.length) return { value: '—', label: panel.title };
    const asc = panel.encoding.sort === 'asc';
    const pick = r.reduce((a, b) => {
      const va = Number(a[yf]), vb = Number(b[yf]);
      return (asc ? vb < va : vb > va) ? b : a;
    });
    // Dated like the other point-in-time tiles: these sit ABOVE the panel whose
    // bar carries the month control, so without the month on the label they are
    // two numbers with no date in sight.
    const when = String(pick.month ?? pick.date ?? '').slice(0, 7);
    const member = String(pick[kf] ?? '');
    // A rate on a tile keeps a decimal at every magnitude. `fmt` drops to whole
    // numbers past 10, which the axis can afford and a tile naming the highest
    // month on a fifty-seven-year line cannot: 34.68 is not 35.
    const v = Number(pick[yf]);
    // A rate that ROUNDS to zero drops its sign: "-0%" is a claim about the
    // second decimal made by a tile that only shows the first.
    const value = yf.endsWith('_pct') ? `${grp(v, 1).replace(/^-(?=0(\.0)?$)/, '')}%` : fmt(yf, v);
    // Where the member IS a month — that highest print — it names itself rather
    // than being dated a second time. The month goes where every other tile's
    // member goes, written out, because here it is the reading and not the axis.
    if (/^\d{4}-\d{2}$/.test(member)) {
      return { value, delta: longMonthLabel(member), label: panel.title };
    }
    return { value, delta: member,
      label: /^\d{4}-\d{2}$/.test(when) ? `${panel.title} · ${monthLabel(when)}` : panel.title };
  }
  // A count out of a total, read off ONE row: `y` is the count, `y2` the total,
  // `yLabel` the word they are counted in, and `x` (optional) a field holding
  // the month the counting runs from. Both numbers show, because the count on
  // its own is a number nobody can size.
  if (panel.stat === 'countOf') {
    const r = applyFilters(rows, panel.encoding, ctrl);
    const row = r[0];
    const n = row ? Number(row[ctrlField(panel.encoding.y, ctrl)]) : NaN;
    const of = row ? Number(row[panel.encoding.y2 ?? '']) : NaN;
    if (!Number.isFinite(n) || !Number.isFinite(of)) return { value: '—', label: panel.title };
    const from = panel.encoding.x ? String(row![panel.encoding.x] ?? '') : '';
    return {
      value: `${grp(n)} of ${grp(of)}`,
      delta: panel.encoding.yLabel ?? '',
      label: /^\d{4}-\d{2}$/.test(from) ? `${panel.title} · since ${longMonthLabel(from)}` : panel.title,
    };
  }
  // How long since something last happened, read off ONE row: `y` is the
  // elapsed count, `x` the field naming when it was, `y2` the reading it had
  // then. A tile that says only "six months" leaves the reader asking six
  // months since what, so the sub-line answers it.
  if (panel.stat === 'sinceEvent') {
    const r = applyFilters(rows, panel.encoding, ctrl);
    const row = r[0];
    const n = row ? Number(row[ctrlField(panel.encoding.y, ctrl)]) : NaN;
    if (!row || !Number.isFinite(n)) return { value: '—', label: panel.title };
    const when = String(row[panel.encoding.x ?? 'date'] ?? '');
    const y2 = panel.encoding.y2;
    const v = y2 ? Number(row[y2]) : NaN;
    const sub = /^\d{4}-\d{2}$/.test(when)
      ? `${panel.title} · ${longMonthLabel(when)}${Number.isFinite(v) ? ` at ${fmt(y2!, v)}` : ''}`
      : panel.title;
    return { value: grp(n), delta: panel.encoding.yLabel ?? '', label: sub };
  }
  // The item the desk is threaded to: its latest published rate, and what it
  // weighs in the hundred. The weight is the sub-line rather than a second tile
  // because it is the thing that makes the rate readable — an item up 40% that
  // is half a rupee in the hundred barely moves anything.
  if (panel.stat === 'cpiItem') {
    const yf = ctrlField(panel.encoding.y, ctrl);
    const r = applyFilters(rows, panel.encoding, ctrl)
      .filter((row) => Number.isFinite(Number(row[yf])))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!r.length) return { value: '—', label: panel.title };
    const last = r[r.length - 1];
    const name = String(last[panel.encoding.x ?? 'item_name'] ?? '');
    const w = Number(last[panel.encoding.y2 ?? 'weight_wt']);
    const value = yf.endsWith('_pct') ? `${Number(last[yf]).toFixed(2)}%` : fmt(yf, Number(last[yf]));
    // Two decimals whatever the magnitude, trailing zero and all: the funnel
    // below prints "₹0.50 of 100" for the same item, and a tile reading 0.5
    // beside it looks like a different number. The interesting items are the
    // ones measured in hundredths of the hundred.
    const weight = Number.isFinite(w) ? `${w.toFixed(2)} in the ₹100` : '';
    return { value, delta: weight, label: `${name} · ${monthLabel(String(last.date).slice(0, 7))}` };
  }
  // The division that moved the headline most in the latest month it can be
  // read for — by the size of the move, either direction, which is the whole
  // point of a contribution: a division pulling the number down is as much a
  // mover as one pushing it up.
  if (panel.stat === 'cpiTopMover') {
    const yf = ctrlField(panel.encoding.y, ctrl);
    const all = applyFilters(rows, panel.encoding, ctrl)
      .filter((row) => Number.isFinite(Number(row[yf])));
    const month = [...new Set(all.map((row) => String(row.date)))].sort().at(-1);
    const r = all.filter((row) => String(row.date) === month);
    if (!r.length) return { value: '—', label: panel.title };
    const by = panel.encoding.series ?? 'division';
    const top = r.reduce((a, b) => (Math.abs(Number(b[yf])) > Math.abs(Number(a[yf])) ? b : a));
    // "pp" is the axis's abbreviation and not everyone's: on a tile the unit
    // is said in words, in the label, where it has room to be said properly.
    const v = Number(top[yf]);
    return { value: `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`, delta: String(top[by]),
      label: `${panel.title}, percentage points · ${monthLabel(String(month).slice(0, 7))}` };
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
