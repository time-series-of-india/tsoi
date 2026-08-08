// Dataset SHAPES — the bridge between a generator's own JSON and the tidy
// `{ rows: Row[] }` every desk expects.
//
// The dashboard machinery reads one flat table per desk: filters map a control
// id onto a row field of the same name, and every chart kind resolves
// x/series/y off that table. Most generators emit exactly that. The inflation
// board's contract (docs/explore-inflation-board-spec.md § Dataset contract)
// deliberately does not: it is a nested document — a long spine, a modern
// window per sector, contribution months, an aggregation tree, per-state
// values, two baskets — because the generator's own gates read more clearly
// against that structure, and because the funnel widget consumes the tree
// whole rather than as rows.
//
// So the translation happens here, once, and both callers use it: enrich.ts at
// build time (to fill the controls' option lists) and client.ts at runtime.
// The generator's field spellings are the frozen half of the contract; the
// tidy field names below are this file's own, and carry the unit suffixes the
// runtime formats by (`_pct` percent, `_pp` percentage points of the headline,
// `_pts` index points, `_wt` a share of the basket — see runtime.ts's fmt).
import type { Row } from './runtime';

export interface ShapedDataset {
  rows: Row[];
  asOf?: string;
  /** Non-tabular slices a `widget` panel mounts directly (see client.ts). */
  widgets?: Record<string, unknown>;
}

const SECTOR_LABEL: Record<string, string> = { combined: 'Combined', rural: 'Rural', urban: 'Urban' };
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** A seam: the month, and what changed there, in the generator's own words. */
type Seam = { ym: string; from?: string; to?: string; kind?: string; factor?: number | null };
// Two kinds of seam, and the difference matters to the reader. A LINK
// multiplies the older index by a ratio so it sits on the newer base, which
// makes the twelve year-on-year rates that straddle it comparisons between two
// baskets. A HANDOVER is just one published series ending where the next
// begins, with the source itself responsible for whatever continuity there is.
const seamText = (s: Seam) => {
  const move = s.from && s.to ? `${s.from} to ${s.to}` : (s.kind ?? 'series change');
  return s.factor != null
    ? `${move}, ratio-linked by a factor of ${s.factor}`
    : `${move}, a handover carrying no linking factor`;
};

/**
 * Flatten the inflation board's nested document into one tidy table.
 *
 * Row kinds (the `kind` field discriminates them):
 *   spine   date, infl_pct, seam, seam_label, seam_linked, limited, limited_note
 *   modern  date, sector, idx_pts, infl_pct
 *   contrib date, month, code, division, weight_wt, infl_pct, contrib_pp,
 *           gen_pct, residual_pp
 *   map     date, month, code, code_name, state, region, sector, infl_pct,
 *           imputed
 *   series  date, state, region, sector, code, code_name, idx_pts, infl_pct
 *   tree    code, parent, level, node, division (items only), weight_wt,
 *           idx_pts, infl_pct
 *   item    date, month, item, code, item_name, file, weight_wt, idx_pts, infl_pct
 *   decade  decade, infl_pct
 *   band    lo, hi, mid, from, since, total, inside, outside, elapsed,
 *           breach_month, breach_pct
 *   basket  sector, code, division, w2012_wt, w2024_wt
 */
