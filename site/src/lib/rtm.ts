// The Rupee Time Machine's arithmetic and its sentences.
//
// DOM-free and ECharts-free on purpose: everything a reader actually SEES on
// /economy/explore/rupee-time-machine — the amount carried across two months,
// the multiplier, the average rate, and the two lines that say so — is
// computed here and unit-tested in tests/rtm/. The page module below it does
// nothing but read controls, call these, and draw.
//
// The dataset is built by scripts/build-rupee-time-machine-data.mjs, which
// carries the methodology and the gates. All this file needs to know is that
// `idx` is one continuous monthly price level with the latest month at 100, so
// a rupee travels between two months as a ratio of two of its values.

export interface RtmSeam {
  ym: string; from: string; to: string; kind: string;
  factor: number | null; exit: string | null;
}
export interface RtmSegment { series: string; from: string; to: string; basis: string }

/** One calendar year of the price line, as the year pages read it: the mean of
 *  the year's monthly index values, and the change from the previous year's
 *  mean. `partial` is set on the current year only, and says how far it runs
 *  ('to June'); a part-year has no `infl`, because six months against twelve
 *  is not a year. */
export interface RtmYear {
  y: number;
  avg: number;
  infl: number | null;
  partial?: string;
}

export interface RtmData {
  asOf: string;
  asOfLabel: string;
  start: string;
  months: string[];
  idx: number[];
  years: RtmYear[];
  segments: RtmSegment[];
  seams: RtmSeam[];
  sources: { spine: string };
  generated: string;
}

export interface RtmParams { amount: number; from: string; to: string }

/* The default view, and the one the deep link falls back to field by field.
   January 2000 rather than the start of the series: a reader who has not
   touched a control should land on a span they lived through. */
export const DEFAULT_AMOUNT = 100;
export const DEFAULT_FROM = '2000-01';
/** Amounts above this are refused rather than clamped: ₹1,00,00,00,000. */
export const MAX_AMOUNT = 1_000_000_000;

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ── month arithmetic ──────────────────────────────────────────────────────
// Months are 'YYYY-MM' strings and an ordinal is year*12 + (month-1). Nothing
// here goes near a Date: a Date is a moment in a time zone, and every month in
// this file is a label on an axis.

