/* Where a player is told they stand, cut out of InflationPeaks.astro and run
 * against hand-built histograms.
 *
 * The line has three branches and two thresholds, and both thresholds are
 * about what the number can honestly support rather than about taste. Near the
 * top a rank is the better fact and the crowd behind it is what makes it one.
 * Deep in the pack a rank stops being well defined: the index is rounded to a
 * tenth, players bunch, and with no clock left to separate them a precise
 * position inside a tie block would be an invention printed to the unit. Under
 * fifty filings a percentage is the invention instead.
 *
 * Extracted rather than reimplemented, so editing the page edits what runs
 * here. Astro components cannot be imported into a node:test process. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/components/play/InflationPeaks.astro');

/** Pulls a named function out of the component by brace matching. */
function extract(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found in InflationPeaks.astro`);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) {
      // Longest alternative first: "number" would otherwise match inside
      // "number[]" and leave the brackets behind as a syntax error.
      return src.slice(start, i + 1)
        .replace(/:\s*Record<string, number> \| null \| undefined/g, '')
        .replace(/:\s*'page' \| 'share'/g, '')
        .replace(/:\s*(number\[\]|number \| null|number|string)/g, '');
    }
  }
  throw new Error(`${name} braces did not close`);
}

const src = readFileSync(SRC, 'utf8');
const NAMED = Number(/const RANK_NAMED = (\d+)/.exec(src)![1]);
const FLOOR = Number(/const PCT_FLOOR = (\d+)/.exec(src)![1]);

const rankLine = new Function(`
  ${extract(src, 'ordinal')}
  ${extract(src, 'midpointPct')}
  ${extract(src, 'rankLine')}
  const grp = (n) => n.toLocaleString('en-IN');
  const RANK_NAMED = ${NAMED};
  const PCT_FLOOR = ${FLOOR};
  return rankLine;
`)() as (hist: number[], bin: number, plays: number) => string;

const clockLine = new Function(`
  ${extract(src, 'ordinal')}
  ${extract(src, 'clockLine')}
  const grp = (n) => n.toLocaleString('en-IN');
  return clockLine;
`)() as (cell: Record<string, number> | null, bucket: number | null) => string;

const BINS = 1401;
const bin = (index: number) => Math.round(index * 10);

/** A histogram with `n` players at each named index. */
function hist(at: Record<number, number>): { hist: number[]; plays: number } {
  const h = Array(BINS).fill(0);
  let plays = 0;
  for (const [index, n] of Object.entries(at)) { h[bin(Number(index))] = n; plays += n; }
  return { hist: h, plays };
}

/** A board of `n` players spread over the low end, plus whatever is named. */
function crowd(n: number, at: Record<number, number> = {}) {
  const h = Array(BINS).fill(0);
  let plays = 0;
  for (let i = 0; i < n; i++) { h[bin(10 + (i % 200) / 10)]++; plays++; }
  for (const [index, k] of Object.entries(at)) { h[bin(Number(index))] += k; plays += k; }
  return { hist: h, plays };
}

test('a small board names every position', () => {
  const b = hist({ 115.1: 1, 102.9: 1, 100.0: 1, 60.0: 1, 55.8: 1, 37.5: 1 });
  assert.equal(rankLine(b.hist, bin(115.1), b.plays), 'You are 1st of 6.');
  assert.equal(rankLine(b.hist, bin(100.0), b.plays), 'You are 3rd of 6.');
  assert.equal(rankLine(b.hist, bin(37.5), b.plays), 'You are 6th of 6.');
});

test('a tie is counted, not labelled', () => {
  const b = hist({ 140: 3, 92.4: 2, 41.0: 1 });
  assert.equal(rankLine(b.hist, bin(140), b.plays), 'You are 1st of 6, tied with 2 others.');
  // Three ahead, so the pair below them are 4th, not 2nd.
  assert.equal(rankLine(b.hist, bin(92.4), b.plays), 'You are 4th of 6, tied with 1 other.');
  assert.equal(rankLine(b.hist, bin(41.0), b.plays), 'You are 6th of 6.');
});

/* The reason the wording changed: "joint 1st of 5,206" put the tie word in
   front of the count, where it could be read as 5,206 people standing on
   first. Nothing in the new form can attach that way. */
test('the tie count never reads as the population', () => {
  const b = crowd(5200, { 140: 4 });
  assert.equal(rankLine(b.hist, bin(140), b.plays), 'You are 1st of 5,204, tied with 3 others.');
});

test('a tenth is enough to break a tie', () => {
  const b = hist({ 92.5: 1, 92.4: 1 });
  assert.equal(rankLine(b.hist, bin(92.5), b.plays), 'You are 1st of 2.');
  assert.equal(rankLine(b.hist, bin(92.4), b.plays), 'You are 2nd of 2.');
});

test('the top of a big board is still named, and the crowd is the point of it', () => {
  const b = crowd(5000, { 140: 1, 133.2: 1, 128.8: 1 });
  assert.equal(rankLine(b.hist, bin(140), b.plays), 'You are 1st of 5,003.');
  assert.equal(rankLine(b.hist, bin(128.8), b.plays), 'You are 3rd of 5,003.');
});

test('the switch happens one place past the threshold', () => {
  // Exactly at the threshold: still a position.
  const at = crowd(5000, { 140: NAMED - 1, 128.8: 1 });
  assert.match(rankLine(at.hist, bin(128.8), at.plays), new RegExp(`^You are ${NAMED}\\w\\w of `));
  // One past it: a share.
  const past = crowd(5000, { 140: NAMED, 128.8: 1 });
  assert.match(rankLine(past.hist, bin(128.8), past.plays), /^Higher than \d+% of filed indexes\.$/);
});

test('deep in a big board it is a share and never a position', () => {
  const b = crowd(5000, { 140: 1 });
  const line = rankLine(b.hist, bin(11.0), b.plays);
  assert.match(line, /^Higher than \d{1,2}% of filed indexes\.$/);
  assert.doesNotMatch(line, /\d(st|nd|rd|th) of/);
});

test('under fifty filings it stays a position, however far down', () => {
  // A percentage from forty-two samples is invention. The same floor the
  // run-over card already uses before it will quote one.
  const b = crowd(41, { 140: 1 });
  assert.equal(b.plays, 42);
  const line = rankLine(b.hist, bin(10.0), b.plays);
  assert.match(line, /^You are \d+(st|nd|rd|th) of 42\.$/);
});

test('the share is clamped off both ends', () => {
  /* A histogram that contains your own filing cannot honestly say 100%.
     Everyone below and a crowd just above, so the arithmetic wants 100 and the
     position is far enough down to be past the named places. */
  const b = crowd(5000, { 140: NAMED + 5 });
  assert.equal(rankLine(b.hist, bin(139.9), b.plays), 'Higher than 99% of filed indexes.');
  // And the other end: nobody below you at all.
  const bottom = crowd(5000, { 140: NAMED + 5, 1.0: 1 });
  assert.equal(rankLine(bottom.hist, bin(1.0), bottom.plays), 'Higher than 1% of filed indexes.');
});

/* The first filer saw "You are 1st of 1": a rank against a crowd of
   themselves. Being the whole board is a fact about the board, and the line
   now says it that way, in both voices. */
test('the only index on the board is not ranked against itself', () => {
  const b = hist({ 92.4: 1 });
  assert.equal(rankLine(b.hist, bin(92.4), b.plays), 'Yours is the first index on the board.');
  assert.equal(rankLine(b.hist, bin(92.4), b.plays, 'share'), 'The first index on the board.');
});

test('below one entry and not folded in yet, the crowd widens to hold you', () => {
  // The same clamp the clock line makes: "2nd of 1" is not a thing.
  const b = hist({ 92.4: 1 });
  assert.equal(rankLine(b.hist, bin(60.0), b.plays), 'You are 2nd of 2.');
});

test('an empty or impossible board says nothing at all', () => {
  assert.equal(rankLine(Array(BINS).fill(0), bin(50), 0), '');
  assert.equal(rankLine(Array(BINS).fill(0), -1, 10), '');
  assert.equal(rankLine(Array(BINS).fill(0), BINS + 5, 10), '');
});

/* The share voice: the same facts with the crowd named, because outside the
   panel "1st of 6" is a bare pair of numbers. The percentile branch already
   names what it counts and so has no second version. */
test('the share voice names the crowd, and only where a rank is said', () => {
  const b = hist({ 140: 3, 92.4: 2, 41.0: 1 });
  assert.equal(rankLine(b.hist, bin(140), b.plays, 'share'),
    '1st of 6 drivers, tied with 2 others.');
  assert.equal(rankLine(b.hist, bin(41.0), b.plays, 'share'), '6th of 6 drivers.');
  const deep = crowd(5000, { 140: 1 });
  assert.equal(rankLine(deep.hist, bin(11.0), deep.plays, 'share'),
    rankLine(deep.hist, bin(11.0), deep.plays));
});

test('counts are grouped the Indian way, like every other figure on the site', () => {
  const b = crowd(199999, { 140: 1 });
  assert.equal(rankLine(b.hist, bin(140), b.plays), 'You are 1st of 2,00,000.');
});


/* ── the clock, for the ties the score cannot settle ───────────────────── */

const bucket = (secs: number) => Math.floor(secs / 5);
/** A cell holding one player at each of the given total times. */
const cell = (...secs: number[]) => {
  const c: Record<string, number> = {};
  for (const s of secs) c[bucket(s)] = (c[bucket(s)] || 0) + 1;
  return c;
};

test('the fastest of a tie is told so', () => {
  assert.equal(clockLine(cell(240, 400, 540), bucket(240)),
    'Fastest of the 3 at that score.');
});

test('and everybody else is placed against them', () => {
  const c = cell(240, 400, 540);
  assert.equal(clockLine(c, bucket(400)), '2nd fastest of the 3 at that score.');
  assert.equal(clockLine(c, bucket(540)), '3rd fastest of the 3 at that score.');
});

test('five seconds apart over a whole basket is the same drive', () => {
  // Two in one bucket: a tie on the clock as well as on the score.
  const c = cell(300, 302, 500);
  assert.equal(clockLine(c, bucket(300)), 'Tied fastest of the 3 at that score.');
  assert.equal(clockLine(c, bucket(500)), '3rd fastest of the 3 at that score.');
});

test('a tie further down the clock is placed and called one', () => {
  const c = cell(200, 300, 302, 500);
  assert.equal(clockLine(c, bucket(300)), 'Tied 2nd fastest of the 4 at that score.');
});

test('alone at your score, there is nothing to say', () => {
  assert.equal(clockLine(cell(300), bucket(300)), '');
});

test('outside the covered band, or with no total, there is no cell', () => {
  // A score the worker does not keep a table for.
  assert.equal(clockLine(null, bucket(300)), '');
  assert.equal(clockLine(undefined as any, bucket(300)), '');
  // A basket with a gap in it has no total and so no bucket.
  assert.equal(clockLine(cell(240, 400), null), '');
});

test('the count in the sentence is the crowd at that score, grouped', () => {
  const c: Record<string, number> = { [bucket(240)]: 1, [bucket(600)]: 1999 };
  assert.equal(clockLine(c, bucket(240)), 'Fastest of the 2,000 at that score.');
});

/* Between filing and the next fold your own run is not in the cell. Slowest of
   the people who ARE in it makes you one past the end of it, and the sentence
   has to widen rather than print an ordinal its own crowd cannot hold. */
test('slowest, and not folded in yet, still names a crowd big enough to stand in', () => {
  assert.equal(clockLine(cell(200, 300, 400), bucket(900)),
    '4th fastest of the 4 at that score.');
});

test('mid-cell and not folded in yet, it simply reads one short', () => {
  // Three in the table, you between the second and the third: still "of the 3"
  // until the fold, the same direction every other pre-fold line errs in.
  assert.equal(clockLine(cell(200, 300, 900), bucket(400)),
    '3rd fastest of the 3 at that score.');
});
