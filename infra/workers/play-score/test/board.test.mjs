/* The leaderboard's properties, from §7 of the leaderboard rebuild note
   (internal ops docs).

   The board is maintained incrementally against storage with no transactions,
   under a scheduler with no mutual exclusion. Nearly everything that can go
   wrong here goes wrong silently and looks fine from outside — which is how the
   version this replaced came to report half its players for weeks. So these
   assert arithmetic rather than absence of errors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boot, basket, indexOf, sum, pid, bin, bucket, rankIn, clockIn, topOf,
  ERAS, JOURNAL, INDEX, NIGHTLY, FIVE,
} from './harness.mjs';

test('an empty bucket gets a state file and no board', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  assert.equal(await w.board(), null,
    'a board of nobody would put an empty chart on the page; 404 keeps it hidden');
  const st = await w.state();
  assert.ok(st, 'the state file bootstraps itself through the rescore path');
  assert.match(st.config, /^w[0-9a-f]{8}$/, 'stamped with the weight table it was built on');
});

test('a filing appears only once the cron has folded it', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  const b = basket({ months: (id) => Math.round(ERAS[id] * 0.5) });
  assert.equal((await w.file(pid('one', 1), b)).status, 204);
  assert.equal(await w.board(), null);

  await w.cron();
  const board = await w.board();
  assert.equal(board.plays, 1);
  assert.equal(board.hist.length, 1401, 'one bin per tenth of an index');
  assert.equal(topOf(board.hist), indexOf(b), 'the top of the board is the highest full bin');
  assert.equal(board.hist[bin(indexOf(b))], 1);
  assert.equal(sum(board.hist), 1, 'the histogram totals the plays');
  assert.equal(await w.count(JOURNAL), 0, 'and the note is consumed behind the cursor');
});

test('a re-file moves a player, it does not add one', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  const first = basket({ months: (id) => Math.round(ERAS[id] * 0.4) });
  const better = basket({ months: (id) => Math.round(ERAS[id] * 0.9) });
  await w.file(pid('same', 1), first);
  await w.cron();
  await w.file(pid('same', 1), better);
  await w.cron();

  const b = await w.board();
  assert.equal(b.plays, 1);
  assert.equal(topOf(b.hist), indexOf(better));
  assert.equal(b.hist[bin(indexOf(first))], 0, 'the old bin empties');
  assert.equal(sum(b.hist), 1);
});

test('two filings from one pid in one window land in one bin and one row', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  await w.file(pid('twice', 1), basket({ months: 10 }));
  await w.file(pid('twice', 1), basket({ months: 20 }));
  await w.file(pid('other', 2), basket({ months: 30 }));
  await w.cron();

  const b = await w.board();
  assert.equal(b.plays, 2);
  assert.equal(sum(b.hist), 2, 'one bin each, not one per filing');
});

test('the served board is a curve, a count and a timestamp', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  await w.file(pid('shape', 1), basket({ months: 50 }));
  await w.cron();

  const b = await w.board();
  assert.deepEqual(Object.keys(b).sort(), ['hist', 'plays', 'times', 'updated_at']);
  // Nothing about a person survives a filing. The alias went with the top ten
  // and the pid never left the endpoint.
  const raw = await (await w.get('/api/peaks-board.json')).text();
  assert.doesNotMatch(raw, /"pid"|"alias"|"top"|"cursor"|"config"|"since"|"secs"/);
  // Nor does the stored basket carry a name any more.
  const stored = await (await w.R2.get(`${INDEX}${pid('shape', 1)}.json`)).json();
  assert.deepEqual(Object.keys(stored).sort(), ['bests', 't']);
  for (const path of ['/api/peaks-board-state.json', '/api/peaks-state.json', '/peaks/board-state.json']) {
    assert.equal((await w.get(path)).status, 404, path);
  }
});

test('rank is read off the histogram, exactly, and ties share a place', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* Nine players. Two of them land on the same tenth, which under the old
     board was settled by a comparator and is now simply a tie. */
  const at = (id) => 0;
  const baskets = [92, 80, 80, 71, 64, 55, 41, 33, 20].map((m) => basket({ months: () => m }));
  for (let i = 0; i < baskets.length; i++) await w.file(pid('rank', i), baskets[i]);
  await w.cron();
  const { hist, plays } = await w.board();
  assert.equal(plays, 9);

  const scores = baskets.map(indexOf);
  const sorted = [...scores].sort((a, b) => b - a);
  // The best filed index is the top of the curve, with no field carrying it.
  assert.equal(topOf(hist), sorted[0]);
  // Everyone's rank, against the same arithmetic done by hand.
  for (const s of new Set(scores)) {
    assert.equal(rankIn(hist, s), sorted.findIndex((x) => x === s) + 1, `index ${s}`);
  }
  // The two who tied share a bin, which is what makes the page say "joint".
  const tiedBin = bin(indexOf(baskets[1]));
  assert.equal(hist[tiedBin], 2);
  assert.equal(rankIn(hist, scores[1]), rankIn(hist, scores[2]), 'and share a rank');
});

