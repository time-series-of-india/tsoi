// Build-time spec enrichment. Runs in Astro's SSG server context (node:fs), so
// it never ships to the browser.
//
// Fills every select/multiselect's options (and resolves '@latest' defaults)
// from the desk's own tidy dataset, so the static markup never shows an empty
// control while the client fetch is in flight. On a board that matters more
// than it did on the retired one-desk pages: a lower desk's fetch may not start
// until the reader scrolls near it.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BoardSpec, Control, DashboardSpec } from './runtime';
import { getSpec } from './specs';
import { shapeDataset } from './shapes';
import { monthLabel } from './runtime';

type Row = Record<string, unknown>;

/** Enrich one desk spec against the dataset it names. */
export function enrichSpec(spec: DashboardSpec): DashboardSpec {
  const clone = structuredClone(spec);
  // Anchored to cwd (site/) so it survives Astro's bundling, same as
  // data-through.ts. `dataset` is a site-absolute URL under public/.
  // A spec declaring a `shape` reads a nested document rather than a tidy
  // table; shapeDataset flattens it here exactly as it does in the browser, so
  // the baked options and the live ones can never disagree.
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'public' + clone.dataset), 'utf8'));
  const { rows } = shapeDataset(clone.shape, raw);
  for (const c of clone.globals ?? []) fillOptions(c, rows as Row[]);
  // Panel-level controls are filled here too. They used to be left to the
  // client, which paints them a beat later — fine when a desk kept one series
  // picker, wrong now that a desk's whole control set can live on its panels:
  // the reader would meet a row of empty dropdowns.
  for (const p of clone.panels) for (const c of p.controls ?? []) fillOptions(c, rows as Row[]);
  // Caveats the generator measured rather than the desk asserted. Missing paths
  // are skipped silently: a dataset built before the generator started emitting
  // one should drop the sentence, not fail the build or print "undefined".
  const noted = (note: string | undefined, paths: string[] | undefined) => {
    let out = note;
    for (const path of paths ?? []) {
      const v = path.split('.').reduce<unknown>((o, k) => (o == null ? o : (o as Row)[k]), raw);
      if (typeof v !== 'string' || !v.trim()) continue;
      out = out ? `${out} ${v.trim()}` : v.trim();
    }
    return out;
  };
  clone.note = noted(clone.note, clone.noteFrom);
  for (const p of clone.panels) p.note = noted(p.note, p.noteFrom);
  return clone;
}

function fillOptions(c: Control, rows: Row[]) {
  if ((c.type !== 'select' && c.type !== 'multiselect') || !c.field || c.options) return;
  // Mirror the runtime's scopedRows/populateMulti semantics: honour the
  // control's constant `where` scope (else e.g. PSP names bake into an apps
  // control) and its `defaultTop` (else an empty default bakes in as
  // "everything selected" and the runtime never applies the top-N).
  const scoped = c.where
    ? rows.filter((r) => Object.entries(c.where!).every(([f, v]) => String(r[f]) === v))
    : rows;
  const field = c.field;
  const vals = [...new Set(scoped.filter((r) => r[field] != null).map((r) => String(r[field])))].sort();
  // A control whose value is a key rather than a name takes its display text
  // from a second column and its ORDER from that text — 358 items sorted by
  // COICOP code is a list nobody can find "Tomato" in.
  // Which group each option belongs to, where the control files them under
  // headings. Read from the same rows the options came from, so a value that
  // appears under two groups takes whichever the dataset lists first — the
  // groups are a property of the data, not a second list to keep in step.
  const group = new Map<string, string>();
  if (c.groupBy) {
    const gf = c.groupBy;
    for (const r of scoped) {
      const k = String(r[field]);
      if (r[field] != null && r[gf] != null && !group.has(k)) group.set(k, String(r[gf]));
    }
  }
  const grouped = (opts: { value: string; label: string }[]) =>
    (c.groupBy ? opts.map((o) => ({ ...o, group: group.get(o.value) })) : opts);

  if (c.labelField) {
    const lf = c.labelField;
    const label = new Map<string, string>();
    for (const r of scoped) {
      const k = String(r[field]);
      if (r[field] != null && r[lf] != null && !label.has(k)) label.set(k, String(r[lf]));
    }
    c.options = grouped(vals.map((v) => ({ value: v, label: label.get(v) ?? v }))
      .sort((a, b) => a.label.localeCompare(b.label)));
  } else {
  // Same labelling rule the client's `labelOf` applies, so a control rendered
  // once at build (the page bar's, which the client never repopulates) reads
  // identically to the desk copy the client rewrites on every cascade.
    c.options = grouped(vals.map((v) => ({ value: v, label: c.labels?.[v] ?? (field === 'month' ? monthLabel(v) : v) })));
  }

  if (c.type === 'multiselect') {
    const def = Array.isArray(c.default) ? c.default.filter((v) => vals.includes(v)) : [];
    if (def.length) c.default = def;
    else if (c.defaultTop) {
      const by = c.rankBy ?? 'volume_cr';
      const tot: Record<string, number> = {};
      for (const r of scoped) {
        const k = String(r[field]);
        tot[k] = (tot[k] ?? 0) + (Number(r[by]) || 0);
      }
      c.default = vals.slice().sort((a, b) => (tot[b] ?? 0) - (tot[a] ?? 0)).slice(0, c.defaultTop);
    } else c.default = vals;
  } else if (c.default === '@latest') c.default = vals[vals.length - 1];
  else if (typeof c.default === 'string' && !vals.includes(c.default)) c.default = vals[0];
}

export interface EnrichedDesk {
  spec: DashboardSpec;
  anchor: string;
  title: string;
  info: string;
  /** The dataset's own vintage, if it declares one, and the grain to print it at. */
  asOf?: string;
  asOfGrain?: string;
}

/** A dataset's vintage, read at build time so the chip never arrives a beat late. */
function datasetAsOf(spec: DashboardSpec): { asOf?: string; asOfGrain?: string } {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'public' + spec.dataset), 'utf8'));
  return { asOf: raw?.asOf, asOfGrain: raw?.asOfGrain };
}

/**
 * Resolve a board's desks to enriched DashboardSpecs, in board order. Throws on
 * a desk naming a dashboard slug that does not exist — a typo in a BoardSpec
 * should fail the build, not render a board with a desk quietly missing.
 */
export function enrichBoard(board: BoardSpec): EnrichedDesk[] {
  return board.desks.map((d) => {
    const spec = getSpec(d.dashboard);
    if (!spec) throw new Error(`board '${board.slug}': no dashboard spec named '${d.dashboard}'`);
    return { spec: enrichSpec(spec), anchor: d.anchor, title: d.title, info: d.info, ...datasetAsOf(spec) };
  });
}

/**
 * The board's own page-bar controls, filled from whichever desk owns each one.
 *
 * A hoisted control is the SAME control as the desk's (that is what "hoisted"
 * means — see BoardSpec.globals), so rather than read a dataset a second time
 * this borrows the already-enriched copy's options and resolved default. A
 * page-level month select therefore offers exactly the months its desks do,
 * and '@latest' resolves to the same month in the bar as inside the desk.
 * Controls no desk claims (payments' page-level range picker) pass through.
 */
export function enrichBoardGlobals(board: BoardSpec, desks: EnrichedDesk[]): Control[] {
  return (board.globals ?? []).map((c) => {
    for (const d of desks) {
      const owned = (d.spec.globals ?? []).find((g) => g.id === c.id);
      if (owned) return { ...c, options: owned.options ?? c.options, default: owned.default };
    }
    return c;
  });
}