export function shapeInflation(raw: any): ShapedDataset {
  const rows: Row[] = [];

  // ── the long spine ──────────────────────────────────────────────────────
  const spine = raw?.headline?.spine ?? {};
  // April and May 2020 were priced under lockdown collection limits, not left
  // uncollected: MoSPI published indices for both months and withheld only the
  // rates. The generator is renaming the flag from `interpolated` to
  // `limitedCollection` to say so; read either, because the two builds cross.
  const limited = new Set<string>((spine.limitedCollection ?? spine.interpolated ?? []) as string[]);
  // Deliberately NOT falling back to the old `interpolatedNote`. That sentence
  // asserts the months were "monotone-interpolated from their neighbours, not
  // observed", which is the claim being corrected — quoting it against a stale
  // build would print the error the review caught. Take the new note when it
  // exists, otherwise say the honest minimum ourselves.
  const limitedNote = String(spine.limitedCollectionNote
    ?? 'Priced under lockdown collection limits: the index was published, the rate was not, so this rate is computed from the published index.');
  // `spine.quantizationNote` is deliberately NOT flattened onto the rows: it is
  // a paragraph about the whole series, not a fact about any month, and it
  // reaches the desk through the spec's `noteFrom` (see enrich.ts) where it can
  // wrap as prose instead of clipping as a chart annotation.
  const seams = new Map<string, Seam>();
  for (const s of (spine.seams ?? []) as Seam[]) {
    if (s?.ym) seams.set(s.ym, s);
  }
  for (const p of (spine.points ?? []) as { date: string; infl: number }[]) {
    const v = num(p.infl);
    if (v == null) continue;
    const isLimited = limited.has(p.date);
    const seam = seams.get(p.date);
    rows.push({
      kind: 'spine', date: p.date, infl_pct: v,
      seam: seam ? 1 : 0, seam_label: seam ? seamText(seam) : '',
      // only a ratio link makes the following year's rates cross-basket; a
      // handover leaves that to the source, so only links get banded
      seam_linked: seam && seam.factor != null ? 1 : 0,
      limited: isLimited ? 1 : 0, limited_note: isLimited ? limitedNote : '',
    });
  }

  // ── the modern window, one series per sector ────────────────────────────
  for (const [key, series] of Object.entries((raw?.headline?.modern ?? {}) as Record<string, any[]>)) {
    const sector = SECTOR_LABEL[key] ?? key;
    for (const p of series ?? []) {
      const row: Row = { kind: 'modern', date: p.date, sector };
      const idx = num(p.idx); if (idx != null) row.idx_pts = idx;
      const infl = num(p.infl); if (infl != null) row.infl_pct = infl;
      rows.push(row);
    }
  }

  // ── contributions to the headline, division by division ─────────────────
  for (const m of (raw?.contribution?.months ?? []) as any[]) {
    for (const d of m.divisions ?? []) {
      rows.push({
        kind: 'contrib', date: m.date, month: m.date,
        code: d.code, division: d.name,
        weight_wt: num(d.weight) ?? 0,
        infl_pct: num(d.infl) ?? 0,
        contrib_pp: num(d.contrib) ?? 0,
        gen_pct: num(m.gen) ?? 0,
        residual_pp: num(m.residual) ?? 0,
      });
    }
  }

  // ── state by state ──────────────────────────────────────────────────────
  const codeName = new Map<string, string>(
    ((raw?.map?.codes ?? []) as { code: string; name: string }[]).map((c) => [c.code, c.name]));
  // The join key is `region`, the upper-case india_states.json feature name the
  // generator resolves. `state` rides along as MoSPI spells it, for display.
  for (const v of (raw?.map?.values ?? []) as any[]) {
    const infl = num(v.infl);
    if (infl == null) continue;
    rows.push({
      kind: 'map', date: v.date, month: v.date,
      // The headline and its twelve divisions are one KIND of series; the
      // curated items below are another. The picker files them under separate
      // headings by this field, and the swarm — which is about the divisions —
      // scopes itself to it rather than gaining fourteen rows it cannot use.
      level: 'series',
      code: v.code, code_name: codeName.get(v.code) ?? v.code,
      state: v.state, region: v.region,
      sector: v.sector, infl_pct: infl, imputed: v.imputed ? 1 : 0,
    });
  }

  // ── the index through time, All India and every state ───────────────────
  // The generator ships levels only, keyed `state|sector|code` against one
  // month axis (see its `series` block on why the rate is not repeated there).
  // The rate a panel wants beside a level is looked up from the blocks that
  // already publish it: the map for states, headline.modern for the All-India
  // headline, and the contribution months for the All-India divisions. So one
  // published number stays in one place and the join happens here.
  const yoy = new Map<string, number>();
  for (const v of (raw?.map?.values ?? []) as any[]) {
    const infl = num(v.infl);
    if (infl != null) yoy.set(`${v.state}|${v.sector}|${v.code}|${v.date}`, infl);
  }
  for (const [key, arr] of Object.entries((raw?.headline?.modern ?? {}) as Record<string, any[]>)) {
    for (const p of arr ?? []) {
      const infl = num(p.infl);
      if (infl != null) yoy.set(`All India|${SECTOR_LABEL[key] ?? key}|GEN|${p.date}`, infl);
    }
  }
  for (const m of (raw?.contribution?.months ?? []) as any[]) {
    for (const d of m.divisions ?? []) {
      const infl = num(d.infl);
      if (infl != null) yoy.set(`All India|Combined|${d.code}|${m.date}`, infl);
    }
  }
  const series = raw?.series ?? {};
  const seriesMonths = (series.months ?? []) as string[];
  const seriesCodeName = new Map<string, string>(
    ((series.codes ?? []) as { code: string; name: string }[]).map((c) => [c.code, c.name]));
  const seriesRegion = new Map<string, string>(
    ((series.states ?? []) as { state: string; region: string }[]).map((s) => [s.state, s.region]));
  for (const [key, values] of Object.entries((series.values ?? {}) as Record<string, (number | null)[]>)) {
    const [state, sector, code] = key.split('|');
    for (let i = 0; i < values.length; i++) {
      const idx = num(values[i]);
      if (idx == null) continue;
      const date = seriesMonths[i];
      const row: Row = {
        kind: 'series', date, state, region: seriesRegion.get(state) ?? state,
        sector, code, code_name: seriesCodeName.get(code) ?? code, idx_pts: idx,
      };
      const infl = yoy.get(`${state}|${sector}|${code}|${date}`);
      if (infl != null) row.infl_pct = infl;
      rows.push(row);
    }
  }

  // ── the 358 items through time ──────────────────────────────────────────
  // One row per item per month, carrying whichever of the two published
  // measures that month has. The levels run the whole 2024 base and the rates
  // only from its first full year-on-year, so a month with no rate for an item
  // carries none — a chart reading a missing measure draws no point, which is
  // the correct picture of a month nobody has measured yet.
  const itemsRaw = raw?.items ?? {};
  const itemLevelMonths = seriesMonths;
  const itemInflMonths = (itemsRaw.months ?? []) as string[];
  for (const it of (itemsRaw.list ?? []) as { code: string; name: string; weight: number; file?: string }[]) {
    const levels = (itemsRaw.levels?.[it.code] ?? []) as (number | null)[];
    const infls = (itemsRaw.infl?.[it.code] ?? []) as (number | null)[];
    const byMonth = new Map<string, Row>();
    const at = (m: string) => {
      let row = byMonth.get(m);
      if (!row) {
        // `item` holds the CODE because the funnel's picker does: the filters
        // contract maps a control id onto the row field of the same name, so
        // the picker drives this panel without a translation step.
        // `file` is the item's own per-state shard, named by the generator with
        // its content hash in it — the only place a client is allowed to learn
        // that URL from, so a rebuilt shard can never be served from cache
        // under an old name (see DashboardSpec.lazyRows).
        row = { kind: 'item', date: m, month: m, item: it.code, code: it.code,
          item_name: it.name, weight_wt: it.weight, ...(it.file ? { file: it.file } : {}) };
        byMonth.set(m, row);
        rows.push(row);
      }
      return row;
    };
    for (let i = 0; i < levels.length; i++) {
      const v = num(levels[i]);
      if (v != null && itemLevelMonths[i]) at(itemLevelMonths[i]).idx_pts = v;
    }
    for (let i = 0; i < infls.length; i++) {
      const v = num(infls[i]);
      if (v != null && itemInflMonths[i]) at(itemInflMonths[i]).infl_pct = v;
    }
  }

  // ── the aggregation tree, as rows ───────────────────────────────────────
  // The funnel widget mounts `raw.pyramid` whole (it draws the tree, not a
  // table). These rows exist so a CONTROL can be built from the same nodes —
  // the item picker on the funnel's panel bar reads its 358 options here, and
  // the state desk's own item picker files the same 358 under their divisions.
  const treeRaw = (raw?.pyramid?.tree ?? []) as any[];
  // Which division each node hangs under, walked once up the parent chain. The
  // tree carries a parent per node and a division name at the division level;
  // a picker grouping items by division needs the two joined, and doing it here
  // keeps the generator's tree exactly the shape the funnel mounts.
  const parentOf = new Map<string, string>(treeRaw.map((n) => [n.code, n.parent ?? '']));
  const divisionName = new Map<string, string>(
    treeRaw.filter((n) => n.level === 'division').map((n) => [n.code, n.name]));
  const divisionOf = (code: string): string => {
    let c = code;
    for (let hops = 0; hops < 8 && c; hops++) {
      if (divisionName.has(c)) return divisionName.get(c)!;
      c = parentOf.get(c) ?? '';
    }
    return '';
  };
  for (const n of treeRaw) {
    const row: Row = {
      kind: 'tree', code: n.code, parent: n.parent ?? '', level: n.level, node: n.name,
      weight_wt: num(n.weight) ?? 0,
    };
    if (n.level === 'item') row.division = divisionOf(n.code);
    const idx = num(n.idx); if (idx != null) row.idx_pts = idx;
    const infl = num(n.infl); if (infl != null) row.infl_pct = infl;
    rows.push(row);
  }

  // ── the decade averages on the long run ─────────────────────────────────
  // Derived arithmetic over the spine's own published prints (see the
  // generator's gate H1, which recomputes every bar from the shipped points).
  // The panel's copy says so; nothing here is a published figure.
  for (const d of (raw?.decades ?? []) as { decade: string; infl_pct: number }[]) {
    const v = num(d?.infl_pct);
    if (d?.decade && v != null) rows.push({ kind: 'decade', decade: d.decade, infl_pct: v });
  }

  // ── the overlap year, on two rulers ─────────────────────────────────────
  // One row per month per base. `idx_pts` is the REBASED path (each divided by
  // its own January and multiplied by 100, which is what makes the two
  // comparable at all) and `raw_pts` the published level it came from, so the
  // hover can show both and neither is passed off as the other.
  const overlap = raw?.rebase?.overlap;
  for (const [key, basis] of [['b2012', 'The 2012 base'], ['b2024', 'The 2024 base']] as const) {
    const rebased = (overlap?.[key] ?? []) as number[];
    const raws = (overlap?.[key === 'b2012' ? 'raw2012' : 'raw2024'] ?? []) as number[];
    (overlap?.months ?? []).forEach((m: string, i: number) => {
      const v = num(rebased[i]);
      if (v == null) return;
      rows.push({ kind: 'overlap', date: m, basis, idx_pts: v, raw_pts: num(raws[i]) ?? 0 });
    });
  }

  // ── rural weight against urban weight, division by division ─────────────
  // A pivot of `basket.sectors`, not a new figure: the same 2024 weights the
  // slope chart draws, put side by side so one division's two halves can be
  // read as a pair. The combined column is deliberately absent — it is the sum
  // of these two, and a third dot on a dumbbell reads as a third thing.
  const rural = new Map<string, any>(((raw?.basket?.sectors?.rural ?? []) as any[]).map((d) => [d.code, d]));
  const urban = new Map<string, any>(((raw?.basket?.sectors?.urban ?? []) as any[]).map((d) => [d.code, d]));
  for (const [code, r] of rural) {
    const u = urban.get(code);
    if (!u) continue;
    rows.push({
      kind: 'sectorweights', code, division: r.name,
      w_rural_wt: num(r.w2024) ?? 0, w_urban_wt: num(u.w2024) ?? 0,
    });
  }

  // ── the target band ─────────────────────────────────────────────────────
  // One row, not a series: a panel declaring `Encoding.referenceBand` looks up
  // exactly this row and reads four numbers off it. Emitted only when the
  // generator ships the block, so an older build simply draws no band.
  const bandRaw = raw?.band;
  if (bandRaw && num(bandRaw.lo) != null && num(bandRaw.hi) != null) {
    // The band's own record rides on the same row, because it is the same
    // statement: what the target is, and how the months since it began have
    // gone. Three tiles on the long-run desk read these five fields; the
    // generator counted them off the spine and gated the count (H2).
    const st = bandRaw.stats ?? {};
    rows.push({
      kind: 'band', lo: bandRaw.lo, hi: bandRaw.hi,
      ...(num(bandRaw.mid) != null ? { mid: bandRaw.mid } : {}),
      ...(bandRaw.from ? { from: String(bandRaw.from) } : {}),
      ...(st.since ? { since: String(st.since) } : {}),
      ...(num(st.total) != null ? { total: st.total } : {}),
      ...(num(st.inside) != null ? { inside: st.inside } : {}),
      ...(num(st.outside) != null ? { outside: st.outside } : {}),
      ...(num(st.elapsed) != null ? { elapsed: st.elapsed } : {}),
      ...(st.lastBreach?.month ? { breach_month: String(st.lastBreach.month) } : {}),
      ...(num(st.lastBreach?.infl_pct) != null ? { breach_pct: st.lastBreach.infl_pct } : {}),
    });
  }

  // ── dated marks on the long line ────────────────────────────────────────
  // Sparse annotations, each one verified against the spine at build time (see
  // the generator's gate E). They are not a series and never join the axis: a
  // panel declaring `Encoding.events` picks them up by this scope.
  for (const e of (raw?.events ?? []) as { date: string; label: string }[]) {
    if (e?.date && e?.label) rows.push({ kind: 'event', date: e.date, label: e.label });
  }

  // ── the two baskets ─────────────────────────────────────────────────────
  // `basket.sectors` carries all three, combined included; `basket.divisions`
  // is the same combined list under an older key and is only a fallback.
  const sectors = (raw?.basket?.sectors ?? {}) as Record<string, any[]>;
  const baskets: [string, any[]][] = Object.keys(sectors).length
    ? Object.entries(sectors).map(([key, arr]) => [SECTOR_LABEL[key] ?? key, arr ?? []])
    : [['Combined', raw?.basket?.divisions ?? []]];
  for (const [sector, arr] of baskets) {
    for (const d of arr) {
      rows.push({
        kind: 'basket', sector, code: d.code, division: d.name,
        w2012_wt: num(d.w2012) ?? 0, w2024_wt: num(d.w2024) ?? 0,
      });
    }
  }

  return { rows, asOf: raw?.asOf, widgets: { pyramid: raw?.pyramid, rebase: raw?.rebase } };
}