test('a tenth apart is not a tie', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* The whole reason the file bins at a tenth. On the old scale of whole
     points these two were the same bar and would have shared a rank. */
  const a = basket({ months: (id) => Math.round(ERAS[id] * 0.5) });
  const b = basket({ months: (id) => Math.round(ERAS[id] * 0.5) });
  b.E6.months += 1;
  assert.notEqual(indexOf(a), indexOf(b));
  assert.equal(Math.floor(indexOf(a)), Math.floor(indexOf(b)), 'same whole point');
  await w.file(pid('tenth', 1), a);
  await w.file(pid('tenth', 2), b);
  await w.cron();
  const { hist } = await w.board();
  assert.equal(hist[bin(indexOf(a))], 1);
  assert.equal(hist[bin(indexOf(b))], 1);
  assert.equal(rankIn(hist, indexOf(b)), 1);
  assert.equal(rankIn(hist, indexOf(a)), 2, 'separated, where a whole-point bin would have tied them');
});

test('the incremental board equals the one a rescore builds', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* Folded in many small passes rather than one, because a fold that is only
     ever run over the whole set is not the fold that runs in production. */
  for (let i = 0; i < 400; i++) {
    await w.file(pid('seed', i), basket({
      months: (id) => Math.round(ERAS[id] * (0.1 + (i % 40) / 45)),
      mode: i % 3 === 0 ? 'hard' : 'medium',
      secs: 30 + (i % 50),
    }));
    if (i % 37 === 0) await w.cron();
  }
  await w.cron();

  const folded = await w.board();

  // Forced down the rescore path the way a moved weight table would force it.
  await w.poke((s) => ({ ...s, config: 'forced-mismatch' }));
  await w.cron();
  const rescored = await w.board();

  assert.equal(folded.plays, rescored.plays);
  assert.deepEqual(folded.hist, rescored.hist, 'bin for bin');
  assert.equal(sum(folded.hist), folded.plays);
  assert.equal(topOf(folded.hist), topOf(rescored.hist));
});

test('a note pending across a rescore is counted exactly once', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  for (let i = 0; i < 20; i++) await w.file(pid('base', i), basket({ months: 20 + i }));
  await w.cron();
  const before = (await w.board()).plays;

  await w.file(pid('pending', 1), basket({ months: 30 }));
  await w.poke((s) => ({ ...s, config: 'forced-mismatch' })); // rescore, note still in the journal
  await w.cron();
  assert.equal((await w.board()).plays, before + 1);
  await w.cron();                                            // then fold whatever survived K
  const after = await w.board();
  assert.equal(after.plays, before + 1, 'the rescore must not leave it to be applied twice');
  assert.equal(sum(after.hist), after.plays);
});

