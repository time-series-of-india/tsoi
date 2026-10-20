import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateMetaSnapshot, refreshMetaFromLive, retainMetaHistory, META_LIVE_URL } from '../scripts/lib/meta-snapshot.mjs';

const now = Date.parse('2026-10-20T10:00:00Z');
function snapshot() {
  return {
    built_at: '2026-10-20T09:56:00Z',
    daily: [{ day: '2026-10-19', visits: 5 }],
    beacon_daily: [{ day: '2026-10-19', visits: 3 }],
    formats_daily: [{ day: '2026-10-19', format: 'play', all_views: 5, human_views: 3 }],
    hourly: [{ ts: '2026-10-20T09:00:00Z', page_views: 2 }],
    countries_daily: [], countries_human_daily: [], referrers_daily: [], dispatches: [],
    content_harvest_day: '2026-10-20',
    content: [{ slug: 'weather-wings', title: 'Weather Wings', format: 'play',
      url: '/play/weather-wings/', daily: [{ day: '2026-10-19', visits: 5, rum_visits: 3 }] }],
    today: { day: '2026-10-20', visits: 2 },
  };
}

test('fresh build stamps cannot hide old observation data in either mode', () => {
  for (const live of [true, false]) {
    const data = snapshot();
    data.daily[0].day = '2026-09-15';
    assert.throws(() => validateMetaSnapshot(data, { now, live }), /ends 2026-09-15/);
  }
  const data = snapshot();
  data.beacon_daily[0].day = '2026-09-15';
  assert.throws(() => validateMetaSnapshot(data, { now }), /beacon_daily ends/);
  const hourly = snapshot();
  hourly.hourly[0].ts = '2026-09-15T10:00:00Z';
  assert.throws(() => validateMetaSnapshot(hourly, { now }), /hourly observations are stale/);
});

test('live snapshot requires a recent source timestamp and full metadata', () => {
  const data = snapshot();
  data.built_at = '2026-10-20T08:59:00Z';
  assert.throws(() => validateMetaSnapshot(data, { now, live: true }), /one hour old/);
  assert.throws(() => validateMetaSnapshot({ ...snapshot(), content: [] }, { now }), /full history/);
  assert.throws(() => validateMetaSnapshot({ ...snapshot(), daily: [{ day: '2026-10-20' }] }, { now }), /sealed UTC/);
});

test('replacement refuses to truncate observation or individual piece history', () => {
  const previous = snapshot();
  previous.daily.unshift({ day: '2026-10-18', visits: 4 });
  assert.throws(() => validateMetaSnapshot(snapshot(), { now, previous }), /drop daily history/);
  const previousContent = snapshot();
  previousContent.content[0].daily.unshift({ day: '2026-10-18', visits: 4, rum_visits: 1 });
  assert.throws(() => validateMetaSnapshot(snapshot(), { now, previous: previousContent }), /drop content history/);
});

test('live import retains sparse archival rows while live observations and timestamp win', () => {
  const previous = snapshot();
  previous.hourly.unshift({ ts: '2026-09-15T03:00:00Z', page_views: 7 });
  previous.daily[0].visits = 3;
  previous.content[0].daily.unshift({ day: '2026-09-15', visits: 2, rum_visits: 1 });
  const live = snapshot();
  const result = retainMetaHistory(live, previous);
  assert.equal(result.built_at, live.built_at);
  assert.equal(result.hourly.length, 2);
  assert.equal(result.hourly[0].page_views, 7);
  assert.equal(result.daily[0].visits, 5);
  assert.equal(result.content[0].daily.length, 2);
  assert.equal(live.hourly.length, 1);
  validateMetaSnapshot(result, { now, previous, live: true });
});

test('live refresh preserves source values and keeps fallback untouched on failed validation or HTTP failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meta-snapshot-'));
  const path = join(directory, 'traffic.json');
  try {
    const before = JSON.stringify(snapshot()) + '\n';
    await writeFile(path, before);
    const fresh = snapshot();
    fresh.built_at = '2026-10-20T09:59:00Z';
    const source = JSON.stringify(fresh, null, 2) + '\n';
    const fetchImpl: typeof fetch = async (url) => {
      assert.equal(url, META_LIVE_URL);
      return new Response(source);
    };
    await refreshMetaFromLive(path, { now, fetchImpl });
    const saved = await readFile(path, 'utf8');
    assert.deepEqual(JSON.parse(saved), fresh);
    await assert.rejects(refreshMetaFromLive(path, { now,
      fetchImpl: async () => new Response('{}') }), /timestamp/);
    assert.equal(await readFile(path, 'utf8'), saved);
    await assert.rejects(refreshMetaFromLive(path, { now,
      fetchImpl: async () => new Response('', { status: 503 }) }), /HTTP 503/);
    assert.equal(await readFile(path, 'utf8'), saved);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
