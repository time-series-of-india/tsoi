// Rows a desk fetches only when something asks for them.
//
// The mechanism is spec-level (see DashboardSpec.lazyRows), not board-level: a
// dataset that would be enormous whole ships one small document per value of
// one control, and the desk swaps whichever document it last fetched for the
// one the reader has just chosen. Nothing here knows what an item is.
//
// Kept out of client.ts because the interesting parts have nothing to do with
// the DOM: which URL a value resolves to, what happens when a slow fetch lands
// after a faster one, and what the desk is left holding when a fetch fails.
// The caller supplies the fetching, the shaping and the redrawing.
import type { DashboardSpec, Row } from './runtime';

export type LazySpec = NonNullable<DashboardSpec['lazyRows']>;

/**
 * The document URL a control value resolves to, or null when the main dataset
 * knows of no such document.
 *
 * Deliberately a LOOKUP rather than a pattern. The generator content-hashes
 * each document and writes the hash into its filename, then carries that
 * filename in the main dataset; a client that built the URL itself would ask
 * for a name the generator never wrote, and — worse, once `/data/*` is served
 * immutable — could be handed a stale one for ever.
 */
export function lazyUrl(lazy: LazySpec, rows: Row[], value: string): string | null {
  if (!value) return null;
  const row = rows.find((r) =>
    (!lazy.where || Object.entries(lazy.where).every(([f, v]) => String(r[f]) === v))
    && String(r[lazy.match]) === value
    && r[lazy.file] != null && r[lazy.file] !== '');
  return row ? lazy.base + String(row[lazy.file]) : null;
}

export interface LazyRowsDeps {
  lazy: LazySpec;
  /** The rows the desk was built with. Lazy rows are added to these, never merged into them. */
  baseRows: Row[];
  fetchDoc: (url: string) => Promise<unknown>;
  shape: (doc: unknown) => Row[];
  /** Hand the desk its new row pool and redraw. Called once per settled load. */
  onRows: (rows: Row[]) => void;
  warn?: (message: string, err: unknown) => void;
}

export interface LazyRows {
  /** Fetch (or recall) the document for `value` and hand the desk its rows. */
  load(value: string): Promise<void>;
  /** The value whose rows the desk is currently holding, or null. */
  readonly loaded: string | null;
  /** The value most recently asked for, settled or still in flight. */
  readonly requested: string | null;
}

/**
 * A loader for one desk's lazy rows.
 *
 * Three behaviours worth naming, because each is a bug that would otherwise
 * only show up on a slow connection:
 *
 *   cached      a value fetched once is never fetched again, keyed by URL — so
 *               a reader going back and forth between two items pays once.
 *   stale-guard a fetch that lands after a LATER pick was made is dropped. Two
 *               taps in quick succession must not leave the desk showing the
 *               first one because its response was slower.
 *   failure     the desk falls back to its base rows and stays alive: the
 *               panels that wanted the document draw their empty state, and the
 *               URL that failed is named in the console.
 */
export function createLazyRows(deps: LazyRowsDeps): LazyRows {
  const cache = new Map<string, Row[]>();
  let wanted: string | null = null;
  let loaded: string | null = null;

  const settle = (value: string, extra: Row[] | null) => {
    if (wanted !== value) return;   // a later pick overtook this one
    loaded = value;
    deps.onRows(extra ? deps.baseRows.concat(extra) : deps.baseRows);
  };

  return {
    get loaded() { return loaded; },
    get requested() { return wanted; },
    async load(value: string) {
      wanted = value;
      const url = lazyUrl(deps.lazy, deps.baseRows, value);
      if (!url) { settle(value, null); return; }
      const cached = cache.get(url);
      if (cached) { settle(value, cached); return; }
      let shaped: Row[] | null = null;
      try {
        shaped = deps.shape(await deps.fetchDoc(url));
        cache.set(url, shaped);
      } catch (err) {
        (deps.warn ?? ((m, e) => console.warn(m, e)))(
          `[board] could not load ${url}; panels reading it will render empty`, err);
      }
      settle(value, shaped);
    },
  };
}