test('no histogram bin ever goes negative, and the rescore repairs one that drifted', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  for (let i = 0; i < 12; i++) await w.file(pid('clamp', i), basket({ months: 40 + i * 3 }));
  await w.cron();

  /* Two filings racing on one pid both carry the same `prev`, so the second
     decrement arrives at a bin the first already emptied. R2 has no
     transactions, so that cannot be prevented — only clamped and repaired. */
  const victim = pid('clamp', 3);
  const was = bin(indexOf(basket({ months: 43 })));
  await w.poke((s) => ({ ...s, hist: s.hist.map((n, i) => (i === was ? 0 : n)) }));
  await w.file(victim, basket({ months: 60 }));
  await w.cron();
  assert.ok((await w.board()).hist.every((n) => n >= 0));

  await w.poke((s) => ({ ...s, config: 'forced-mismatch' }));
  await w.cron();
  const healed = await w.board();
  assert.equal(sum(healed.hist), healed.plays, 'the nightly rescore is what makes it true again');
});

test('overlapping crons lose nothing and duplicate nothing', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* Cloudflare gives scheduled invocations no mutual exclusion. Which run wins
     is not the property and cannot be pinned down from here; that every note
     is applied exactly once is. A loser that deleted what it folded shows up
     as a count that is short. */
  let expected = 0;
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 6; i++) {
      await w.file(pid(`race${round}`, i), basket({ months: 40 + i }));
      expected++;
    }
    await Promise.all([w.cron(), w.cron(), w.cron(), w.cron()]);
    await w.cron();
  }
  const b = await w.board();
  assert.equal(b.plays, expected);
  assert.equal(sum(b.hist), expected);
  assert.equal(await w.count(JOURNAL), 0);
});

test('a quiet cron changes nothing', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  await w.file(pid('quiet', 1), basket({ months: 60 }));
  await w.cron();
  const first = (await w.board()).updated_at;
  await w.cron();
  // A board that restamped itself every five minutes would make every reader's
  // "updated N min ago" tick on a board that had not changed.
  assert.equal((await w.board()).updated_at, first);
});

test('the two triggers do different work', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron(FIVE);
  for (let i = 0; i < 10; i++) await w.file(pid('trig', i), basket({ months: 30 + i * 5 }));
  await w.cron(FIVE);
  const bin = 30;
  const trueCount = (await w.state()).hist[bin];

  await w.poke((s) => ({ ...s, hist: s.hist.map((n, i) => (i === bin ? n + 7 : n)) }));
  await w.cron(FIVE);
  assert.equal((await w.state()).hist[bin], trueCount + 7,
    'the five-minute tick folds notes; it has no way to see drift and does not look');

  await w.cron(NIGHTLY);
  assert.equal((await w.state()).hist[bin], trueCount, 'the nightly tick re-derives everything');
  assert.equal((await w.state()).rescore ?? null, null);
});

test('the time floor refuses the impossible and tolerates the absent', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  const hundred = (id) => Math.min(100, ERAS[id]);
  // The floor that bites is the longest era's: a hundred months at 50ms each.
  assert.equal((await w.file(pid('floor', 1), basket({ months: hundred, secs: 4.9 }))).status, 400);
  assert.equal((await w.file(pid('floor', 1), basket({ months: hundred, secs: 5 }))).status, 204);
  // Legal forever: a page cached before the clock went universal files times
  // for its cleared stretches only.
  assert.equal((await w.file(pid('floor', 2), basket({ months: hundred, skipSecs: ['E3'] }))).status, 204);
  // Built by hand: basket() clamps to the era, and the point here is not to.
  const overlong = basket({ months: 50 });
  overlong.E6.months = ERAS.E6 + 1;
  assert.equal((await w.file(pid('floor', 3), overlong)).status, 400,
    'months past the era are still refused');
});

test('every peaks response carries CORS, rejections included', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  /* A status is only readable cross-origin when the response says who may
     read it, and the page has to be able to tell a refused filing from a
     taken one. */
  const responses = [
    await w.get('/api/peaks-board.json'),
    await w.get('/api/peaks-health.json'),
    await w.get('/api/peaks-token'),
    await w.get('/api/peaks-stats/E1-medium.json'),
    await w.get('/api/nope'),
    await w.post('/api/peaks-index', { pid: 'nope', bests: basket({ months: 10 }) }),
    await w.post('/api/peaks-run', {}),
  ];
  for (const r of responses) {
    assert.equal(r.headers.get('access-control-allow-origin'), '*', `${r.url} ${r.status}`);
  }
});

