// Share v1 — the query string a board's state serializes to, and the reading
// back of one. DOM-free on purpose: this is the half that can be wrong in a way
// no screenshot catches, so it is unit-tested without a browser (tests/share).
// The contract it implements is docs/explore-share-v1-spec.md §1.
//
// The scheme exists because a board is six desks and their control ids collide
// — every spec has a `range`, most have a `metric`. So a control the BOARD
// hoists to its page bar serializes bare (`?range=0`) and everything else
// serializes under its desk's own anchor (`?long-run.metric=yoy`). Desk anchors
// carry no dots, so the FIRST dot always splits a key correctly.
import type { CtrlState } from './runtime';

/** A control as this module needs to see it: an id and its resolved default. */
export interface ShareControl {
  id: string;
  /** 'multiselect' is the only type that changes anything here (it holds a list). */
  type?: string;
  /** The default exactly as the client's spec carries it, resolved. */
  default: string | string[];
}

export interface ShareDesk {
  anchor: string;
  controls: ShareControl[];
  ctrl: CtrlState;
}

export interface ShareState {
  /** The controls the board hoists to its page bar, and their live values. */
  hoisted?: { controls: ShareControl[]; ctrl: CtrlState };
  desks: ShareDesk[];
}

/** What a query string carries, before anything knows what a control is. */
export interface ParsedShare {
  hoisted: Record<string, string[]>;
  /** Keyed by desk anchor, then by control id. */
  desks: Record<string, Record<string, string[]>>;
}

/** A percent-decode that survives a hand-mangled link rather than throwing. */
const dec = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const asList = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)];

/**
 * Is this value the control's default? Multiselects compare as SETS — a reader
 * who unticks a state and ticks it back has not changed anything, and a link
 * that says they did is a link that has to be re-read on the other end.
 */
export function isDefault(value: string | string[] | undefined, def: string | string[]): boolean {
  if (Array.isArray(value) || Array.isArray(def)) {
    const a = new Set(asList(value));
    const b = new Set(asList(def));
    return a.size === b.size && [...a].every((v) => b.has(v));
  }
  return String(value ?? '') === String(def ?? '');
}

/* Every value is encodeURIComponent-ed BEFORE the list is joined, so a comma
   inside a value comes out as %2C and can never be mistaken for the separator
   that holds a multiselect together. */
const encodeValue = (v: string | string[]): string =>
  Array.isArray(v) ? v.map((x) => encodeURIComponent(String(x))).join(',') : encodeURIComponent(String(v));

/**
 * The query string for a board's live state, `?` included; the empty string for
 * a board at rest. Only non-default values appear, and only values belonging to
 * a DECLARED control — a derived value (see DashboardSpec.derived) is worked
 * out from the others and would be a second copy of a fact already in the link.
 */
export function serialize(state: ShareState): string {
  const parts: string[] = [];
  const hoistedIds = new Set((state.hoisted?.controls ?? []).map((c) => c.id));
  for (const c of state.hoisted?.controls ?? []) {
    const v = state.hoisted!.ctrl[c.id];
    if (v === undefined || isDefault(v, c.default)) continue;
    parts.push(`${encodeURIComponent(c.id)}=${encodeValue(v)}`);
  }
  for (const desk of state.desks) {
    const seen = new Set<string>();
    for (const c of desk.controls) {
      // A hoisted control is the SAME control as the desk's — it is written
      // once, bare, or the two copies would have to be kept in step by whoever
      // reads the link.
      if (hoistedIds.has(c.id) || seen.has(c.id)) continue;
      seen.add(c.id);
      const v = desk.ctrl?.[c.id];
      if (v === undefined || isDefault(v, c.default)) continue;
      parts.push(`${encodeURIComponent(desk.anchor)}.${encodeURIComponent(c.id)}=${encodeValue(v)}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Read a query string into hoisted values and per-desk maps. Every value comes
 * back as a list (a single-valued control takes the first entry) because only
 * the caller knows which control is a multiselect. Nothing is validated beyond
 * shape: clamping an unoffered value stays where it already lives, in the
 * control's own repopulate.
 */
export function parse(search: string): ParsedShare {
  const out: ParsedShare = { hoisted: {}, desks: {} };
  const q = (search ?? '').replace(/^[?#]/, '');
  if (!q) return out;
  for (const pair of q.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq < 0 ? pair : pair.slice(0, eq);
    const rawVal = eq < 0 ? '' : pair.slice(eq + 1);
    if (!rawKey) continue;
    // Split the RAW key, then decode each half: an anchor is a slug, so the
    // first literal dot is the separator whatever the value turns out to be.
    const dot = rawKey.indexOf('.');
    const values = rawVal.split(',').map(dec);
    if (dot > 0) {
      const anchor = dec(rawKey.slice(0, dot));
      const id = dec(rawKey.slice(dot + 1));
      if (!id) continue;
      const desk = (out.desks[anchor] ??= {});
      // First wins, as URLSearchParams.get does: a link with a field twice
      // should behave predictably rather than by accident.
      desk[id] ??= values;
    } else {
      out.hoisted[dec(rawKey)] ??= values;
    }
  }
  return out;
}

/**
 * The value a control should take from a parsed param, or undefined where the
 * link says nothing about it. A multiselect takes the whole list; everything
 * else takes the first entry.
 */
export function adopt(control: ShareControl, values: string[] | undefined): string | string[] | undefined {
  if (!values || values.length === 0) return undefined;
  return control.type === 'multiselect' ? values : values[0];
}

/**
 * `states.map` → the panel on the states desk; `states` → the desk itself.
 * Split on the FIRST dot, because a desk anchor never contains one and a panel
 * id might.
 */
export function splitHash(hash: string): { anchor: string; panel: string | null } {
  const raw = (hash ?? '').replace(/^#/, '');
  if (!raw) return { anchor: '', panel: null };
  const dot = raw.indexOf('.');
  if (dot < 0) return { anchor: dec(raw), panel: null };
  return { anchor: dec(raw.slice(0, dot)), panel: dec(raw.slice(dot + 1)) || null };
}
