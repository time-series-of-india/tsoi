// Resolves a logical /data/... URL to its content-hashed filename when one exists.
//
// Runtime-fetched data files (dashboard datasets, beats, the flagship read) are
// content-hashed at deploy time by scripts/hash-data.mjs, which writes the
// logical→hashed map into data-manifest.json. Cache-Control marks /data/* as
// immutable (see public/_headers), so a stable name with changing content would
// serve stale numbers — the hash makes each version a new URL. Freshness rides
// in via the (revalidated) HTML referencing the new URL; an unchanged rebuild
// produces an identical hash, so nothing re-downloads.
//
// Falls back to the logical path when the manifest has no entry (e.g. local dev
// before hash-data.mjs has run), so development works without the hashing step.
import manifest from './data-manifest.json' with { type: 'json' };

const map = manifest as Record<string, string>;

export function dataUrl(logical: string): string {
  return map[logical] ?? logical;
}