test('health reports the caps and nothing else', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  assert.equal(await w.health(), null, '404 until there is a state file');
  await w.cron();
  for (let i = 0; i < 9; i++) await w.file(pid('health', i), basket({ months: 20 + i * 6 }));
  // What junk in the bucket looks like: an object the board cannot score.
  await w.R2.put(`${INDEX}health-junk-0001.json`, '{"bests":{"E1":{"months":5,"mode":"medium"}}}');
  await w.cron();

  let h = await w.health();
  assert.equal(h.folded, 9);
  assert.equal(h.journal, 0);
  assert.ok(h.budget > 0 && h.budget < 9000);

  await w.poke((s) => ({ ...s, config: 'forced-mismatch' }));
  await w.cron();
  h = await w.health();
  assert.equal(h.filings, 10, 'objects stored');
  assert.equal(h.scored, 9, 'of which scorable');
  assert.equal(h.plays, 9);
  assert.ok(h.rescored_at);

  const raw = await (await w.get('/api/peaks-health.json')).text();
  assert.doesNotMatch(raw, /"pid"|"cursor"|"hist"|"rescore"/);
});


test('the clock separates a tie at the top', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* Three players at the same score to the tenth, driving it in three
     different times. The index has nothing left to say about them; the clock
     is the whole of what is left. */
  const months = (id) => Math.round(ERAS[id] * 0.9);
  await w.file(pid('slow', 1), basket({ months, secs: 120 }));
  await w.file(pid('mid', 2), basket({ months, secs: 90 }));
  await w.file(pid('fast', 3), basket({ months, secs: 40 }));
  // And one below them, to prove the table is keyed by score.
  await w.file(pid('lower', 4), basket({ months: (id) => Math.round(ERAS[id] * 0.5), secs: 30 }));
  await w.cron();

  const b = await w.board();
  const index = indexOf(basket({ months }));
  const cell = b.times[String(bin(index))];
  assert.ok(cell, 'the tied score has a cell');
  assert.equal(Object.values(cell).reduce((a, n) => a + n, 0), 3);

  assert.deepEqual(clockIn(b.times, index, 240), { faster: 0, total: 3, place: 1 });
  assert.deepEqual(clockIn(b.times, index, 540), { faster: 1, total: 3, place: 2 });
  assert.deepEqual(clockIn(b.times, index, 720), { faster: 2, total: 3, place: 3 });
});

test('a faster run at the same score moves you inside the tie and nowhere else', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  const months = (id) => Math.round(ERAS[id] * 0.9);
  await w.file(pid('rival', 1), basket({ months, secs: 60 }));
  await w.file(pid('you', 2), basket({ months, secs: 100 }));
  await w.cron();

  const index = indexOf(basket({ months }));
  let b = await w.board();
  assert.equal(clockIn(b.times, index, 600).place, 2, 'second of two');
  const before = { plays: b.plays, hist: b.hist.join(',') };

  // The §4.2 case: the same distance, less time.
  await w.file(pid('you', 2), basket({ months, secs: 50 }));
  await w.cron();
  b = await w.board();
  assert.equal(clockIn(b.times, index, 300).place, 1, 'and now first');
  assert.equal(clockIn(b.times, index, 300).total, 2, 'still two of them');
  assert.equal(b.plays, before.plays, 'the score did not move, so neither did the count');
  assert.equal(b.hist.join(','), before.hist, 'nor the curve');
});

test('a basket with a gap in it is counted but not clocked', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  const months = (id) => Math.round(ERAS[id] * 0.9);
  await w.file(pid('timed', 1), basket({ months, secs: 60 }));
  await w.file(pid('untimed', 2), basket({ months, skipSecs: ['E3'] }));
  await w.cron();

  const b = await w.board();
  const index = indexOf(basket({ months }));
  assert.equal(b.plays, 2, 'both are on the board');
  assert.equal(b.hist[bin(index)], 2, 'and in the same bin');
  assert.equal(clockIn(b.times, index, 360).total, 1, 'but only one of them has a time');
});