export const ymIndex = (ym: string): number => +ym.slice(0, 4) * 12 + (+ym.slice(5) - 1);
export const ymFrom = (i: number): string =>
  `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const monthsBetween = (a: string, b: string): number => ymIndex(b) - ymIndex(a);
export const isYm = (v: unknown): boolean => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** 'January 2000' — a month as a sentence rather than as an axis tick. */
export const longMonth = (ym: string): string => `${MONTH_NAMES[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;

/** Pull a month inside the span the data covers. Used when a year change
 *  strands a month the series does not reach (December 2026, say). */
export function clampMonth(ym: string, data: Pick<RtmData, 'start' | 'asOf'>): string {
  if (ym < data.start) return data.start;
  if (ym > data.asOf) return data.asOf;
  return ym;
}

/** Oldest first. The machine always travels forward; a reader who picks the
 *  two months in the other order gets the same answer, not an error. */
export function order(from: string, to: string): { from: string; to: string } {
  return ymIndex(from) <= ymIndex(to) ? { from, to } : { from: to, to: from };
}

// ── the arithmetic ────────────────────────────────────────────────────────

/** How much more a thing costs at month j than at month i. */
export function multiplier(idx: number[], i: number, j: number): number {
  return idx[j] / idx[i];
}

/** The multiplier restated as a rate per year, in percent. Twelve months apart
 *  this is exactly the year-on-year change, which is what the test pins. */
export function annualized(mult: number, monthsApart: number): number {
  if (!monthsApart) return 0;
  return (mult ** (12 / monthsApart) - 1) * 100;
}

// ── formatting ────────────────────────────────────────────────────────────

const grp = (v: number, d: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * A rupee figure, without the ₹ — every sentence below carries its own glyph,
 * so the symbol lives in the copy rather than in the number.
 *
 * Ten rupees is where the paise stop mattering: above it the figure rounds to
 * the rupee, below it two decimals are the difference between an answer and a
 * shrug. The sign is taken off a value that rounds to zero, because "−₹0" is
 * an arithmetic artefact rather than a price.
 */
export function fmtINR(v: number): string {
  const a = Math.abs(v);
  const d = a >= 10 ? 0 : 2;
  const rounded = +a.toFixed(d);
  const sign = v < 0 && rounded !== 0 ? '−' : '';
  return sign + grp(rounded, d);
}

/** '4.6×' below ten, '54×' above it: past ten the decimal is noise on a
 *  number nobody reads to one part in a hundred. */
export function fmtMult(m: number): string {
  return grp(m >= 10 ? Math.round(m) : +m.toFixed(1), m >= 10 ? 0 : 1) + '×';
}

/** An average annual rate, one decimal. A span can fall as well as rise, so
 *  the sign is real — and it is the typographic minus the rest of the site
 *  sets, not a hyphen. A rate that rounds to zero loses it, same as a rupee. */
export function fmtRate(r: number): string {
  const rounded = +Math.abs(r).toFixed(1);
  return (r < 0 && rounded !== 0 ? '−' : '') + grp(rounded, 1);
}

/**
 * A cumulative change in percent, unsigned — the sentence around it says
 * "up" or "down", so the number never carries its own sign. From 100 up the
 * decimal is noise ("5,317"); below it the decimal is the answer ("35.1").
 */
export function fmtCum(cum: number): string {
  const a = Math.abs(cum);
  return a >= 100 ? grp(Math.round(a), 0) : grp(+a.toFixed(1), 1);
}

/**
 * A rupee figure for a chart edge — an axis tick or the melt's end label —
 * where a fourteen-character crore amount clips against the frame that a
 * sentence would simply wrap around. From one crore up the figure compacts to
 * the site's own unit ("₹1.85 Cr", "₹120 Cr"); below that it is fmtINR with
 * the glyph attached, whole-rupee ticks staying whole.
 */
export function fmtTick(v: number): string {
  if (Math.abs(v) >= 1e7) return `₹${fmtINR(v / 1e7)} Cr`;
  return '₹' + (Number.isInteger(v) ? v.toLocaleString('en-IN') : fmtINR(v));
}

/**
 * How long the journey was, in the unit a reader would use out loud.
 * Under two years a span is months; from two years it is years, rounded to the
 * nearest whole one. Exactly twelve months is "a year" — "12 months" is how a
 * contract says it, not how a person does. One month is singular for the same
 * reason: two adjacent months are a pair a reader can pick in one click, and
 * "1 months" is a sentence nobody wrote on purpose.
 */
export function spanLabel(months: number): string {
  const n = Math.abs(months);
  if (n === 1) return '1 month';
  if (n === 12) return 'a year';
  if (n < 24) return `${n} months`;
  return `${Math.round(n / 12)} years`;
}

// ── the answer ────────────────────────────────────────────────────────────

/** Shown in place of the primary sentence and its two lines when the two
 *  months are the same one. */
export const SAME_MONTH_LINE = 'Same month, same rupee. Pick two different months to travel.';

export interface RtmAnswer {
  /** The pair as computed: oldest first, whatever order the reader picked. */
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  amount: number;
  same: boolean;
  monthsApart: number;
  /** Prices at `to` over prices at `from`. */
  mult: number;
  /** `mult` as an average annual rate, in percent. */
  rate: number;
  /** What the amount at `from` costs at `to`. */
  result: number;
  /** What the amount at `to` would have spent like at `from`. */
  inverse: number;
  primary: string;
  multiplierLine: string;
  inverseLine: string;
}

/**
 * Everything the result region says, from an amount and two months.
 *
 * The sentences are built here rather than in the page so the exact strings a
 * reader sees are under test, not just the numbers inside them.
 */
export function answer(data: RtmData, params: RtmParams): RtmAnswer {
  const { from, to } = order(clampMonth(params.from, data), clampMonth(params.to, data));
  const i = ymIndex(from) - ymIndex(data.start);
  const j = ymIndex(to) - ymIndex(data.start);
  const amount = params.amount;
  const fromLabel = longMonth(from);
  const toLabel = longMonth(to);
  const same = from === to;
  const monthsApart = j - i;
  const mult = multiplier(data.idx, i, j);
  const rate = annualized(mult, monthsApart);
  const result = amount * mult;
  const inverse = amount / mult;
  const cum = (mult - 1) * 100;
  return {
    from, to, fromLabel, toLabel, amount, same, monthsApart, mult, rate, result, inverse,
    // Money-first, the way the question arrives: "my father's salary was ₹800
    // in 1985 — what is that today?" The basket precision lives in the fold.
    primary: `₹${fmtINR(amount)} in ${fromLabel} amounts to about ₹${fmtINR(result)} in ${toLabel}.`,
    multiplierLine: `Prices multiplied ${fmtMult(mult)} in ${spanLabel(monthsApart)}: `
      + `${cum < 0 ? 'down' : 'up'} ${fmtCum(cum)}%, an average of ${fmtRate(rate)}% a year.`,
    inverseLine: `Run it backwards: ₹${fmtINR(amount)} in ${toLabel} amounts to about `
      + `₹${fmtINR(inverse)} in ${fromLabel}.`,
  };
}

/**
 * The primary sentence with its two rupee figures marked up, so the page can
 * set them large without holding a second copy of the wording.
 *
 * It lives here rather than in the page for one reason: the plain sentence and
 * the marked-up one must never drift, and the only way to know they have not
 * is to build the second from the first's own parts and test that stripping
 * the tags gives the first back. Every value interpolated is a number this
 * module formatted or a month label it wrote, so there is nothing to escape.
 */
export function primaryHtml(a: RtmAnswer): string {
  return `<span class="rtm-fig">₹${fmtINR(a.amount)}</span> in ${a.fromLabel} amounts to `
    + `about <span class="rtm-fig rtm-result">₹${fmtINR(a.result)}</span> in ${a.toLabel}.`;
}

/**
 * The inverse sentence with its answer figure marked up, so the page can set
 * that one number in the teal accent while the rest of the line stays body
 * type. Same drift-proofing as `primaryHtml`: built from the same parts and
 * pinned by a test that strips the tags and gets `inverseLine` back.
 */
export function inverseHtml(a: RtmAnswer): string {
  return `Run it backwards: ₹${fmtINR(a.amount)} in ${a.toLabel} amounts to about `
    + `<span class="rtm-inv-fig">₹${fmtINR(a.inverse)}</span> in ${a.fromLabel}.`;
}

/** The chart's kicker: the line under it is one amount, restated per month. */
export function chartKicker(amount: number, fromLabel: string): string {
  return `What ₹${fmtINR(amount)} from ${fromLabel} amounts to, month by month`;
}

/**
 * The cost line: for every month from `from` through `to`, what the basket the
 * amount bought at `from` costs at that month. It rises as prices rise, and it
 * ends on exactly the `result` figure the primary sentence prints — the same
 * arithmetic (`amount × multiplier`) in the same order, so the saffron number
 * in the sentence and the saffron number on the line's end can never round
 * apart.
 *
 * The pair is clamped and ordered here as well as in `answer`, because a
 * reader who picks their months backwards must get the same chart as the same
 * sentences, not an empty slice.
 */
export function costSeries(data: RtmData, amount: number, from: string, to: string):
{ months: string[]; values: number[] } {
  const pair = order(clampMonth(from, data), clampMonth(to, data));
  const i = ymIndex(pair.from) - ymIndex(data.start);
  const j = ymIndex(pair.to) - ymIndex(data.start);
  const months = data.months.slice(i, j + 1);
  const values = months.map((_, k) => amount * multiplier(data.idx, i, i + k));
  return { months, values };
}

// ── the year pages ────────────────────────────────────────────────────────
//
// /economy/explore/rupee-time-machine/1990 answers the question the way it is
// typed into a search box — a year, not a month — so it takes the year at its
// twelve-month average. That is the only honest reading of a whole year:
// January 1990 and December 1990 are eleven per cent apart, and picking either
// would silently answer a narrower question than the one asked.
//
// These build the page's sentences here rather than in the .astro frontmatter
// for the same reason `answer` does: the strings are what a reader quotes, so
// they belong where the tests can see them.

/** Every year page prices the same note. */
export const YEAR_AMOUNT = 100;

/** The year block's entry for a calendar year. Missing is a build error, not a
 *  fallback: a page that exists for a year the dataset does not carry would be
 *  a page of blanks. */
export function yearOf(data: RtmData, y: number): RtmYear {
  const e = data.years.find((r) => r.y === y);
  if (!e) throw new Error(`the price line carries no year ${y}`);
  return e;
}

/** The most recent year in the block — the current, usually partial, one. */
export const latestYear = (data: RtmData): RtmYear => data.years[data.years.length - 1];

export interface RtmYearAnswer {
  year: number;
  /** The year the answer lands in: the latest the block carries. */
  latest: RtmYear;
  yearLabel: string;
  /** 'June 2026' — the answer is stated at the month the data actually ends. */
  toLabel: string;
  amount: number;
  monthsApart: number;
  mult: number;
  rate: number;
  /** What ₹100 of `year` costs at the month the line ends — the headline
   *  names that month, so the figure is that month's, not a part-year mean. */
  result: number;
  /** What ₹100 at the line's last month would have spent like in `year`. */
  inverse: number;
  headline: string;
  multiplierLine: string;
  inverseLine: string;
  buysLine: string;
}

/** Everything a year page says, from the year block alone. */
export function yearAnswer(data: RtmData, year: number): RtmYearAnswer {
  const base = yearOf(data, year);
  const latest = latestYear(data);
  const amount = YEAR_AMOUNT;
  /* The base is the year's average — that is what "₹100 in 1990" means and the
     headline says so. The destination is NOT an average: the sentence names
     the month the line ends at, so it prices at that month. The table is the
     other way around on its last row (a part-year average, labelled as one);
     the two answer different questions and each is labelled with its own. */
  const endIdx = data.idx[data.idx.length - 1];
  const mult = endIdx / base.avg;
  const monthsApart = (latest.y - year) * 12;
  const rate = annualized(mult, monthsApart);
  const result = amount * mult;
  const inverse = amount / mult;
  const cum = (mult - 1) * 100;
  const yearLabel = String(year);
  const toLabel = data.asOfLabel;
  return {
    year, latest, yearLabel, toLabel, amount, monthsApart, mult, rate, result, inverse,
    headline: `₹${fmtINR(amount)} in ${yearLabel} amounts to about ₹${fmtINR(result)} in `
      + `${toLabel}, taking ${yearLabel} at its twelve-month average.`,
    multiplierLine: `Prices multiplied ${fmtMult(mult)} in ${spanLabel(monthsApart)}: `
      + `${cum < 0 ? 'down' : 'up'} ${fmtCum(cum)}%, an average of ${fmtRate(rate)}% a year.`,
    inverseLine: `Run it backwards: ₹${fmtINR(amount)} in ${toLabel} amounts to about `
      + `₹${fmtINR(inverse)} in ${yearLabel}.`,
    buysLine: `A rupee in ${toLabel} buys ${fmtRate(100 / mult)}% of what it bought in ${yearLabel}.`,
  };
}

/** The headline with its two rupee figures wrapped, so the page can set the
 *  answer large and saffron. Same drift-proofing as `primaryHtml`: built from
 *  the same parts, pinned by a test that strips the tags and gets `headline`
 *  back. */
export function yearHeadlineHtml(a: RtmYearAnswer): string {
  return `<span class="rtm-fig">₹${fmtINR(a.amount)}</span> in ${a.yearLabel} amounts to `
    + `about <span class="rtm-fig rtm-result">₹${fmtINR(a.result)}</span> in ${a.toLabel}, `
    + `taking ${a.yearLabel} at its twelve-month average.`;
}

/** One row of a year page's table. Render-ready: a table cell is not a
 *  sentence with copy around it to carry the ₹ and the %, so the strings come
 *  out of here wearing them, and a year with no rate comes out blank. */
export interface RtmYearRow {
  y: number;
  /** '1991', or '2026 (to June)' for the part-year. */
  label: string;
  /** '₹1,039' — what ₹100 of the page's year costs at this year's average. */
  becomes: string;
  /** '8.97%' at one decimal, or '' where the year has no comparable one. */
  infl: string;
}

/** The crawlable table: the page's year through the latest one the block
 *  carries, each priced against the page's year. */
export function yearRows(data: RtmData, year: number): RtmYearRow[] {
  const base = yearOf(data, year);
  return data.years.filter((e) => e.y >= year).map((e) => ({
    y: e.y,
    label: e.partial ? `${e.y} (${e.partial})` : String(e.y),
    becomes: `₹${fmtINR(YEAR_AMOUNT * e.avg / base.avg)}`,
    infl: e.infl == null ? '' : `${fmtRate(e.infl)}%`,
  }));
}

// ── the deep link ─────────────────────────────────────────────────────────

/**
 * Read `?amount=&from=&to=` off a query string.
 *
 * Every field falls back on its own: junk in `from` must not cost the reader
 * the amount they typed. Out of range is a fallback too, not a clamp — a link
 * asking for 1947 is asking for a month this series does not have, and
 * silently answering about August 1969 instead would be a different question
 * answered with a straight face.
 */
export function parseParams(qs: string | URLSearchParams, data: RtmData): RtmParams {
  const p = typeof qs === 'string' ? new URLSearchParams(qs.replace(/^\?/, '')) : qs;
  const out: RtmParams = {
    amount: DEFAULT_AMOUNT,
    from: clampMonth(DEFAULT_FROM, data),
    to: data.asOf,
  };
  const rawAmount = p.get('amount');
  if (rawAmount != null && /^\d+$/.test(rawAmount.trim())) {
    const n = Number(rawAmount.trim());
    if (Number.isInteger(n) && n >= 1 && n <= MAX_AMOUNT) out.amount = n;
  }
  for (const field of ['from', 'to'] as const) {
    const raw = p.get(field);
    if (raw != null && isYm(raw) && raw >= data.start && raw <= data.asOf) out[field] = raw;
  }
  return out;
}

/** The shareable link for the current view, as a query string with its `?`. */
export function toQuery(params: RtmParams): string {
  return `?amount=${params.amount}&from=${params.from}&to=${params.to}`;
}