/**
 * One per-item shard, flattened into the rows the state desk's panels already
 * read (see DashboardSpec.lazyRows and the generator's shard block).
 *
 * The shard is a small document — one item, every region that prices it, every
 * sector, on the same month axis the main dataset uses — and it becomes exactly
 * the two row kinds the desk was built on, so the map, the tiles and the lines
 * carry on working with no knowledge that their rows arrived late:
 *
 *   map     one row per region × sector × month that carries a RATE. No
 *           All-India row: it is not a map feature, and it would take a slot in
 *           the colour ramp and in the ranking the two extreme tiles read.
 *   series  the same readings including All India, carrying both measures, so
 *           the lines can draw an index as well as a rate.
 *
 * `level: 'item'` marks them apart from the published CPI series, which is how
 * the swarm keeps to the thirteen series it is about.
 */
export function shapeInflationItem(raw: any): ShapedDataset {
  const rows: Row[] = [];
  const months = (raw?.months ?? []) as string[];
  const name = String(raw?.name ?? raw?.code ?? '');
  const code = String(raw?.code ?? '');
  for (const reg of (raw?.regions ?? []) as any[]) {
    for (const [sector, cell] of Object.entries((reg?.sectors ?? {}) as Record<string, any>)) {
      const idx = (cell?.idx ?? []) as (number | null)[];
      const infl = (cell?.infl ?? []) as (number | null)[];
      months.forEach((date, i) => {
        const level = num(idx[i]);
        const rate = num(infl[i]);
        if (level == null && rate == null) return;
        const common: Row = {
          date, month: date, level: 'item',
          code, code_name: name, division: String(reg?.division ?? raw?.division ?? ''),
          state: String(reg?.state ?? ''), region: String(reg?.region ?? ''), sector,
          ...(level != null ? { idx_pts: level } : {}),
          ...(rate != null ? { infl_pct: rate } : {}),
        };
        if (rate != null && common.region !== 'ALL INDIA') rows.push({ kind: 'map', ...common });
        rows.push({ kind: 'series', ...common });
      });
    }
  }
  return { rows };
}

const SHAPES: Record<string, (raw: any) => ShapedDataset> = {
  inflation: shapeInflation,
  inflationItem: shapeInflationItem,
};

/**
 * Apply a spec's declared `shape` to a fetched dataset. A dataset that already
 * carries `rows` (every generator but the inflation board's) passes straight
 * through, so nothing existing changes.
 */
export function shapeDataset(shape: string | undefined, raw: any): ShapedDataset {
  if (raw && Array.isArray(raw.rows)) return raw as ShapedDataset;
  const fn = shape ? SHAPES[shape] : undefined;
  if (!fn) throw new Error(`dataset has no 'rows' and no known shape (${shape ?? 'none declared'})`);
  return fn(raw);
}