test('the time table covers the top and stops', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  /* Enough players spread widely that the covered band cannot be everybody.
     TIME_COVER is 1000, so 1,200 filings puts the cutoff above the floor. */
  for (let i = 0; i < 1200; i++) {
    await w.file(pid('band', i), basket({
      months: (id) => Math.round(ERAS[id] * (0.05 + (i % 120) / 130)),
      secs: 40 + (i % 60),
    }));
    if (i % 200 === 0) await w.cron();
  }
  await w.cron();

  const b = await w.board();
  assert.equal(b.plays, 1200);
  const covered = Object.keys(b.times).map(Number).sort((x, y) => x - y);
  assert.ok(covered.length > 0, 'something is covered');
  const inTable = Object.values(b.times)
    .reduce((a, cell) => a + Object.values(cell).reduce((x, n) => x + n, 0), 0);
  assert.ok(inTable >= 1000, `the band holds at least the cover (${inTable})`);
  assert.ok(inTable < 1200, `and not everybody (${inTable})`);
  // The lowest scores are outside it, which is the whole point.
  assert.equal(b.times[String(bin(indexOf(basket({ months: (id) => Math.round(ERAS[id] * 0.05) }))))], undefined);
  // And nothing below the cutoff was left behind by a prune.
  assert.ok(covered.every((c) => c >= covered[0]));
  // The published table is small, which is the other whole point.
  const bytes = JSON.stringify(b.times).length;
  assert.ok(bytes < 40000, `time table is ${bytes} bytes`);
});

test('the folded time table equals the one a rescore builds', async (t) => {
  const w = await boot();
  t.after(w.dispose);
  await w.cron();
  for (let i = 0; i < 1400; i++) {
    await w.file(pid('cmp', i), basket({
      months: (id) => Math.round(ERAS[id] * (0.05 + (i % 130) / 140)),
      mode: i % 4 === 0 ? 'hard' : 'medium',
      secs: 35 + (i % 77),
      skipSecs: i % 40 === 3 ? ['E2'] : [],
    }));
    if (i % 173 === 0) await w.cron();
  }
  await w.cron();
  const folded = await w.board();

  await w.poke((s) => ({ ...s, config: 'forced-mismatch' }));
  await w.cron();
  const rescored = await w.board();

  assert.deepEqual(folded.hist, rescored.hist, 'bin for bin');
  /* The table is the property this test exists for. A fold that decremented
     the wrong cell, or forgot one, or kept a score the cutoff has since risen
     past, shows up here and nowhere else. */
  assert.deepEqual(folded.times, rescored.times, 'cell for cell');
  const cells = Object.values(folded.times).reduce((a, c) => a + Object.keys(c).length, 0);
  console.log(`      ${Object.keys(folded.times).length} scores, ${cells} cells, ${JSON.stringify(folded.times).length} bytes`);
});

test('the last prefix in the walk still folds on a quiet tick', async (t) => {
  /* The five-minute tick walks nineteen prefixes: the puzzle, then six eras
     by three modes, in order. The aggregation used to reserve a whole page of
     budget before listing each one, so eighteen quiet prefixes could spend
     the tick's allowance on nothing and leave the ones at the end of the walk
     — E6-medium and E6-hard — starved on every invocation. The first real E6
     run on prod sat unfolded for three ticks this way. One raw under the very
     last prefix, one tick, one histogram is the whole regression. */
  const w = await boot();
  t.after(w.dispose);
  await w.R2.put('peaks/raw/E6-hard/0000000000001-regress.json',
    JSON.stringify({ months: 5, t: 1 }));
  await w.cron();
  const r = await w.get('/api/peaks-stats/E6-hard.json');
  assert.equal(r.status, 200, 'E6-hard folded on the first tick after the run');
  const s = await r.json();
  assert.equal(s.plays, 1);
  assert.equal(s.hist[5], 1);
});
