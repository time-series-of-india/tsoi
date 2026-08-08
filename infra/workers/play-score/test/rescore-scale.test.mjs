/* The rescore past one invocation's subrequest budget.
 *
 * Workers count every R2 binding call — list, get, put, delete — against a
 * limit of 10,000 per invocation, and one cron tick is one invocation. The
 * local runtime does not enforce it, so this ceiling cannot be found by
 * running the worker on a laptop and watching: it has to be built against.
 * Above roughly 8,500 filings the scan cannot finish in one go, saves its
 * place and resumes. This is the only test that goes there, and the only slow
 * one — about fifteen seconds.
 *
 * The filings are written straight into the bucket rather than posted, because
 * what is under test is the scan. Twelve thousand round trips through the
 * endpoint would be testing the endpoint. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boot, indexOf, sum, bin, rankIn, topOf, ERAS, WEIGHTS, PEAKS, INDEX,
} from './harness.mjs';

const N = 12000;

test('a rescore too big for one invocation resumes and converges', { timeout: 120000 }, async (t) => {
  const w = await boot();
  t.after(w.dispose);

  // Deterministic, so a failure is reproducible rather than a mood.
  let seed = 20260802;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const expect = { plays: 0, hist: Array(1401).fill(0), scores: [] };
  for (let i = 0; i < N; i++) {
    const frac = 0.05 + rnd() * 0.95;
    const mode = rnd() < 0.2 ? 'hard' : rnd() < 0.5 ? 'easy' : 'medium';
    // One in fifty is a pre-clock record with a gap, so the "no total" branch
    // of the order is exercised at scale rather than only in isolation.
    const untimed = i % 50 === 7;
    const bests = {};
    let secs = 0;
    for (const id of Object.keys(ERAS)) {
      bests[id] = { months: Math.round(ERAS[id] * frac), mode };
      if (untimed && id === 'E3') continue;
      bests[id].secs = 30 + Math.round(rnd() * 300);
      secs += bests[id].secs;
    }
    await w.R2.put(`${INDEX}scale-${String(i).padStart(6, '0')}.json`,
      JSON.stringify({ bests, t: 1785000000000 + i }));

    const index = Math.round(1000 * Object.entries(bests)
      .reduce((a, [id, v]) => a + WEIGHTS[id] * (v.months / ERAS[id]) * PEAKS.modes[v.mode], 0)) / 10;
    expect.plays++;
    expect.hist[bin(index)]++;
    expect.scores.push(index);
  }
  expect.scores.sort((a, b) => b - a);

  let invocations = 0;
  let paused = 0;
  let boardWhilePaused;
  for (let i = 0; i < 12; i++) {
    await w.cron();
    invocations++;
    const st = await w.state();
    if (!st?.rescore) break;
    paused++;
    if (boardWhilePaused === undefined) boardWhilePaused = await w.board();
  }

  assert.ok(paused >= 1, `${N} filings should not fit in one invocation (took ${invocations})`);
  assert.equal(boardWhilePaused, null,
    'a part-built board must never be published; the old one keeps serving');

  const done = await w.board();
  const st = await w.state();
  assert.equal(done.plays, expect.plays);
  assert.deepEqual(done.hist, expect.hist, 'bin for bin');
  assert.equal(sum(done.hist), expect.plays);
  assert.equal(topOf(done.hist), expect.scores[0], 'the top of the curve is the best filed index');
  /* Rank, at a scale where an exact one is the whole reason the file bins at a
     tenth. Sampled across the curve rather than exhaustively: 12,000 linear
     scans of 1,401 bins is a minute of nothing. */
  for (const at of [0, 1, 7, 250, 3000, 8000, 11999]) {
    const s = expect.scores[at];
    assert.equal(rankIn(done.hist, s), expect.scores.findIndex((x) => x === s) + 1,
      `rank at position ${at} (index ${s})`);
  }
  assert.equal(st.rescore ?? null, null, 'and the marker is cleared');
  assert.equal(st.ops.filings, N);

  // Whatever lands after it folds normally, on the ordinary five-minute path.
  const perfect = Object.fromEntries(
    Object.keys(ERAS).map((id) => [id, { months: ERAS[id], mode: 'hard', secs: 90 }]),
  );
  await w.file('after-the-rescore-01', perfect);
  await w.cron();
  const after = await w.board();
  assert.equal(after.plays, expect.plays + 1);
  assert.equal(indexOf(perfect), 140, 'six clears on Hard is the ceiling');
  assert.equal(topOf(after.hist), 140, 'and it takes the top of the curve');
  assert.equal(rankIn(after.hist, 140), 1);
});
