/* The one rule in Inflation Peaks that decides what a run was worth, tested as
 * the shipped source rather than as a copy of it: the function is cut out of
 * InflationPeaks.astro and evaluated with a stub store around it, so editing
 * the page edits what runs here. Astro components cannot be imported into a
 * node:test process, and transcribing the rule into a fixture would test the
 * transcription.
 *
 * The rule matters more than its four lines suggest. The board's tiebreak is
 * total time, and a per-era best that only ever tracked months would make that
 * tiebreak uncompetable: a player told the clock was holding them back could
 * drive the same distance faster and watch the page throw the run away. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../../src/components/play/InflationPeaks.astro');

type Store = { best: Record<string, number>; time: Record<string, number> };
type Recorder = (months: number, secs: number) => boolean;

/** `recordRun`'s body, lifted out of the component and bound to a stub. */
function recorder(store: Store, eraId: string, modeId: string): Recorder {
  const src = readFileSync(SRC, 'utf8');
  const start = src.indexOf('function recordRun(');
  assert.ok(start >= 0, 'recordRun not found in InflationPeaks.astro');
  let depth = 0;
  let end = -1;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  assert.ok(end > start, 'recordRun braces did not close');
  // The component is TypeScript; the annotations are all this needs stripped.
  const body = src.slice(start, end).replace(/:\s*(number|boolean)\b/g, '');
  // eslint-disable-next-line no-new-func
  return new Function('store', 'era', 'mode', 'bestKey', 'saveStore', `${body}; return recordRun;`)(
    store,
    { id: eraId },
    { id: modeId },
    (e: string, m: string) => `${e}:${m}`,
    () => {},
  ) as Recorder;
}

test('a first run records both the distance and the clock', () => {
  const store: Store = { best: {}, time: {} };
  const run = recorder(store, 'E3', 'medium');
  assert.equal(run(74, 40), true);
  assert.deepEqual([store.best['E3:medium'], store.time['E3:medium']], [74, 40]);
});

test('further but slower still counts, and takes the slower time with it', () => {
  const store: Store = { best: { 'E3:medium': 74 }, time: { 'E3:medium': 40 } };
  const run = recorder(store, 'E3', 'medium');
  assert.equal(run(90, 55), true);
  // Not min(secs): the recorded time is the time OF the counting run.
  assert.deepEqual([store.best['E3:medium'], store.time['E3:medium']], [90, 55]);
});

test('the same distance in less time is an improvement', () => {
  const store: Store = { best: { 'E3:medium': 90 }, time: { 'E3:medium': 55 } };
  const run = recorder(store, 'E3', 'medium');
  assert.equal(run(90, 48), true);
  assert.deepEqual([store.best['E3:medium'], store.time['E3:medium']], [90, 48]);
});

test('the same distance in more time changes nothing', () => {
  const store: Store = { best: { 'E3:medium': 90 }, time: { 'E3:medium': 48 } };
  const run = recorder(store, 'E3', 'medium');
  assert.equal(run(90, 60), false);
  assert.deepEqual([store.best['E3:medium'], store.time['E3:medium']], [90, 48]);
});

test('a fast crash does not become anyone\'s time', () => {
  /* The property that makes the lockstep rule necessary. Under a universal
     clock the fastest run anybody will ever drive is a two-second crash at
     month three, and if time moved on its own it would be everyone's. */
  const store: Store = { best: { 'E3:medium': 90 }, time: { 'E3:medium': 48 } };
  const run = recorder(store, 'E3', 'medium');
  assert.equal(run(3, 2), false);
  assert.deepEqual([store.best['E3:medium'], store.time['E3:medium']], [90, 48]);
});

test('an equal run beats a distance with no time beside it', () => {
  // Migration: a record written back when only clears were clocked. An
  // unknown time is not a fast one.
  const store: Store = { best: { 'E1:hard': 100 }, time: {} };
  const run = recorder(store, 'E1', 'hard');
  assert.equal(run(100, 70), true);
  assert.equal(store.time['E1:hard'], 70);
  assert.equal(run(100, 80), false);
  assert.equal(store.time['E1:hard'], 70);
});

test('each era and mode keeps its own record', () => {
  const store: Store = { best: {}, time: {} };
  recorder(store, 'E1', 'medium')(50, 30);
  recorder(store, 'E1', 'hard')(20, 10);
  recorder(store, 'E6', 'medium')(77, 60);
  assert.deepEqual(store.best, { 'E1:medium': 50, 'E1:hard': 20, 'E6:medium': 77 });
  assert.deepEqual(store.time, { 'E1:medium': 30, 'E1:hard': 10, 'E6:medium': 60 });
});
